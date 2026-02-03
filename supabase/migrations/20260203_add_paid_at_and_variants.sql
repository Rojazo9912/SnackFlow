-- Expand PIN length for hashed values
ALTER TABLE users ALTER COLUMN pin TYPE VARCHAR(255);

-- Migration: Add paid_at, variants, order payments, and related indexes

-- Orders: paid_at + cash session link
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cash_register_session_id UUID REFERENCES cash_sessions(id);

CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_cash_session ON orders(cash_register_session_id);

-- Products: variants flag
ALTER TABLE products
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- Product Attributes
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_attribute_per_tenant UNIQUE(tenant_id, name)
);

-- Attribute Values
CREATE TABLE IF NOT EXISTS attribute_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attribute_id UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  value VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_value_per_attribute UNIQUE(attribute_id, value)
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INT DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_sku_per_tenant UNIQUE(tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_product_attributes_tenant ON product_attributes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_display_order ON product_attributes(display_order);
CREATE INDEX IF NOT EXISTS idx_attribute_values_attribute ON attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_attribute_values_display_order ON attribute_values(display_order);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant ON product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(active);
CREATE INDEX IF NOT EXISTS idx_product_variants_attributes ON product_variants USING GIN (attributes);

-- Order Items: variant reference
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);

-- Order Payments
CREATE TABLE IF NOT EXISTS order_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_tenant_id ON order_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_created_at ON order_payments(created_at);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_product_attributes_updated_at ON product_attributes;
CREATE TRIGGER update_product_attributes_updated_at
    BEFORE UPDATE ON product_attributes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_attribute_values_updated_at ON attribute_values;
CREATE TRIGGER update_attribute_values_updated_at
    BEFORE UPDATE ON attribute_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_order_payments_updated_at ON order_payments;
CREATE TRIGGER update_order_payments_updated_at
    BEFORE UPDATE ON order_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view attributes from their tenant" ON product_attributes;
DROP POLICY IF EXISTS "Users can insert attributes for their tenant" ON product_attributes;
DROP POLICY IF EXISTS "Users can update attributes from their tenant" ON product_attributes;
DROP POLICY IF EXISTS "Users can delete attributes from their tenant" ON product_attributes;

CREATE POLICY "Users can view attributes from their tenant"
  ON product_attributes FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can insert attributes for their tenant"
  ON product_attributes FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can update attributes from their tenant"
  ON product_attributes FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can delete attributes from their tenant"
  ON product_attributes FOR DELETE
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "Users can view attribute values from their tenant" ON attribute_values;
DROP POLICY IF EXISTS "Users can insert attribute values for their tenant" ON attribute_values;
DROP POLICY IF EXISTS "Users can update attribute values from their tenant" ON attribute_values;
DROP POLICY IF EXISTS "Users can delete attribute values from their tenant" ON attribute_values;

CREATE POLICY "Users can view attribute values from their tenant"
  ON attribute_values FOR SELECT
  USING (
    attribute_id IN (
      SELECT id FROM product_attributes
      WHERE tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "Users can insert attribute values for their tenant"
  ON attribute_values FOR INSERT
  WITH CHECK (
    attribute_id IN (
      SELECT id FROM product_attributes
      WHERE tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "Users can update attribute values from their tenant"
  ON attribute_values FOR UPDATE
  USING (
    attribute_id IN (
      SELECT id FROM product_attributes
      WHERE tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "Users can delete attribute values from their tenant"
  ON attribute_values FOR DELETE
  USING (
    attribute_id IN (
      SELECT id FROM product_attributes
      WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "Users can view variants from their tenant" ON product_variants;
DROP POLICY IF EXISTS "Users can insert variants for their tenant" ON product_variants;
DROP POLICY IF EXISTS "Users can update variants from their tenant" ON product_variants;
DROP POLICY IF EXISTS "Users can delete variants from their tenant" ON product_variants;

CREATE POLICY "Users can view variants from their tenant"
  ON product_variants FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can insert variants for their tenant"
  ON product_variants FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can update variants from their tenant"
  ON product_variants FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can delete variants from their tenant"
  ON product_variants FOR DELETE
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "Users can view order payments from their tenant" ON order_payments;
DROP POLICY IF EXISTS "Users can insert order payments for their tenant" ON order_payments;

CREATE POLICY "Users can view order payments from their tenant"
  ON order_payments FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can insert order payments for their tenant"
  ON order_payments FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Update decrease_stock to enforce stock checks
CREATE OR REPLACE FUNCTION decrease_stock(
    p_product_id UUID,
    p_quantity INTEGER,
    p_tenant_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
    v_previous_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- Get current stock
    SELECT stock INTO v_previous_stock
    FROM products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;

    -- Validate stock
    IF v_previous_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product % (requested %, available %)', p_product_id, p_quantity, v_previous_stock;
    END IF;

    -- Calculate new stock
    v_new_stock := v_previous_stock - p_quantity;

    -- Update product stock
    UPDATE products
    SET stock = v_new_stock, updated_at = NOW()
    WHERE id = p_product_id AND tenant_id = p_tenant_id;

    -- Record movement
    INSERT INTO inventory_movements (
        tenant_id, product_id, user_id, type, quantity,
        previous_stock, new_stock, reason
    ) VALUES (
        p_tenant_id, p_product_id, p_user_id, 'sale', p_quantity,
        v_previous_stock, v_new_stock, p_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


