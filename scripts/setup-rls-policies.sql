-- ═════════════════════════════════════════════════════
-- CONFIGURAR RLS Y FUNCIONES PARA TABLA PROFILES
-- ═════════════════════════════════════════════════════

-- Paso 1: Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Paso 2: Crear función para verificar usuario master
CREATE OR REPLACE FUNCTION check_master_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 3: Crear políticas RLS para profiles
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

-- Paso 4: Crear función para configurar usuarios maestros
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

-- Paso 5: Verificar configuración
SELECT 'Verificando configuración de RLS...' as status;

-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles';

-- Paso 6: Verificación final
SELECT '✅ Configuración RLS completada' as resultado;
SELECT '✅ Funciones creadas' as resultado2;
SELECT '✅ Listo para configurar usuarios maestros' as resultado3;

-- Instrucciones para configurar usuarios
SELECT 'Para configurar usuarios maestros, ejecuta:' as instrucciones;
SELECT 'SELECT setup_master_user(''ciborg347@gmail.com'');' as comando1;
SELECT 'SELECT setup_master_user(''starfamily@gmail.com'');' as comando2;
