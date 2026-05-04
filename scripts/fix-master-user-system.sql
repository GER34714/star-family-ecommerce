-- ═════════════════════════════════════════════════════
-- DIAGNÓSTICO Y REPARACIÓN - SISTEMA USUARIOS MAESTROS
-- ═════════════════════════════════════════════════════

-- 1. VERIFICAR ESTADO ACTUAL DE LA BASE DE DATOS
-- ═════════════════════════════════════════════════════

-- Verificar si la tabla profiles existe
SELECT 
    table_name,
    table_type,
    is_insertable_into
FROM information_schema.tables 
WHERE table_name = 'profiles' 
    AND table_schema = 'public';

-- Si la tabla existe, verificar sus columnas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ELIMINAR CONFIGURACIÓN EXISTENTE (SI HAY ERRORES)
-- ═════════════════════════════════════════════════════

-- Eliminar tabla profiles si existe (para empezar desde cero)
DROP TABLE IF EXISTS profiles CASCADE;

-- Eliminar funciones si existen
DROP FUNCTION IF EXISTS is_master_user() CASCADE;
DROP FUNCTION IF EXISTS check_master_user() CASCADE;
DROP FUNCTION IF EXISTS assign_master_permissions(TEXT) CASCADE;
DROP FUNCTION IF EXISTS setup_master_user(TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_user_with_profile(TEXT, TEXT, BOOLEAN, TEXT) CASCADE;
DROP FUNCTION IF EXISTS delete_user_profile(UUID) CASCADE;

-- Eliminar vistas si existen
DROP VIEW IF EXISTS master_users_view CASCADE;

-- Eliminar triggers si existen
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS update_profiles_updated_at() CASCADE;

-- 3. CREAR TABLA PROFILES LIMPIA
-- ═════════════════════════════════════════════════════

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_master BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'master')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_profiles_is_master ON profiles(is_master);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- 4. HABILITAR RLS Y CREAR POLÍTICAS BÁSICAS
-- ═════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para verificar usuario master
CREATE OR REPLACE FUNCTION check_master_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas básicas
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT USING (check_master_user());

CREATE POLICY "Masters can insert profiles" ON profiles
  FOR INSERT WITH CHECK (check_master_user());

CREATE POLICY "Masters can update profiles" ON profiles
  FOR UPDATE USING (check_master_user());

CREATE POLICY "Masters can delete profiles" ON profiles
  FOR DELETE USING (check_master_user());

-- 5. TRIGGER PARA UPDATED_AT
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_profiles_updated_at();

-- 6. FUNCIÓN PARA CONFIGURAR USUARIO MASTER
-- ═════════════════════════════════════════════════════

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
    RETURN 'ERROR: Usuario ' || p_email || ' no encontrado. Cree el usuario primero con supabase.auth.signUp()';
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

-- 7. VISTA PARA GESTIÓN DE USUARIOS
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE VIEW master_users_view AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  p.is_master,
  p.role,
  p.created_at as profile_created_at,
  p.updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;

-- Política para la vista
DROP POLICY IF EXISTS "Masters can view users" ON master_users_view;
CREATE POLICY "Masters can view users" ON master_users_view
  FOR ALL USING (check_master_user());

-- 8. VERIFICACIÓN FINAL
-- ═════════════════════════════════════════════════════

-- Verificar que la tabla fue creada correctamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 9. INSTRUCCIONES PARA CONFIGURAR USUARIOS MASTERS
-- ═════════════════════════════════════════════════════

/*
PASOS DESPUÉS DE EJECUTAR ESTE SCRIPT:

1. Crear los usuarios en auth.users:
   - Desde el dashboard de Supabase: Authentication → Users
   - O desde el frontend con supabase.auth.signUp()

2. Usuarios a crear:
   - Email: ciborg347@gmail.com, Password: 34714589
   - Email: starfamily@gmail.com, Password: 34714589

3. Asignar permisos de master:
   SELECT setup_master_user('ciborg347@gmail.com');
   SELECT setup_master_user('starfamily@gmail.com');

4. Verificar configuración:
   SELECT * FROM profiles WHERE is_master = true;
*/

-- Consulta de ejemplo para configurar los usuarios (descomentar después de crearlos)
-- SELECT setup_master_user('ciborg347@gmail.com');
-- SELECT setup_master_user('starfamily@gmail.com');
