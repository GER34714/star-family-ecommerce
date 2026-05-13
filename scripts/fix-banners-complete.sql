-- ═══════════════════════════════════════════════════════
-- SOLUCIÓN COMPLETA PARA BANNERS - CREACIÓN Y PERMISOS
-- ═══════════════════════════════════════════════════════

-- 1. Crear la tabla banners si no existe
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

-- 2. Habilitar RLS en la tabla
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Public read active banners" ON banners;
DROP POLICY IF EXISTS "Authenticated users can manage banners" ON banners;
DROP POLICY IF EXISTS "Enable all for all users" ON banners;
DROP POLICY IF EXISTS "Enable read access for all users" ON banners;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON banners;
DROP POLICY IF EXISTS "Enable update for all users" ON banners;
DROP POLICY IF EXISTS "Enable delete for all users" ON banners;

-- 4. Crear políticas de acceso para usuarios anónimos y autenticados
-- Política de lectura pública para banners activos (usuarios anónimos)
CREATE POLICY "Allow anonymous read active banners" ON banners
FOR SELECT USING (active = true AND auth.role() = 'anon');

-- Política de lectura pública para banners activos (usuarios autenticados)
CREATE POLICY "Allow authenticated read active banners" ON banners
FOR SELECT USING (active = true AND auth.role() = 'authenticated');

-- Política de gestión completa para usuarios autenticados
CREATE POLICY "Allow authenticated full management" ON banners
FOR ALL USING (auth.role() = 'authenticated');

-- 5. Otorgar permisos explícitos
-- Permitir que usuarios anónimos lean banners
GRANT SELECT ON TABLE banners TO anon;

-- Permitir que usuarios autenticados lean y gestionen banners
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE banners TO authenticated;

-- Permitir que usuarios anónimos lean la secuencia de IDs
GRANT USAGE ON SEQUENCE banners_id_seq TO anon;

-- Permitir que usuarios autenticados usen la secuencia de IDs
GRANT USAGE ON SEQUENCE banners_id_seq TO authenticated;

-- 6. Insertar banners de ejemplo para testing
INSERT INTO banners (title, description, image_url, link, active)
VALUES 
  ('Bienvenido a Star Family', 'Los mejores productos mayoristas al mejor precio', 'https://iili.io/B6XgSSI.jpg', null, true),
  ('Promoción Especial', 'Aprovecha nuestros descuentos por tiempo limitado', 'https://iili.io/B6XgSSI.jpg', null, true),
  ('Nuevos Productos', 'Conocé nuestras últimas novedades', 'https://iili.io/B6XgSSI.jpg', null, true)
ON CONFLICT DO NOTHING;

-- 7. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active);
CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at DESC);

-- ═══════════════════════════════════════════════════════
-- COMPLETADO: Configuración completa de banners
-- ═══════════════════════════════════════════════════════
