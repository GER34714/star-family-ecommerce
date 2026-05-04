-- ═════════════════════════════════════════════════════
-- CREAR TABLA PROFILES LIMPIA - SIN DEPENDENCIAS
-- ═════════════════════════════════════════════════════

-- Paso 1: Eliminar tabla si existe
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

-- Paso 3: Verificar que la tabla fue creada
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

-- Paso 4: Verificar que la columna is_master existe
SELECT 'Verificando columna is_master...' as status;

SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND column_name = 'is_master'
    AND table_schema = 'public';

-- Paso 5: Verificar estructura completa sin inserciones
SELECT 'Estructura verificada - La tabla está lista' as status;

-- Mostrar información de la tabla
SELECT 
    'profiles' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Paso 6: Verificar restricciones
SELECT 'Verificando restricciones...' as status;

SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' 
    AND table_schema = 'public';

-- Paso 7: Estado final
SELECT '✅ Tabla profiles creada correctamente' as resultado;
SELECT '✅ Columna is_master verificada' as resultado2;
SELECT '✅ Estructura completa y lista para usar' as resultado3;

-- No hacer inserciones hasta que haya usuarios reales en auth.users
