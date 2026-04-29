-- ═════════════════════════════════════════════════════
-- CREAR TABLA PROFILES PARA AUTENTICACIÓN DE ADMIN
-- ═════════════════════════════════════════════════════

-- 1. Crear tabla profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  is_master BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de seguridad
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

-- 4. Crear trigger para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Crear función para asignar permisos de master
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

-- 6. Verificación
SELECT '✅ Tabla profiles configurada exitosamente' as status;
SELECT '📝 Ahora puedes usar: SELECT setup_master_user(''email@example.com'');' as next_step;
