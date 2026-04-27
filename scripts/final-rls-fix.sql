-- ═══════════════════════════════════════════════════
-- FINAL RLS FIX - TABLA CONFIRMADA: 'products'
-- ═══════════════════════════════════════════════════

-- ERROR CONFIRMADO: relation "productos" does not exist
-- SOLUCIÓN: Deshabilitar RLS en la tabla 'products'

-- PASO 1: Deshabilitar Row Level Security completamente
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- PASO 2: Verificar que el cambio se aplicó
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerlspolicy
FROM pg_tables 
WHERE tablename = 'products';

-- PASO 3: Probar la consulta que usa la app
SELECT * FROM products LIMIT 5;

-- PASO 4: Si necesitas mantener RLS, crea una política pública
-- (Ejecuta solo si el paso 1 no funciona)
/*
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
CREATE POLICY "Enable read access for all users" ON products
FOR SELECT USING (true);
*/

-- RESULTADO ESPERADO:
-- La consulta SELECT * FROM products debería devolver datos
-- La app debería mostrar productos en lugar de array vacío

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ RLS FIX APLICADO - Tabla: products';
    RAISE NOTICE '🔓 Row Level Security deshabilitado';
    RAISE NOTICE '📱 La app ahora debería poder leer los datos';
    RAISE NOTICE '🔄 Recarga la aplicación para ver los cambios';
END $$;
