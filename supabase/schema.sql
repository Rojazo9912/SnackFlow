-- =============================================
-- SnackFlow - Database Schema for Supabase
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Tenants (businesses using SnackFlow)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'supervisor', 'cashier', 'seller')),
    pin VARCHAR(10),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    cost DECIMAL(10, 2) CHECK (cost >= 0),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER CHECK (min_stock >= 0),
    unit VARCHAR(50) DEFAULT 'pieza',
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    cashier_id UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('draft', 'pending', 'in_cashier', 'paid', 'cancelled')),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'transfer', 'mixed')),
    payment_details JSONB,
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Movements
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL
        CHECK (type IN ('sale', 'adjustment_in', 'adjustment_out', 'waste', 'return')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Sessions
CREATE TABLE cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    opening_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    closing_amount DECIMAL(10, 2),
    expected_amount DECIMAL(10, 2),
    difference DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Cash Movements
CREATE TABLE cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_code ON products(tenant_id, code);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_tenant ON inventory_movements(tenant_id);
CREATE INDEX idx_cash_sessions_tenant ON cash_sessions(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id
        FROM users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrease stock (used when order is paid)
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

    -- Calculate new stock
    v_new_stock := GREATEST(v_previous_stock - p_quantity, 0);

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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenants policies
CREATE POLICY "Users can view their own tenant"
    ON tenants FOR SELECT
    USING (id = get_current_tenant_id());

CREATE POLICY "Admins can update their tenant"
    ON tenants FOR UPDATE
    USING (id = get_current_tenant_id());

-- Users policies
CREATE POLICY "Users can view users in their tenant"
    ON users FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Admins can manage users in their tenant"
    ON users FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Categories policies
CREATE POLICY "Users can view categories in their tenant"
    ON categories FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Admins can manage categories in their tenant"
    ON categories FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Products policies
CREATE POLICY "Users can view products in their tenant"
    ON products FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Admins can manage products in their tenant"
    ON products FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Orders policies
CREATE POLICY "Users can view orders in their tenant"
    ON orders FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can create orders in their tenant"
    ON orders FOR INSERT
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can update orders in their tenant"
    ON orders FOR UPDATE
    USING (tenant_id = get_current_tenant_id());

-- Order items policies
CREATE POLICY "Users can view order items for their tenant's orders"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.tenant_id = get_current_tenant_id()
        )
    );

CREATE POLICY "Users can manage order items for their tenant's orders"
    ON order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.tenant_id = get_current_tenant_id()
        )
    );

-- Inventory movements policies
CREATE POLICY "Users can view inventory movements in their tenant"
    ON inventory_movements FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Authorized users can create inventory movements"
    ON inventory_movements FOR INSERT
    WITH CHECK (tenant_id = get_current_tenant_id());

-- Cash sessions policies
CREATE POLICY "Users can view cash sessions in their tenant"
    ON cash_sessions FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Cashiers can manage cash sessions in their tenant"
    ON cash_sessions FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Cash movements policies
CREATE POLICY "Users can view cash movements for their tenant's sessions"
    ON cash_movements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cash_sessions
            WHERE cash_sessions.id = cash_movements.session_id
            AND cash_sessions.tenant_id = get_current_tenant_id()
        )
    );

CREATE POLICY "Cashiers can manage cash movements"
    ON cash_movements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM cash_sessions
            WHERE cash_sessions.id = cash_movements.session_id
            AND cash_sessions.tenant_id = get_current_tenant_id()
        )
    );

-- Audit logs policies
CREATE POLICY "Users can view audit logs in their tenant"
    ON audit_logs FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "System can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (tenant_id = get_current_tenant_id());

-- =============================================
-- REALTIME
-- =============================================

-- Enable realtime for orders (for cashier updates)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- =============================================
-- SEED DATA (Optional - for testing)
-- =============================================

-- To create a test tenant and admin user, run this after creating a user in Supabase Auth:
/*
-- 1. First create a tenant
INSERT INTO tenants (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Mi Dulceria', 'mi-dulceria', 'pro');

-- 2. Then link your Supabase Auth user to this tenant
-- Replace 'YOUR_AUTH_USER_ID' with the actual user ID from Supabase Auth
INSERT INTO users (id, tenant_id, email, name, role)
VALUES (
    'YOUR_AUTH_USER_ID',
    '00000000-0000-0000-0000-000000000001',
    'admin@example.com',
    'Admin User',
    'admin'
);

-- 3. Create some test categories
INSERT INTO categories (tenant_id, name, position) VALUES
('00000000-0000-0000-0000-000000000001', 'Dulces', 1),
('00000000-0000-0000-0000-000000000001', 'Botanas', 2),
('00000000-0000-0000-0000-000000000001', 'Bebidas', 3);

-- 4. Create some test products
INSERT INTO products (tenant_id, category_id, name, code, price, stock, min_stock, is_favorite) VALUES
('00000000-0000-0000-0000-000000000001',
 (SELECT id FROM categories WHERE name = 'Dulces' LIMIT 1),
 'Chocolate Carlos V', 'CHO-001', 15.00, 50, 10, true),
('00000000-0000-0000-0000-000000000001',
 (SELECT id FROM categories WHERE name = 'Botanas' LIMIT 1),
 'Papas Sabritas', 'PAP-001', 18.00, 30, 5, true),
('00000000-0000-0000-0000-000000000001',
 (SELECT id FROM categories WHERE name = 'Bebidas' LIMIT 1),
 'Coca Cola 600ml', 'COC-001', 22.00, 24, 6, false);
*/
