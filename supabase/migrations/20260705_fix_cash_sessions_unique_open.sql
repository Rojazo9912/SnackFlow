-- ================================================================
-- Migration: Fix cash_sessions — prevenir múltiples sesiones abiertas
-- 05 Jul 2026
-- ================================================================
-- Bug: getCurrentSession usaba .single() que con múltiples rows
-- devuelve el mismo error PGRST116 que "sin resultados", haciendo
-- que openSession creyera que no había caja abierta y creara otra.
-- Esto generó 23 sesiones atascadas al 2026-07-02.
--
-- Fix en código: cash-register.service.ts usa .maybeSingle() + .limit(1)
-- Fix en BD: índice único parcial que impide físicamente el duplicado.
-- ================================================================

-- 1. Cerrar cualquier sesión atascada (idempotente si ya se corrió manualmente)
UPDATE cash_sessions
SET
  status         = 'closed',
  closed_at      = COALESCE(closed_at, opened_at + interval '1 minute'),
  closing_amount = COALESCE(closing_amount, opening_amount),
  expected_amount = COALESCE(expected_amount, opening_amount),
  difference     = COALESCE(difference, 0),
  close_notes    = COALESCE(close_notes, 'Cierre automático: migración fix sesiones atascadas 2026-07-05')
WHERE status = 'open';

-- 2. Índice único parcial: solo puede existir UNA sesión 'open' por tenant
--    La BD rechazará cualquier INSERT adicional a nivel de constraint,
--    sin importar condiciones de carrera o bugs de aplicación.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_one_open_per_tenant
  ON cash_sessions (tenant_id)
  WHERE status = 'open';
