-- ═════════════════════════════════════════════════════
-- INSERCIÓN DE USUARIOS MAESTROS INICIALES
-- ═════════════════════════════════════════════════════

-- IMPORTANTE: Este script debe ejecutarse DESPUÉS de crear los usuarios
-- a través del frontend con supabase.auth.signUp() o desde el dashboard
-- de Supabase.

-- Los usuarios deben ser creados primero en auth.users y luego se les
-- asignará el perfil de master aquí.

-- 1. FUNCIÓN PARA ASIGNAR PERMISOS DE MASTER A USUARIOS EXISTENTES
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION assign_master_permissions(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Obtener el ID del usuario desde auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario con email % no encontrado en auth.users', p_email;
  END IF;
  
  -- Insertar o actualizar el perfil con permisos de master
  INSERT INTO profiles (id, email, is_master, role)
  VALUES (user_id, p_email, true, 'master')
  ON CONFLICT (id) 
  DO UPDATE SET 
    is_master = true,
    role = 'master',
    updated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ASIGNAR PERMISOS DE MASTER A LOS USUARIOS ESPECIFICADOS
-- ═════════════════════════════════════════════════════

-- NOTA: Descomenta y ejecuta estas líneas DESPUÉS de que los usuarios
-- hayan sido creados en auth.users

-- Para el usuario ciborg347@gmail.com
-- SELECT assign_master_permissions('ciborg347@gmail.com');

-- Para el usuario starfamily@gmail.com
-- SELECT assign_master_permissions('starfamily@gmail.com');

-- 3. VERIFICACIÓN DE USUARIOS MASTERS
-- ═════════════════════════════════════════════════════

-- Consulta para verificar los usuarios maestros actuales
SELECT 
  p.id,
  p.email,
  p.is_master,
  p.role,
  p.created_at,
  u.email as auth_email,
  u.created_at as user_created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_master = true;

-- 4. FUNCIÓN PARA CREAR USUARIO MASTER COMPLETO
-- ═════════════════════════════════════════════════════

-- Esta función simula la creación completa pero requiere que el usuario
-- sea creado primero en auth.users

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

-- 5. INSTRUCCIONES DE EJECUCIÓN
-- ═════════════════════════════════════════════════════

/*
PASO 1: Crear los usuarios en auth.users
----------------------------------------
Desde el frontend o dashboard de Supabase, crear los usuarios:

1. ciborg347@gmail.com / Pass: 34714589
2. starfamily@gmail.com / Pass: 34714589

PASO 2: Asignar permisos de master
----------------------------------
Ejecutar las siguientes consultas:

SELECT setup_master_user('ciborg347@gmail.com');
SELECT setup_master_user('starfamily@gmail.com');

PASO 3: Verificar
------------------
Ejecutar la consulta de verificación para confirmar que los usuarios
tienen permisos de master.

*/

-- Consulta de ejemplo para verificar después de la configuración
-- SELECT setup_master_user('ciborg347@gmail.com');
-- SELECT setup_master_user('starfamily@gmail.com');
