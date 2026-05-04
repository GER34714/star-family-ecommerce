-- ═════════════════════════════════════════════════════
-- SISTEMA DE USUARIOS MAESTROS - SUPABASE
-- ═════════════════════════════════════════════════════

-- 1. CREAR TABLA PROFILES CON CAMPO IS_MASTER
-- ═════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_master BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'master')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_is_master ON profiles(is_master);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Habilitar Row Level Security (RLS) en la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DE SEGURIDAD (RLS)
-- ═════════════════════════════════════════════════════

-- Política para que los usuarios puedan ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para que los usuarios maestros puedan ver todos los perfiles
CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_master = true
    )
  );

-- Política para que los usuarios maestros puedan insertar perfiles
CREATE POLICY "Masters can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_master = true
    )
  );

-- Política para que los usuarios maestros puedan actualizar perfiles
CREATE POLICY "Masters can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_master = true
    )
  );

-- Política para que los usuarios maestros puedan eliminar perfiles
CREATE POLICY "Masters can delete profiles" ON profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_master = true
    )
  );

-- 3. TRIGGER PARA ACTUALIZAR UPDATED_AT
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

-- 4. FUNCIÓN PARA VERIFICAR SI ES USUARIO MAESTRO
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_master_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. POLÍTICAS PARA GESTIÓN DE USUARIOS AUTH.USERS
-- ═════════════════════════════════════════════════════

-- Nota: Las operaciones sobre auth.users deben realizarse a través de funciones
-- personalizadas ya que auth.users es una tabla del sistema

-- Función para crear un nuevo usuario (solo para masters)
CREATE OR REPLACE FUNCTION create_user(
  p_email TEXT,
  p_password TEXT,
  p_is_master BOOLEAN DEFAULT false,
  p_role TEXT DEFAULT 'user'
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verificar que el usuario actual es un master
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  ) THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden crear nuevos usuarios';
  END IF;
  
  -- Insertar en auth.users usando el API de Supabase
  -- Esto debe hacerse desde el frontend con supabase.auth.signUp()
  -- Esta función solo maneja el perfil
  
  RAISE EXCEPTION 'Use supabase.auth.signUp() desde el frontend para crear usuarios. Esta función manejará el perfil automáticamente.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. VERIFICACIÓN DE CONFIGURACIÓN
-- ═════════════════════════════════════════════════════

-- Verificar que la tabla fue creada correctamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
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

-- ═════════════════════════════════════════════════════
-- INSTRUCCIONES DE USO
-- ═════════════════════════════════════════════════════

-- 1. Ejecutar este script en el editor SQL de Supabase
-- 2. Crear los usuarios maestros usando el frontend o el dashboard
-- 3. Asignar is_master = true a los usuarios deseados
-- 4. Implementar la validación en el frontend
