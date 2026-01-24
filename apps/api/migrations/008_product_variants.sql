-- Migration: Product Variants System
-- This migration adds support for product variants (sizes, flavors, colors, etc.)

-- ============================================
-- 1. Product Attributes Table
-- ============================================
-- Stores attribute types (e.g., "Size", "Flavor", "Color")
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_attribute_per_tenant UNIQUE(tenant_id, name)
);

-- ============================================
-- 2. Attribute Values Table
-- ============================================
-- Stores possible values for each attribute (e.g., "Small", "Medium", "Large")
CREATE TABLE IF NOT EXISTS attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  value VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_value_per_attribute UNIQUE(attribute_id, value)
);

-- ============================================
-- 3. Product Variants Table
-- ============================================
-- Stores individual product variants with their own price and stock
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INT DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_sku_per_tenant UNIQUE(tenant_id, sku)
);

-- ============================================
-- 4. Modify Products Table
-- ============================================
-- Add flag to indicate if product uses variants
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- ============================================
-- 5. Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_product_attributes_tenant ON product_attributes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_display_order ON product_attributes(display_order);

CREATE INDEX IF NOT EXISTS idx_attribute_values_attribute ON attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_attribute_values_display_order ON attribute_values(display_order);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant ON product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(active);
CREATE INDEX IF NOT EXISTS idx_product_variants_attributes ON product_variants USING GIN (attributes);

-- ============================================
-- 6. Row Level Security (RLS)
-- ============================================

-- Product Attributes
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attributes from their tenant"
  ON product_attributes FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert attributes for their tenant"
  ON product_attributes FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update attributes from their tenant"
  ON product_attributes FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete attributes from their tenant"
  ON product_attributes FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Attribute Values
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attribute values from their tenant"
  ON attribute_values FOR SELECT
  USING (
    attribute_id IN (
      SELECT id FROM product_attributes 
      WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert attribute values for their tenant"
  ON attribute_values FOR INSERT
  WITH CHECK (
    attribute_id IN (
      SELECT id FROM product_attributes 
      WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update attribute values from their tenant"
  ON attribute_values FOR UPDATE
  USING (
    attribute_id IN (
      SELECT id FROM product_attributes 
      WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete attribute values from their tenant"
  ON attribute_values FOR DELETE
  USING (
    attribute_id IN (
      SELECT id FROM product_attributes 
      WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- Product Variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variants from their tenant"
  ON product_variants FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert variants for their tenant"
  ON product_variants FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update variants from their tenant"
  ON product_variants FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete variants from their tenant"
  ON product_variants FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 7. Comments for Documentation
-- ============================================
COMMENT ON TABLE product_attributes IS 'Stores attribute types like Size, Flavor, Color';
COMMENT ON TABLE attribute_values IS 'Stores possible values for each attribute';
COMMENT ON TABLE product_variants IS 'Stores product variants with individual prices and stock';

COMMENT ON COLUMN product_variants.attributes IS 'JSON object storing the variant attributes, e.g., {"size": "Large", "flavor": "Chocolate"}';
COMMENT ON COLUMN products.has_variants IS 'If true, product uses variants system; price and stock are managed at variant level';
