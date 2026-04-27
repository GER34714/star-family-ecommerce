-- ═══════════════════════════════════════════════════
-- POLÍTICA DE ACCESO PÚBLICO A STORAGE PARA IMÁGENES
-- ═══════════════════════════════════════════════════

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Allow public image access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public image upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public image update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public image delete" ON storage.objects;

-- POLÍTICA DE LECTURA PÚBLICA (SELECT)
-- Permite que cualquiera pueda leer/ver las imágenes del bucket 'products'
CREATE POLICY "Allow public image access" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

-- POLÍTICA DE INSERCIÓN PÚBLICA (INSERT) - Opcional para admin
CREATE POLICY "Allow public image upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

-- POLÍTICA DE ACTUALIZACIÓN PÚBLICA (UPDATE) - Opcional para admin
CREATE POLICY "Allow public image update" ON storage.objects
FOR UPDATE USING (bucket_id = 'products');

-- POLÍTICA DE ELIMINACIÓN PÚBLICA (DELETE) - Opcional para admin
CREATE POLICY "Allow public image delete" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas de Storage configuradas para acceso público';
    RAISE NOTICE '📋 Bucket: products';
    RAISE NOTICE '🔓 Lectura pública habilitada para imágenes';
    RAISE NOTICE '🌐 Las imágenes ahora deberían ser visibles en modo incógnito y móviles';
END $$;
