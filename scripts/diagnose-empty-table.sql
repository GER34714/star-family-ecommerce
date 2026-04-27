-- ═══════════════════════════════════════════════════
-- DIAGNÓSTICO: TABLA VACÍA VS PROBLEMA RLS
-- ═══════════════════════════════════════════════════

-- PASO 1: Verificar si la tabla existe y tiene datos
SELECT 
    'products' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN active = true THEN 1 END) as active_records
FROM products;

-- PASO 2: Verificar estado de RLS en la tabla
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerlspolicy
FROM pg_tables 
WHERE tablename = 'products';

-- PASO 3: Verificar políticas existentes (si RLS está habilitado)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'products';

-- PASO 4: Probar consulta directa (sin filtros)
SELECT * FROM products LIMIT 3;

-- PASO 5: Si no hay datos, insertar un producto de prueba
INSERT INTO products (id, category, name, description, price, bulk_info, image_url, active)
VALUES (
    'test-product-' || EXTRACT(EPOCH FROM NOW())::text,
    'Frescos',
    'Producto de Prueba Diagnóstico',
    'Producto creado para diagnosticar visibilidad',
    10000,
    'Test bulk info',
    '',
    true
) ON CONFLICT (id) DO NOTHING;

-- PASO 6: Verificar después de la inserción
SELECT COUNT(*) as total_after_insert FROM products;

-- RESULTADOS ESPERADOS:
-- Si PASO 1 muestra 0 registros → Tabla vacía (necesita productos)
-- Si PASO 2 muestra rowsecurity = true → RLS habilitado (necesita deshabilitar)
-- Si PASO 4 falla con permisos → Problema RLS
-- Si PASO 5 funciona y PASO 6 muestra 1+ → Problema resuelto

-- Mensaje de diagnóstico
DO $$
BEGIN
    RAISE NOTICE '🔍 DIAGNÓSTICO COMPLETADO';
    RAISE NOTICE '📊 Revisa los resultados de cada paso';
    RAISE NOTICE '🔧 Si RLS está habilitado, ejecuta: ALTER TABLE products DISABLE ROW LEVEL SECURITY;';
    RAISE NOTICE '📦 Si tabla está vacía, usa el panel admin para agregar productos';
END $$;
