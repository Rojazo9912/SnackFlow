-- =============================================
-- MIGRATION: Add Composite Products (Recipes)
-- =============================================

-- 1. Add is_composite column to products (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'is_composite'
    ) THEN
        ALTER TABLE products ADD COLUMN is_composite BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create product_ingredients table (if not exists)
CREATE TABLE IF NOT EXISTS product_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 4) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_not_self_ingredient CHECK (product_id != ingredient_id),
    CONSTRAINT unique_product_ingredient UNIQUE (product_id, ingredient_id)
);

-- 3. Create indexes (if not exist)
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_tenant ON product_ingredients(tenant_id);

-- 4. Enable RLS
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (drop if exist first to avoid errors)
DROP POLICY IF EXISTS "Users can view product ingredients in their tenant" ON product_ingredients;
DROP POLICY IF EXISTS "Admins can manage product ingredients in their tenant" ON product_ingredients;

CREATE POLICY "Users can view product ingredients in their tenant"
    ON product_ingredients FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Admins can manage product ingredients in their tenant"
    ON product_ingredients FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- 6. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_product_ingredients_updated_at ON product_ingredients;
CREATE TRIGGER update_product_ingredients_updated_at
    BEFORE UPDATE ON product_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Function to calculate available stock for composite products
CREATE OR REPLACE FUNCTION calculate_composite_stock(
    p_product_id UUID,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_min_available INTEGER := NULL;
    v_ingredient_record RECORD;
    v_available_units INTEGER;
    v_ingredient_stock INTEGER;
BEGIN
    -- Check if product is composite
    IF NOT EXISTS (
        SELECT 1 FROM products
        WHERE id = p_product_id
        AND tenant_id = p_tenant_id
        AND is_composite = true
    ) THEN
        -- If not composite, return direct stock
        RETURN (SELECT stock FROM products WHERE id = p_product_id AND tenant_id = p_tenant_id);
    END IF;

    -- Iterate over each ingredient
    FOR v_ingredient_record IN
        SELECT
            pi.ingredient_id,
            pi.quantity as required_quantity,
            p.stock as available_stock,
            p.is_composite as ingredient_is_composite
        FROM product_ingredients pi
        JOIN products p ON p.id = pi.ingredient_id
        WHERE pi.product_id = p_product_id
        AND pi.tenant_id = p_tenant_id
    LOOP
        -- If ingredient is also composite, calculate recursively
        IF v_ingredient_record.ingredient_is_composite THEN
            v_ingredient_stock := calculate_composite_stock(
                v_ingredient_record.ingredient_id,
                p_tenant_id
            );
        ELSE
            v_ingredient_stock := v_ingredient_record.available_stock;
        END IF;

        -- Calculate how many units can be made with this ingredient
        IF v_ingredient_record.required_quantity > 0 THEN
            v_available_units := FLOOR(v_ingredient_stock / v_ingredient_record.required_quantity);
        ELSE
            v_available_units := 0;
        END IF;

        -- The minimum determines how many products can be made
        IF v_min_available IS NULL OR v_available_units < v_min_available THEN
            v_min_available := v_available_units;
        END IF;
    END LOOP;

    RETURN COALESCE(v_min_available, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to decrease stock for composite products (descends into ingredients)
CREATE OR REPLACE FUNCTION decrease_composite_stock(
    p_product_id UUID,
    p_quantity INTEGER,
    p_tenant_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
    v_ingredient_record RECORD;
    v_is_composite BOOLEAN;
    v_quantity_to_decrease INTEGER;
    v_product_name TEXT;
BEGIN
    -- Check if product is composite
    SELECT is_composite, name INTO v_is_composite, v_product_name
    FROM products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;

    IF v_is_composite IS TRUE THEN
        -- Decrease stock of each ingredient
        FOR v_ingredient_record IN
            SELECT
                pi.ingredient_id,
                pi.quantity as required_quantity,
                p.is_composite as ingredient_is_composite
            FROM product_ingredients pi
            JOIN products p ON p.id = pi.ingredient_id
            WHERE pi.product_id = p_product_id
            AND pi.tenant_id = p_tenant_id
        LOOP
            v_quantity_to_decrease := CEIL(v_ingredient_record.required_quantity * p_quantity);

            -- Recursion: if ingredient is also composite
            IF v_ingredient_record.ingredient_is_composite THEN
                PERFORM decrease_composite_stock(
                    v_ingredient_record.ingredient_id,
                    v_quantity_to_decrease,
                    p_tenant_id,
                    p_user_id,
                    p_reason || ' (Ing. de ' || v_product_name || ')'
                );
            ELSE
                -- Decrease stock of simple ingredient
                PERFORM decrease_stock(
                    v_ingredient_record.ingredient_id,
                    v_quantity_to_decrease,
                    p_tenant_id,
                    p_user_id,
                    p_reason || ' (Ing. de ' || v_product_name || ')'
                );
            END IF;
        END LOOP;
    ELSE
        -- Simple product: use existing function
        PERFORM decrease_stock(p_product_id, p_quantity, p_tenant_id, p_user_id, p_reason);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done!
-- Now you can create composite products and their ingredients will be automatically
-- deducted from inventory when the composite product is sold.
