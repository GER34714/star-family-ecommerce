-- ═════════════════════════════════════════════════════
-- VERSIÓN SEGURA: CREAR USUARIOS ADMIN SIN ERRORES
-- ═════════════════════════════════════════════════════

-- 1. LIMPIAR OBJETOS EXISTENTES DE FORMA SEGURA
-- ═════════════════════════════════════════════════════

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar función si existe
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Eliminar tabla profiles si existe
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. CREAR ESTRUCTURA LIMPIA
-- ═════════════════════════════════════════════════════

-- Crear tabla profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  is_master BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. CREAR POLÍTICAS DE SEGURIDAD
-- ═════════════════════════════════════════════════════

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_master = true
    )
  );

-- 4. CREAR TRIGGER PARA NUEVOS USUARIOS
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_master, role)
  VALUES (new.id, new.email, FALSE, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. FUNCIÓN PARA ASIGNAR PERMISOS DE MASTER
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION setup_master_user(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- Obtener el ID del usuario por email
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF user_id IS NULL THEN
    RETURN 'ERROR: Usuario no encontrado en auth.users - Primero crea el usuario con signUp()';
  END IF;
  
  -- Verificar si el perfil ya existe
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
  
  IF profile_exists THEN
    -- Actualizar perfil existente
    UPDATE profiles 
    SET is_master = true, role = 'master', updated_at = NOW()
    WHERE id = user_id;
    RETURN '✅ Usuario actualizado como master: ' || p_email;
  ELSE
    -- Crear nuevo perfil
    INSERT INTO profiles (id, email, is_master, role)
    VALUES (user_id, p_email, true, 'master');
    RETURN '✅ Usuario creado como master: ' || p_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. VERIFICAR USUARIOS EXISTENTES Y ASIGNAR PERMISOS
-- ═════════════════════════════════════════════════════

SELECT 'Usuarios existentes en auth.users:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Asignar permisos de master a los usuarios existentes
SELECT setup_master_user('ciborg347@gmail.com') as result1;
SELECT setup_master_user('starfamily@gmail.com') as result2;

-- 7. VERIFICACIÓN FINAL
-- ═════════════════════════════════════════════════════

SELECT 
  'USUARIOS MASTERS CONFIGURADOS:' as section,
  p.id,
  p.email,
  p.is_master,
  p.role,
  p.created_at as profile_created,
  u.created_at as user_created
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_master = true
ORDER BY p.created_at DESC;

-- 8. INSTRUCCIONES
-- ═════════════════════════════════════════════════════

SELECT '✅ Sistema configurado correctamente' as status;
SELECT '🎯 Ahora puedes iniciar sesión con:' as instruction;
SELECT 'ciborg347@gmail.com / tu-contraseña' as user1;
SELECT 'starfamily@gmail.com / tu-contraseña' as user2;
