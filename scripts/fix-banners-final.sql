-- ═══════════════════════════════════════════════════════
-- SOLUCIÓN DEFINITIVA - DESHABILITAR RLS COMPLETAMENTE
-- ═══════════════════════════════════════════════════════

-- 1. Deshabilitar RLS completamente para la tabla banners
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Allow anonymous read active banners" ON banners;
DROP POLICY IF EXISTS "Allow authenticated read active banners" ON banners;
DROP POLICY IF EXISTS "Allow authenticated full management" ON banners;
DROP POLICY IF EXISTS "Public read active banners" ON banners;
DROP POLICY IF EXISTS "Authenticated users can manage banners" ON banners;
DROP POLICY IF EXISTS "Enable all for all users" ON banners;
DROP POLICY IF EXISTS "Enable read access for all users" ON banners;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON banners;
DROP POLICY IF EXISTS "Enable update for all users" ON banners;
DROP POLICY IF EXISTS "Enable delete for all users" ON banners;

-- 3. Asegurar que la tabla exista
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

-- 4. NO VOLVER A HABILITAR RLS - MANTENER ACCESO TOTAL

-- 5. Insertar banners de ejemplo
INSERT INTO banners (title, description, image_url, link, active)
VALUES 
  ('Bienvenido a Star Family', 'Los mejores productos mayoristas al mejor precio', 'https://iili.io/B6XgSSI.jpg', null, true),
  ('Promoción Especial', 'Aprovecha nuestros descuentos por tiempo limitado', 'https://iili.io/B6XgSSI.jpg', null, true),
  ('Nuevos Productos', 'Conocé nuestras últimas novedades', 'https://iili.io/B6XgSSI.jpg', null, true)
ON CONFLICT DO NOTHING;

-- 6. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active);
CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at DESC);

-- 7. Otorgar permisos básicos (sin RLS no son necesarios políticas)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE banners TO authenticated;
GRANT SELECT ON TABLE banners TO anon;

-- ═══════════════════════════════════════════════════════
-- COMPLETADO: BANNERS SIN RESTRICCIONES DE RLS
-- ═══════════════════════════════════════════════════════
