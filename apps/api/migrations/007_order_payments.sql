-- Migration: Add order_payments table for mixed payments
-- This allows tracking multiple payment methods per order

CREATE TABLE IF NOT EXISTS order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX idx_order_payments_tenant_id ON order_payments(tenant_id);
CREATE INDEX idx_order_payments_created_at ON order_payments(created_at);

-- RLS Policies
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order payments from their tenant"
  ON order_payments FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert order payments for their tenant"
  ON order_payments FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Comments
COMMENT ON TABLE order_payments IS 'Stores individual payment methods used for each order (supports mixed payments)';
COMMENT ON COLUMN order_payments.payment_method IS 'Payment method: cash, card, or transfer';
COMMENT ON COLUMN order_payments.amount IS 'Amount paid with this method';
