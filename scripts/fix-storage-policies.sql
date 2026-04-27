-- ═══════════════════════════════════════════════════
-- FIX STORAGE POLICIES FOR PUBLIC IMAGE ACCESS
-- ═════════════════════════════════════════════════════

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete to product images" ON storage.objects;

-- Habilitar acceso público a las imágenes del bucket products
CREATE POLICY "Allow public read access to product images" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

-- Permitir subida pública de imágenes
CREATE POLICY "Allow public upload to product images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

-- Permitir actualización pública de imágenes
CREATE POLICY "Allow public update to product images" ON storage.objects
FOR UPDATE USING (bucket_id = 'products');

-- Permitir eliminación pública de imágenes
CREATE POLICY "Allow public delete to product images" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas de Storage actualizadas para acceso público a imágenes';
    RAISE NOTICE '📋 Bucket: products';
    RAISE NOTICE '🔓 Acceso público habilitado para SELECT, INSERT, UPDATE, DELETE';
    RAISE NOTICE '🌐 Las imágenes ahora deberían ser visibles en modo incognito';
END $$;
