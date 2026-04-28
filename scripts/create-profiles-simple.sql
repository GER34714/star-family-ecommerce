-- ═════════════════════════════════════════════════════
-- CREACIÓN SIMPLE DE TABLA PROFILES - PASO A PASO
-- ═════════════════════════════════════════════════════

-- Paso 1: Verificar si la tabla existe
SELECT 'Verificando si existe la tabla profiles...' as status;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'profiles' 
    AND table_schema = 'public';

-- Paso 2: Crear la tabla profiles si no existe
SELECT 'Creando tabla profiles...' as status;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_master BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'master')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paso 3: Verificar que la tabla fue creada
SELECT 'Verificando creación de la tabla...' as status;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Paso 4: Crear índices
SELECT 'Creando índices...' as status;

CREATE INDEX IF NOT EXISTS idx_profiles_is_master ON profiles(is_master);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Paso 5: Habilitar RLS
SELECT 'Habilitando Row Level Security...' as status;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Paso 6: Verificar RLS
SELECT 'Verificando estado de RLS...' as status;

SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Paso 7: Crear función de verificación
SELECT 'Creando función check_master_user...' as status;

CREATE OR REPLACE FUNCTION check_master_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 8: Crear políticas básicas
SELECT 'Creando políticas RLS básicas...' as status;

-- Política para que los usuarios puedan ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para que los usuarios maestros puedan ver todos los perfiles
CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT USING (check_master_user());

-- Política para que los usuarios maestros puedan insertar perfiles
CREATE POLICY "Masters can insert profiles" ON profiles
  FOR INSERT WITH CHECK (check_master_user());

-- Política para que los usuarios maestros puedan actualizar perfiles
CREATE POLICY "Masters can update profiles" ON profiles
  FOR UPDATE USING (check_master_user());

-- Política para que los usuarios maestros puedan eliminar perfiles
CREATE POLICY "Masters can delete profiles" ON profiles
  FOR DELETE USING (check_master_user());

-- Paso 9: Verificar políticas
SELECT 'Verificando políticas creadas...' as status;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles';

-- Paso 10: Crear función para configurar usuarios maestros
SELECT 'Creando función setup_master_user...' as status;

CREATE OR REPLACE FUNCTION setup_master_user(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
  result TEXT;
BEGIN
  -- Verificar si el usuario existe en auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF user_id IS NULL THEN
    RETURN 'ERROR: Usuario ' || p_email || ' no encontrado. Cree el usuario primero.';
  END IF;
  
  -- Crear o actualizar el perfil como master
  INSERT INTO profiles (id, email, is_master, role)
  VALUES (user_id, p_email, true, 'master')
  ON CONFLICT (id) 
  DO UPDATE SET 
    is_master = true,
    role = 'master',
    updated_at = NOW();
  
  RETURN 'SUCCESS: Usuario ' || p_email || ' configurado como master correctamente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 11: Verificación final
SELECT 'Verificación final completada.' as status;

-- Mostrar estructura final de la tabla
SELECT 
  'ESTRUCTURA FINAL DE LA TABLA PROFILES:' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Instrucciones para configurar usuarios
SELECT 'Para configurar usuarios maestros, ejecuta:' as instrucciones;
SELECT 'SELECT setup_master_user(''ciborg347@gmail.com'');' as comando1;
SELECT 'SELECT setup_master_user(''starfamily@gmail.com'');' as comando2;
