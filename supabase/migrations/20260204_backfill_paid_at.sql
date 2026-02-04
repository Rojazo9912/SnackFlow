-- Backfill paid_at for orders that were paid before the column was added
-- Use updated_at as the best approximation of when the order was paid
-- (updated_at reflects when the order status changed to 'paid')

UPDATE orders
SET paid_at = updated_at
WHERE status = 'paid'
  AND paid_at IS NULL
  AND updated_at IS NOT NULL;
