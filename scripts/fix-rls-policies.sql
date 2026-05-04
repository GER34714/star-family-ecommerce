-- ═══════════════════════════════════════════════════
-- SOLUCIÓN DE VISIBILIDAD DE DATOS (RLS)
-- ═══════════════════════════════════════════════════

-- OPCIÓN 1: Deshabilitar completamente RLS para la tabla products (más simple)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- OPCIÓN 2: Mantener RLS habilitado pero crear política pública de lectura (más seguro)

-- Primero eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Allow public select on products" ON products;
DROP POLICY IF EXISTS "Products can be read by everyone" ON products;

-- Crear política de lectura pública para la tabla products
CREATE POLICY "Enable read access for all users" ON products
FOR SELECT USING (true);

-- OPCIÓN 3: Política más específica (solo para productos activos)
CREATE POLICY "Enable read access for active products" ON products
FOR SELECT USING (active = true);

-- Verificación: Mostrar políticas actuales
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'products' 
ORDER BY policyname;

-- Verificación: Mostrar estado de RLS en la tabla
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerlspolicy
FROM pg_tables 
WHERE tablename = 'products';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS configuradas para tabla products';
    RAISE NOTICE '📋 Opciones aplicadas:';
    RAISE NOTICE '   - RLS deshabilitado (OPCIÓN 1) O';
    RAISE NOTICE '   - Política de lectura pública creada (OPCIÓN 2) O';
    RAISE NOTICE '   - Política específica para activos (OPCIÓN 3)';
    RAISE NOTICE '🔍 Verifica en el dashboard de Supabase qué opción funciona mejor';
END $$;
