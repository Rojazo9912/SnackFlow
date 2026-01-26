-- Add cash_register_session_id column to orders table
ALTER TABLE "public"."orders" 
ADD COLUMN IF NOT EXISTS "cash_register_session_id" uuid REFERENCES "public"."cash_sessions"("id");

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_orders_cash_session" ON "public"."orders" ("cash_register_session_id");
