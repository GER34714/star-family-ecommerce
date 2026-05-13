-- ═══════════════════════════════════════════════════════
-- SOLUCIÓN ALTERNATIVA FORZADA PARA BANNERS
-- ═══════════════════════════════════════════════════════

-- 1. Deshabilitar RLS temporalmente para configurar todo
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;

-- 2. Crear tabla si no existe (versión simplificada)
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

-- 3. Insertar datos de prueba
INSERT INTO banners (title, description, image_url, link, active)
VALUES 
  ('Bienvenido a Star Family', 'Los mejores productos mayoristas al mejor precio', 'https://iili.io/B6XgSSI.jpg', null, true),
  ('Promoción Especial', 'Aprovecha nuestros descuentos por tiempo limitado', 'https://iili.io/B6XgSSI.jpg', null, true)
ON CONFLICT DO NOTHING;

-- 4. Volver a habilitar RLS con políticas simples
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Enable read access for all users" ON banners;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON banners;
DROP POLICY IF EXISTS "Enable update for all users" ON banners;
DROP POLICY IF EXISTS "Enable delete for all users" ON banners;

-- 6. Crear política simple que permite TODO (para testing)
CREATE POLICY "Enable all for all users" ON banners
FOR ALL USING (true);

-- 7. Opcional: Crear índices
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active);
CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at DESC);

-- ═══════════════════════════════════════════════════════
-- COMPLETADO: Configuración alternativa de banners
-- ═══════════════════════════════════════════════════════
