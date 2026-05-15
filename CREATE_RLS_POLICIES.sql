-- RLS Policies for products table
-- Execute this in Supabase SQL Editor

-- Permitir lectura a usuarios autenticados (admin)
CREATE POLICY "Admin puede leer productos" ON products
FOR SELECT TO authenticated
USING (true);

-- Permitir update a usuarios autenticados (admin)
CREATE POLICY "Admin puede actualizar productos" ON products
FOR UPDATE TO authenticated
USING (true);

-- Permitir insert a usuarios autenticados (admin)
CREATE POLICY "Admin puede insertar productos" ON products
FOR INSERT TO authenticated
WITH CHECK (true);

-- Lectura pública solo de productos publicados
CREATE POLICY "Público ve solo publicados" ON products
FOR SELECT TO anon
USING (status = 'published');
