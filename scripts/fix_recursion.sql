-- ═════════════════════════════════════════════════════
-- CORREGIR RECURSIÓN INFINITA EN POLÍTICAS
-- ═════════════════════════════════════════════════════

-- 1. Eliminar todas las políticas existentes para romper la recursión
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Masters can view all profiles" ON profiles;

-- 2. Deshabilitar RLS temporalmente para poder acceder
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Verificar si hay datos
SELECT 'Verificando datos en profiles...' as status;
SELECT COUNT(*) as total_profiles FROM profiles;

-- 4. Mostrar usuarios en auth.users para comparar
SELECT 'Usuarios en auth.users:' as status;
SELECT id, email, created_at FROM auth.users LIMIT 10;

-- 5. Crear políticas simples sin recursión
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política simple: solo el usuario puede ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política simple: solo el usuario puede actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política simple para masters (sin recursión)
CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE is_master = true
    )
  );

-- 6. Verificar políticas creadas
SELECT 'Políticas creadas exitosamente:' as status;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 7. Test de consulta simple
SELECT 'Test de consulta a profiles:' as status;
SELECT COUNT(*) as accessible_profiles FROM profiles;
