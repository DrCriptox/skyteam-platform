-- ============================================
-- WHATSAPP FOLLOW-UP v2 - Migration para DB existente
-- Ejecutar en: https://supabase.com/dashboard/project/dheosuwekrhdfayikuil/sql/new
-- Seguro de correr varias veces (idempotente).
-- ============================================

-- 1) Agregar columnas nuevas a wa_leads
ALTER TABLE wa_leads ADD COLUMN IF NOT EXISTS last_followup_sent_at TIMESTAMPTZ;
ALTER TABLE wa_leads ADD COLUMN IF NOT EXISTS followup_variant TEXT;

-- 2) Reemplazar el index viejo (que filtraba followup_stage < 3 -> perdia leads post-frio)
DROP INDEX IF EXISTS idx_wa_leads_followup;
CREATE INDEX IF NOT EXISTS idx_wa_leads_followup ON wa_leads(followup_stage, last_message_at, last_followup_sent_at)
  WHERE followup_paused = FALSE AND followup_stage < 8;

-- 3) Verificar el resultado
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'wa_leads'
  AND column_name IN ('followup_stage', 'last_followup_sent_at', 'followup_variant', 'followup_paused', 'etapa')
ORDER BY column_name;

-- 4) (Opcional) Revivir leads marcados 'frio' para que entren al nuevo ciclo de 8 touches
-- Solo correr si quieres que tus leads viejos enfriados entren al nuevo sistema.
-- Comentado por defecto. Descomenta si lo deseas:
--
-- UPDATE wa_leads
-- SET etapa = 'calificando',
--     followup_stage = 3, -- empiezan en stage 3 (dia 4) para no spamear inmediatamente
--     last_followup_sent_at = NULL,
--     updated_at = NOW()
-- WHERE etapa = 'frio'
--   AND bot_username = 'dradmin';
