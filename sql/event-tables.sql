-- ═══════════════════════════════════════════════════════════
-- SKYTEAM EVENT MANAGEMENT SYSTEM — SQL Tables
-- Run this in Supabase SQL Editor
-- ════════════════════��══════════════════════════════════════

-- 1. Event Pages (landing pages con IA)
CREATE TABLE IF NOT EXISTS event_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by text NOT NULL,
  slug text UNIQUE NOT NULL,
  titulo text NOT NULL,
  descripcion text DEFAULT '',
  tipo text DEFAULT 'presencial',
  fecha text NOT NULL,
  hora text DEFAULT '',
  ciudad text DEFAULT '',
  lugar text DEFAULT '',
  direccion text DEFAULT '',
  link_virtual text DEFAULT '',
  capacidad int DEFAULT 100,
  precio text DEFAULT 'Gratis',
  whatsapp_pago text DEFAULT '',
  ai_html text,
  ai_poster_url text,
  ai_content jsonb,
  status text DEFAULT 'draft',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Event Registrations (asistentes)
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES event_pages(id) ON DELETE CASCADE,
  ref_username text,
  nombre text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  ciudad text,
  notas text,
  status text DEFAULT 'registered',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- 3. Event Visits (analytics por referidor)
CREATE TABLE IF NOT EXISTS event_visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES event_pages(id) ON DELETE CASCADE,
  ref_username text,
  ip text,
  fingerprint text,
  device text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_pages_slug ON event_pages(slug);
CREATE INDEX IF NOT EXISTS idx_event_pages_status ON event_pages(status);
CREATE INDEX IF NOT EXISTS idx_event_pages_created_by ON event_pages(created_by);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_ref ON event_registrations(ref_username);
CREATE INDEX IF NOT EXISTS idx_event_visits_event ON event_visits(event_id);
CREATE INDEX IF NOT EXISTS idx_event_visits_ref ON event_visits(ref_username);
