-- ═════════════════════════════════════════════════════
-- SQL PARA CREAR TABLA DE PRODUCTOS EN SUPABASE
-- ═══════════════════════════════════════════════════════

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  bulk_info TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Habilitar Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública (solo productos activos)
CREATE POLICY "Public read active products" ON products
  FOR SELECT USING (active = true);

-- Política para inserción (solo usuarios autenticados)
CREATE POLICY "Authenticated users can insert" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para actualización (solo usuarios autenticados)
CREATE POLICY "Authenticated users can update" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para eliminación (solo usuarios autenticados)
CREATE POLICY "Authenticated users can delete" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ═════════════════════════════════════════════════════
-- CONFIGURACIÓN DEL BUCKET DE STORAGE
-- ═════════════════════════════════════════════════════

-- 1. Ir a Supabase Dashboard → Storage
-- 2. Crear un nuevo bucket llamado "products"
-- 3. Configurar políticas públicas para el bucket:

-- NOTA: Las políticas de Storage se configuran desde el dashboard de Supabase
-- No se pueden crear con SQL. Seguir estos pasos:

-- PASOS MANUALES DESDE DASHBOARD:
-- a) Ir a Storage → Policies
-- b) Crear nueva política con:
--    - Policy Name: "Public Access"
--    - Allowed Operation: SELECT
--    - Target Roles: anon, authenticated
--    - Policy Definition: {"bucket": "products"}
--    - SELECT * FROM storage.objects WHERE bucket_id = 'products'

-- ═════════════════════════════════════════════════════
-- INSTRUCCIONES DE USO
-- ═════════════════════════════════════════════════════

-- 1. Ejecutar este SQL en el editor SQL de Supabase
-- 2. Crear el bucket "products" en Storage
-- 3. Configurar las políticas del bucket
-- 4. Usar la aplicación para migrar productos existentes
-- 5. Probar la subida de imágenes nuevas
