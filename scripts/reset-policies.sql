-- Eliminar TODAS las políticas existentes para el bucket products
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete own files" ON storage.objects;

-- Verificar que no haya políticas restantes
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Crear políticas nuevas y simplificadas para el bucket products
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Allow public insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

CREATE POLICY "Allow public update" ON storage.objects
FOR UPDATE USING (bucket_id = 'products');

CREATE POLICY "Allow public delete" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

-- Verificar las nuevas políticas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
