-- =============================================
-- Migration: Financial Costing, Taxes and Shifts
-- =============================================

-- 1. Modificar order_items para guardar costo histórico
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- 2. Modificar products para agregar tasas de impuestos
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_iva DECIMAL(5, 2) DEFAULT 16.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_ieps DECIMAL(5, 2) DEFAULT 0.00;

-- 3. Modificar orders para desglose de impuestos y marcas de tiempo operativas
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_iva DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_ieps DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_started_at TIMESTAMPTZ;

-- 4. Crear la tabla de turnos de empleados (employee_shifts)
CREATE TABLE IF NOT EXISTS employee_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ DEFAULT NOW(),
    clock_out TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para employee_shifts
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS para employee_shifts
CREATE POLICY "Users can view shifts in their tenant"
    ON employee_shifts FOR SELECT
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Admins can manage shifts in their tenant"
    ON employee_shifts FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_employee_shifts_tenant ON employee_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_user ON employee_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_clock_in ON employee_shifts(clock_in);
