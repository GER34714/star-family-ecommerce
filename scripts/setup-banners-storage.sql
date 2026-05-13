-- ═══════════════════════════════════════════════════════
-- CONFIGURACIÓN DE STORAGE PARA BANNERS
-- ═══════════════════════════════════════════════════════

-- 1. Crear bucket para banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Configurar políticas de acceso para el bucket banners
-- Permitir lectura pública (para mostrar banners en la tienda)
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'banners');

-- Permitir que usuarios autenticados suban banners
CREATE POLICY "Authenticated users can upload banners" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Permitir que usuarios autenticados actualicen banners
CREATE POLICY "Authenticated users can update banners" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Permitir que usuarios autenticados eliminen banners
CREATE POLICY "Authenticated users can delete banners" ON storage.objects
FOR DELETE USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- 3. Crear tabla para metadatos de banners
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

-- 4. Configurar RLS para la tabla banners
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para la tabla banners
-- Permitir lectura pública de banners activos
CREATE POLICY "Public read active banners" ON banners
FOR SELECT USING (active = true);

-- Permitir que usuarios autenticados gestionen banners
CREATE POLICY "Authenticated users can manage banners" ON banners
FOR ALL USING (auth.role() = 'authenticated');

-- 6. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active);
CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at DESC);

-- ═══════════════════════════════════════════════════════
-- COMPLETADO: Bucket y tabla de banners configurados
-- ═══════════════════════════════════════════════════════
