-- ================================================================
-- SnackFlow v3.0 — Operations, Fiscal & Security
-- 18 Jun 2026
-- ================================================================

-- ── 1. Historial de costos de productos ──────────────────────────
-- Permite auditar cuándo y por qué cambió el costo de un producto
CREATE TABLE IF NOT EXISTS products_cost_history (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id),
    old_cost      DECIMAL(10, 2) NOT NULL,
    new_cost      DECIMAL(10, 2) NOT NULL,
    reason        TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products_cost_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_cost_history"
    ON products_cost_history FOR ALL
    USING (tenant_id = get_current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_cost_history_product
    ON products_cost_history(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_history_tenant
    ON products_cost_history(tenant_id, created_at DESC);

-- ── 2. Desglose fiscal por ítem de orden ─────────────────────────
-- Permite generar tickets con desglose de IVA/IEPS por línea (CFDI)
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS item_iva   DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS item_ieps  DECIMAL(10, 2) DEFAULT 0;

-- ── 3. Valuación de merma en movimientos de inventario ───────────
-- Permite calcular el impacto financiero real de cada merma
ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS unit_cost_at_time DECIMAL(10, 2) DEFAULT 0;

-- Columna calculada: impacto financiero total del movimiento
ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS total_cost_impact DECIMAL(10, 2)
        GENERATED ALWAYS AS (quantity * unit_cost_at_time) STORED;

-- ── 4. Arqueo ciego de caja ───────────────────────────────────────
-- Permite registrar el conteo físico sin mostrar el monto esperado
ALTER TABLE cash_sessions
    ADD COLUMN IF NOT EXISTS blind_count        DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS blind_difference   DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS close_notes        TEXT,
    ADD COLUMN IF NOT EXISTS supervisor_id      UUID REFERENCES users(id);

-- Detalle de denominaciones contadas físicamente por el cajero
CREATE TABLE IF NOT EXISTS cash_blind_count_detail (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    denomination    DECIMAL(10, 2) NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 0,
    subtotal        DECIMAL(10, 2) GENERATED ALWAYS AS (denomination * quantity) STORED,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blind_count_session
    ON cash_blind_count_detail(session_id);

-- ── 5. Tabla de autorizaciones de supervisor ──────────────────────
-- Log inmutable de todas las acciones que requirieron PIN supervisor
CREATE TABLE IF NOT EXISTS supervisor_authorizations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supervisor_id       UUID NOT NULL REFERENCES users(id),
    requesting_user_id  UUID NOT NULL REFERENCES users(id),
    action_type         VARCHAR(60) NOT NULL,
    reference_id        UUID,
    reference_table     VARCHAR(60),
    metadata            JSONB DEFAULT '{}',
    authorized_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supervisor_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_supervisor_auth"
    ON supervisor_authorizations FOR ALL
    USING (tenant_id = get_current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_supervisor_auth_tenant
    ON supervisor_authorizations(tenant_id, authorized_at DESC);
CREATE INDEX IF NOT EXISTS idx_supervisor_auth_action
    ON supervisor_authorizations(action_type, reference_id);

-- ── 6. employee_shifts: índice de turnos activos ──────────────────
-- Optimiza la consulta más frecuente: ¿tiene turno activo este usuario?
CREATE INDEX IF NOT EXISTS idx_shifts_active
    ON employee_shifts(tenant_id, user_id)
    WHERE clock_out IS NULL;

-- ── 7. Vista: turnos activos con información del usuario ──────────
CREATE OR REPLACE VIEW active_shifts AS
SELECT
    es.id,
    es.tenant_id,
    es.user_id,
    es.clock_in,
    es.notes,
    u.name   AS user_name,
    u.role   AS user_role,
    ROUND(EXTRACT(EPOCH FROM (NOW() - es.clock_in)) / 3600.0, 2) AS hours_active
FROM employee_shifts es
JOIN users u ON u.id = es.user_id
WHERE es.clock_out IS NULL;

-- ── 8. Vista: resumen financiero de merma por mes ────────────────
CREATE OR REPLACE VIEW waste_financial_summary AS
SELECT
    im.tenant_id,
    DATE_TRUNC('month', im.created_at)   AS month,
    p.id                                  AS product_id,
    p.name                                AS product_name,
    SUM(im.quantity)                      AS total_units_wasted,
    SUM(im.total_cost_impact)             AS total_cost_wasted
FROM inventory_movements im
JOIN products p ON p.id = im.product_id
WHERE im.type = 'waste'
GROUP BY
    im.tenant_id,
    DATE_TRUNC('month', im.created_at),
    p.id,
    p.name;
