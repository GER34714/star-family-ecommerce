-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete own files" ON storage.objects;

-- Políticas corregidas para el bucket products
-- Permitir a todos leer las imágenes (acceso público)
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

-- Permitir a todos subir imágenes (para facilitar el uso)
CREATE POLICY "Allow public upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

-- Permitir a todos actualizar imágenes del bucket products
CREATE POLICY "Allow public update" ON storage.objects
FOR UPDATE USING (bucket_id = 'products');

-- Permitir a todos eliminar imágenes del bucket products
CREATE POLICY "Allow public delete" ON storage.objects
FOR DELETE USING (bucket_id = 'products');
