-- ═════════════════════════════════════════════════════
-- CORREGIR POLÍTICAS DUPLICADAS
-- ═════════════════════════════════════════════════════

-- Eliminar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Masters can view all profiles" ON profiles;

-- Recrear políticas
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

-- Verificar estado actual
SELECT '✅ Políticas corregidas exitosamente' as status;

-- Mostrar políticas actuales
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
