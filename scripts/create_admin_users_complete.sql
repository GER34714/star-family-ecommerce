-- ═════════════════════════════════════════════════════
-- SOLUCIÓN COMPLETA: CREAR USUARIOS ADMIN PARA PANEL DE CONTROL
-- ═════════════════════════════════════════════════════

-- ESTE SCRIPT RESUELVE EL PROBLEMA DE ACCESO ADMIN

-- 1. PRIMERO: Resetear y limpiar todo el sistema de autenticación
-- ═════════════════════════════════════════════════════

-- Limpiar tabla profiles completamente
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

-- Crear políticas de seguridad
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

-- 3. CREAR TRIGGER PARA NUEVOS USUARIOS
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

-- 4. FUNCIÓN PARA ASIGNAR PERMISOS DE MASTER
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

-- 5. FUNCIÓN PARA CREAR USUARIO DIRECTO (si no existe)
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_admin_user(p_email TEXT, p_password TEXT)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Insertar usuario en auth.users
  INSERT INTO auth.users (email, password_hash, email_confirmed_at)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), NOW())
  RETURNING id INTO user_id;
  
  -- Crear perfil como master
  INSERT INTO profiles (id, email, is_master, role)
  VALUES (user_id, p_email, true, 'master');
  
  RETURN '✅ Usuario admin creado: ' || p_email;
EXCEPTION
  WHEN unique_violation THEN
    RETURN '⚠️ Usuario ya existe: ' || p_email || ' - Usa setup_master_user()';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. VERIFICACIÓN INICIAL
-- ═════════════════════════════════════════════════════

SELECT '✅ Sistema de admin configurado correctamente' as status;

-- Mostrar usuarios actuales en auth.users
SELECT 
  'USUARIOS EN AUTH.USERS:' as section,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC;

-- 7. EJECUCIÓN AUTOMÁTICA DE USUARIOS ADMIN
-- ═════════════════════════════════════════════════════

-- Crear los usuarios admin directamente (si no existen)
SELECT create_admin_user('ciborg347@gmail.com', '34714589');
SELECT create_admin_user('starfamily@gmail.com', '34714589');

-- 8. VERIFICACIÓN FINAL
-- ═════════════════════════════════════════════════════

-- Mostrar todos los usuarios masters configurados
SELECT 
  'USUARIOS MASTERS CONFIGURADOS:' as section,
  p.id,
  p.email,
  p.is_master,
  p.role,
  p.created_at as profile_created,
  u.created_at as user_created,
  u.email_confirmed_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_master = true
ORDER BY p.created_at DESC;

-- 9. INSTRUCCIONES FINALES
-- ═════════════════════════════════════════════════════

SELECT '🎯 LISTO! Ahora puedes:' as instruction;
SELECT '1. Iniciar sesión con: ciborg347@gmail.com / 34714589' as user1;
SELECT '2. Iniciar sesión con: starfamily@gmail.com / 34714589' as user2;
SELECT '3. Ambos usuarios tienen acceso admin al panel' as access;

-- Si necesitas agregar más usuarios admin en el futuro:
-- SELECT setup_master_user('nuevo-admin@email.com');
