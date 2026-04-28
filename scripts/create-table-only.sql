-- ═════════════════════════════════════════════════════
-- CREAR ÚNICAMENTE LA TABLA PROFILES - SIN POLÍTICAS
-- ═════════════════════════════════════════════════════

-- Paso 1: Eliminar tabla si existe para empezar desde cero
DROP TABLE IF EXISTS profiles CASCADE;

-- Paso 2: Crear la tabla profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_master BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'master')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paso 3: Verificar que la tabla fue creada correctamente
SELECT 'Tabla profiles creada exitosamente' as status;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Paso 4: Probar inserción simple
SELECT 'Probando inserción simple...' as status;

-- Insertar un registro de prueba (esto debería funcionar ahora)
INSERT INTO profiles (id, email, is_master, role)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  false,
  'user'
);

-- Paso 5: Verificar inserción
SELECT 'Verificando inserción...' as status;

SELECT * FROM profiles WHERE email = 'test@example.com';

-- Paso 6: Limpiar registro de prueba
SELECT 'Limpiando registro de prueba...' as status;

DELETE FROM profiles WHERE email = 'test@example.com';

-- Paso 7: Verificación final
SELECT 'Verificación final - La tabla está lista para configurar políticas' as status;

SELECT COUNT(*) as total_profiles FROM profiles;

SELECT '✅ Tabla profiles creada correctamente con la columna is_master' as resultado;
