-- ═══════════════════════════════════════════════════
-- QUICK RLS FIX - SOLUCIÓN INMEDIATA DE VISIBILIDAD
-- ═══════════════════════════════════════════════════

-- OPCIÓN 1: DESHABILITAR RLS COMPLETAMENTE (MÁS RÁPIDO)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- OPCIÓN 2: SI LA TABLA SE LLAMA 'productos' (ESPAÑOL)
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;

-- OPCIÓN 3: MANTENER RLS PERO PERMITIR LECTURA PÚBLICA
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
CREATE POLICY "Enable read access for all users" ON products
FOR SELECT USING (true);

-- OPCIÓN 4: SI LA TABLA ES 'productos' CON POLÍTICA
DROP POLICY IF EXISTS "Enable read access for all users" ON productos;
CREATE POLICY "Enable read access for all users" ON productos
FOR SELECT USING (true);

-- VERIFICACIÓN - Revisa cuál tabla existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'productos');

-- VERIFICACIÓN - Revisa estado de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('products', 'productos');

-- INSTRUCCIONES:
-- 1. Primero ejecuta la consulta de verificación para saber el nombre exacto de tu tabla
-- 2. Luego ejecuta la OPCIÓN correcta según el nombre de tu tabla
-- 3. Recarga la aplicación y revisa la consola

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '🔧 QUICK RLS FIX APLICADO';
    RAISE NOTICE '📋 Opciones ejecutadas para ambas tablas (products y productos)';
    RAISE NOTICE '🔍 Ahora la app debería poder leer los datos';
    RAISE NOTICE '📱 Recarga la aplicación y verifica la consola';
END $$;
