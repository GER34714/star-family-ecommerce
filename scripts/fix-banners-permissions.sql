-- ═══════════════════════════════════════════════════════
-- SOLUCIÓN RÁPIDA PARA ERROR 403 DE BANNERS
-- ═══════════════════════════════════════════════════════

-- 1. Crear tabla banners si no existe
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  link TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Public read active banners" ON banners;
DROP POLICY IF EXISTS "Authenticated users can manage banners" ON banners;

-- 4. Crear políticas de acceso
-- Permitir lectura pública de banners activos
CREATE POLICY "Public read active banners" ON banners
FOR SELECT USING (active = true);

-- Permitir que usuarios autenticados gestionen banners
CREATE POLICY "Authenticated users can manage banners" ON banners
FOR ALL USING (auth.role() = 'authenticated');

-- 5. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active);
CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at DESC);

-- 6. Insertar un banner de ejemplo para probar
INSERT INTO banners (title, description, image_url, link, active)
VALUES (
  'Bienvenido a Star Family',
  'Los mejores productos mayoristas al mejor precio',
  'https://iili.io/B6XgSSI.jpg',
  null,
  true
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- COMPLETADO: Permisos de banners configurados
-- ═══════════════════════════════════════════════════════
