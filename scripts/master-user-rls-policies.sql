-- ═════════════════════════════════════════════════════
-- POLÍTICAS RLS PARA CONTROL DE ACCESO DE USUARIOS MAESTROS
-- ═════════════════════════════════════════════════════

-- Este script implementa políticas de seguridad a nivel de base de datos
-- que restringen el acceso a operaciones críticas solo a usuarios maestros

-- 1. FUNCIÓN AUXILIAR PARA VERIFICAR USUARIO MAESTRO
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_master_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. POLÍTICAS PARA TABLA PROFILES (GESTIÓN DE USUARIOS)
-- ═════════════════════════════════════════════════════

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Masters can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Masters can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Masters can update profiles" ON profiles;
DROP POLICY IF EXISTS "Masters can delete profiles" ON profiles;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política: Los usuarios maestros pueden ver todos los perfiles
CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT USING (check_master_user());

-- Política: SOLO usuarios maestros pueden insertar perfiles
CREATE POLICY "Masters can insert profiles" ON profiles
  FOR INSERT WITH CHECK (check_master_user());

-- Política: SOLO usuarios maestros pueden actualizar perfiles
CREATE POLICY "Masters can update profiles" ON profiles
  FOR UPDATE USING (check_master_user());

-- Política: SOLO usuarios maestros pueden eliminar perfiles
CREATE POLICY "Masters can delete profiles" ON profiles
  FOR DELETE USING (check_master_user());

-- 3. POLÍTICAS PARA TABLA PRODUCTS (GESTIÓN DE PRODUCTOS)
-- ═════════════════════════════════════════════════════

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Public read active products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert" ON products;
DROP POLICY IF EXISTS "Authenticated users can update" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete" ON products;

-- Política: Lectura pública de productos activos
CREATE POLICY "Public read active products" ON products
  FOR SELECT USING (active = true);

-- Política: SOLO usuarios maestros pueden insertar productos
CREATE POLICY "Masters can insert products" ON products
  FOR INSERT WITH CHECK (check_master_user());

-- Política: SOLO usuarios maestros pueden actualizar productos
CREATE POLICY "Masters can update products" ON products
  FOR UPDATE USING (check_master_user());

-- Política: SOLO usuarios maestros pueden eliminar productos
CREATE POLICY "Masters can delete products" ON products
  FOR DELETE USING (check_master_user());

-- 4. FUNCIONES PARA GESTIÓN SEGURA DE USUARIOS
-- ═════════════════════════════════════════════════════

-- Función para crear un nuevo usuario con perfil (solo masters)
CREATE OR REPLACE FUNCTION create_user_with_profile(
  p_email TEXT,
  p_password TEXT,
  p_is_master BOOLEAN DEFAULT false,
  p_role TEXT DEFAULT 'user'
)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Verificar que el usuario actual es un master
  IF NOT check_master_user() THEN
    RAISE EXCEPTION 'Acceso denegado: Solo los usuarios maestros pueden crear usuarios';
  END IF;
  
  -- Nota: La creación real del usuario debe hacerse desde el frontend
  -- con supabase.auth.signUp(). Esta función es un placeholder.
  
  result := 'Para crear usuarios, use supabase.auth.signUp() desde el frontend. ' ||
            'Luego ejecute setup_master_user() si necesita asignar permisos de master.';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar un usuario (solo masters)
CREATE OR REPLACE FUNCTION delete_user_profile(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar que el usuario actual es un master
  IF NOT check_master_user() THEN
    RAISE EXCEPTION 'Acceso denegado: Solo los usuarios maestros pueden eliminar usuarios';
  END IF;
  
  -- Eliminar el perfil
  DELETE FROM profiles WHERE id = p_user_id;
  
  -- Nota: La eliminación del usuario de auth.users debe hacerse
  -- desde el dashboard de Supabase o con el admin API
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VISTAS PARA FACILITAR LA GESTIÓN
-- ═════════════════════════════════════════════════════

-- Vista para que los masters vean todos los usuarios
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

-- Política para la vista (solo masters pueden verla)
DROP POLICY IF EXISTS "Masters can view users" ON master_users_view;
CREATE POLICY "Masters can view users" ON master_users_view
  FOR ALL USING (check_master_user());

-- 6. VERIFICACIÓN DE CONFIGURACIÓN
-- ═════════════════════════════════════════════════════

-- Verificar todas las políticas RLS configuradas
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
WHERE tablename IN ('profiles', 'products')
ORDER BY tablename, policyname;

-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'products');

-- 7. PRUEBAS DE SEGURIDAD
-- ═════════════════════════════════════════════════════

-- Consulta para probar si el usuario actual es master
SELECT 
  auth.uid() as current_user_id,
  check_master_user() as is_master,
  (SELECT email FROM profiles WHERE id = auth.uid()) as user_email;

-- Verificar usuarios masters configurados
SELECT 
  p.id,
  p.email,
  p.is_master,
  p.role,
  p.created_at
FROM profiles p
WHERE p.is_master = true;

-- ═════════════════════════════════════════════════════
-- INSTRUCCIONES IMPORTANTES
-- ═════════════════════════════════════════════════════

/*
1. EJECUTAR ESTE SCRIPT DESPUÉS de crear la tabla profiles
2. ASEGURARSE de que los usuarios maestros estén configurados
3. PROBAR las políticas desde el frontend
4. MONITOREAR los logs de Supabase para detectar accesos no autorizados

RESTRICCIONES IMPLEMENTADAS:
- Solo usuarios maestros pueden INSERT/UPDATE/DELETE en profiles
- Solo usuarios maestros pueden INSERT/UPDATE/DELETE en products  
- Los usuarios normales solo pueden leer su propio perfil
- Lectura pública solo de productos activos
- Todas las restricciones son a nivel de base de datos (RLS)
*/
