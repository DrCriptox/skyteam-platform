-- ============================================
-- WHATSAPP AI BOT - Supabase Setup
-- Ejecutar en: https://supabase.com/dashboard/project/dheosuwekrhdfayikuil/sql/new
-- ============================================

-- 1. Tabla de conversaciones WhatsApp
CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  message_type TEXT DEFAULT 'text',
  content TEXT,
  wa_message_id TEXT,
  bot_username TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON wa_conversations(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conv_bot ON wa_conversations(bot_username, created_at DESC);

-- 2. Tabla de leads del bot (perfil persistente por telefono)
-- Follow-up v2: 8 stages, smart time windows, anti-spam dedup
CREATE TABLE IF NOT EXISTS wa_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  bot_username TEXT NOT NULL,
  etapa TEXT DEFAULT 'nuevo',
  temperatura TEXT DEFAULT 'tibio',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  followup_stage INT DEFAULT 0, -- 0..8 (8 stages of re-engagement)
  followup_paused BOOLEAN DEFAULT FALSE,
  last_followup_sent_at TIMESTAMPTZ, -- Anti-spam: max 1 follow-up per 24h
  followup_variant TEXT, -- Rota templates en stages 4-8 para no repetir
  response_pattern_hours INT[], -- Horas (UTC) cuando el lead historicamente responde (max 20)
  timezone TEXT DEFAULT 'America/Bogota', -- TZ IANA del lead, autodetectada por codigo de pais
  context_summary TEXT,
  objections TEXT[],
  booking_id UUID,
  prospecto_id UUID,
  source TEXT DEFAULT 'whatsapp_bot',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_leads_phone ON wa_leads(phone);
-- Index para que el cron encuentre rapido leads elegibles para follow-up
DROP INDEX IF EXISTS idx_wa_leads_followup;
CREATE INDEX IF NOT EXISTS idx_wa_leads_followup ON wa_leads(followup_stage, last_message_at, last_followup_sent_at)
  WHERE followup_paused = FALSE AND followup_stage < 8;

-- 3. Habilitar RLS (Row Level Security) basico
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_leads ENABLE ROW LEVEL SECURITY;

-- Politica: service_role tiene acceso total (nuestras API keys usan service_role)
CREATE POLICY "service_role_wa_conv" ON wa_conversations FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_wa_leads" ON wa_leads FOR ALL
  USING (true) WITH CHECK (true);
