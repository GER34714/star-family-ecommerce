-- ═════════════════════════════════════════════════════
-- RESET COMPLETO DE ACCESO ADMIN Y CONEXIÓN SUPABASE
-- ═════════════════════════════════════════════════════

-- 1. Limpiar completamente tabla profiles si existe
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Recrear tabla profiles desde cero
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  is_master BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad limpias
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

-- 5. Recrear trigger para nuevos usuarios
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Recrear función para asignar permisos de master
DROP FUNCTION IF EXISTS setup_master_user(TEXT);
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
    RETURN 'ERROR: Usuario no encontrado en auth.users';
  END IF;
  
  -- Verificar si el perfil ya existe
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
  
  IF profile_exists THEN
    -- Actualizar perfil existente
    UPDATE profiles 
    SET is_master = true, role = 'master', updated_at = NOW()
    WHERE id = user_id;
    RETURN 'Usuario actualizado como master: ' || p_email;
  ELSE
    -- Crear nuevo perfil
    INSERT INTO profiles (id, email, is_master, role)
    VALUES (user_id, p_email, true, 'master');
    RETURN 'Usuario creado como master: ' || p_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Verificación final
SELECT '✅ Reset completo de acceso admin finalizado' as status;
SELECT '📝 Para asignar permisos de master ejecuta:' as instruction;
SELECT 'SELECT setup_master_user(''tu-email@example.com'');' as example;

-- 8. Mostrar estado actual de las políticas
SELECT 
  'POLICIES ACTUALES:' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';
