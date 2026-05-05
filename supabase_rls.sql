-- ═════════════════════════════════════════════════════
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ═════════════════════════════════════════════════════
-- Generado: 2026-05-05
-- Versión: v1.0.0

-- =====================================================
-- 1. HABILITAR ROW LEVEL SECURITY
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE restoration_points ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. POLÍTICAS PARA CATEGORIES
-- =====================================================

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Masters can manage categories" ON categories;
DROP POLICY IF EXISTS "Users can insert categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;

-- Política: Lectura pública para todos
CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

-- Política: Gestión completa solo para usuarios maestros
CREATE POLICY "Masters can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 3. POLÍTICAS PARA PRODUCTS
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Public can view active products" ON products;
DROP POLICY IF EXISTS "Masters can manage products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

-- Política: Lectura pública de productos activos y no suspendidos
CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (active = true AND suspended = false);

-- Política: Gestión completa solo para usuarios maestros
CREATE POLICY "Masters can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 4. POLÍTICAS PARA PROFILES
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Masters can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Masters can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Política: Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política: Usuarios maestros pueden ver todos los perfiles
CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_master = true
    )
  );

-- Política: Usuarios pueden actualizar su propio perfil (solo email no master)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = id 
    AND (is_master = false OR is_master IS NULL)
  )
  WITH CHECK (
    auth.uid() = id 
    AND (is_master = false OR is_master IS NULL)
  );

-- Política: Usuarios maestros pueden gestionar perfiles
CREATE POLICY "Masters can manage profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_master = true
    )
  );

-- =====================================================
-- 5. POLÍTICAS PARA PRICE_HISTORY
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Public can view price history" ON price_history;
DROP POLICY IF EXISTS "Masters can insert price history" ON price_history;
DROP POLICY IF EXISTS "Masters can manage price history" ON price_history;

-- Política: Lectura pública para auditoría y transparencia
CREATE POLICY "Public can view price history" ON price_history
  FOR SELECT USING (true);

-- Política: Solo usuarios maestros pueden insertar historial
CREATE POLICY "Masters can insert price history" ON price_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- Política: Solo usuarios maestros pueden gestionar historial
CREATE POLICY "Masters can manage price history" ON price_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 6. POLÍTICAS PARA RESTORATION_POINTS
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Masters can view restoration points" ON restoration_points;
DROP POLICY IF EXISTS "Masters can manage restoration points" ON restoration_points;

-- Política: Solo usuarios maestros pueden ver puntos de restauración
CREATE POLICY "Masters can view restoration points" ON restoration_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- Política: Solo usuarios maestros pueden gestionar puntos de restauración
CREATE POLICY "Masters can manage restoration points" ON restoration_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 7. POLÍTICAS PARA AUTH.USERS (VÍA FUNCIONES)
-- =====================================================

-- Nota: Las operaciones directas sobre auth.users deben realizarse
-- a través de funciones personalizadas ya que es una tabla del sistema

-- Política para permitir que los usuarios vean su propia información de auth
-- Esto es útil para funciones que necesitan acceder a auth.users
CREATE POLICY IF NOT EXISTS "Users can view own auth data" ON auth.users
  FOR SELECT USING (auth.uid() = id);

-- =====================================================
-- 8. POLÍTICAS DE SEGURIDAD ADICIONALES
-- =====================================================

-- Función auxiliar para verificar si un usuario es master
CREATE OR REPLACE FUNCTION check_master_permission()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario puede acceder a un recurso específico
CREATE OR REPLACE FUNCTION can_access_resource(
  resource_table TEXT,
  resource_id UUID,
  required_permission TEXT DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
  is_master BOOLEAN;
  is_owner BOOLEAN;
BEGIN
  -- Verificar si es master
  SELECT check_master_permission() INTO is_master;
  
  -- Si es master, tiene acceso a todo
  IF is_master THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si es el dueño del recurso
  CASE resource_table
    WHEN 'products' THEN
      SELECT EXISTS(
        SELECT 1 FROM products p 
        WHERE p.id = resource_id 
        AND p.created_by = auth.uid()
      ) INTO is_owner;
    WHEN 'categories' THEN
      SELECT EXISTS(
        SELECT 1 FROM categories c 
        WHERE c.id = resource_id 
        AND c.created_by = auth.uid()
      ) INTO is_owner;
    ELSE
      is_owner := FALSE;
  END CASE;
  
  -- Para escritura, debe ser dueño
  IF required_permission IN ('write', 'update', 'delete') THEN
    RETURN is_owner;
  END IF;
  
  -- Para lectura, puede ser público o dueño
  RETURN is_owner OR check_public_access(resource_table, resource_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para verificar acceso público
CREATE OR REPLACE FUNCTION check_public_access(
  resource_table TEXT,
  resource_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  CASE resource_table
    WHEN 'products' THEN
      RETURN EXISTS(
        SELECT 1 FROM products p 
        WHERE p.id = resource_id 
        AND p.active = true 
        AND p.suspended = false
      );
    WHEN 'categories' THEN
      RETURN TRUE; -- Las categorías son públicas
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. POLÍTICAS DE AUDITORÍA
-- =====================================================

-- Crear tabla de auditoría (opcional)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Solo usuarios maestros pueden ver logs de auditoría
CREATE POLICY IF NOT EXISTS "Masters can view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- Solo el sistema puede insertar logs
CREATE POLICY IF NOT EXISTS "System can insert audit log" ON audit_log
  FOR INSERT WITH CHECK (false);

-- =====================================================
-- 10. VERIFICACIÓN DE POLÍTICAS
-- =====================================================

-- Verificar que RLS esté habilitado
DO $$
DECLARE
  table_name TEXT;
  rls_enabled BOOLEAN;
  policies_count INTEGER;
BEGIN
  FOR table_name IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('categories', 'products', 'profiles', 'price_history', 'restoration_points')
  LOOP
    -- Verificar RLS
    SELECT rowsecurity INTO rls_enabled 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = table_name;
    
    -- Contar políticas
    SELECT COUNT(*) INTO policies_count 
    FROM pg_policies 
    WHERE tablename = table_name;
    
    IF rls_enabled THEN
      RAISE NOTICE '✅ RLS habilitado en % (%) políticas', table_name, policies_count;
    ELSE
      RAISE NOTICE '❌ RLS NO habilitado en %', table_name;
    END IF;
  END LOOP;
END $$;

-- Mostrar resumen de políticas configuradas
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
WHERE tablename IN ('categories', 'products', 'profiles', 'price_history', 'restoration_points')
ORDER BY tablename, policyname;

-- =====================================================
-- 11. FUNCIONES DE SEGURIDAD ADICIONALES
-- =====================================================

-- Función para validar permisos antes de operaciones críticas
CREATE OR REPLACE FUNCTION validate_operation(
  operation_type TEXT,
  table_name TEXT,
  record_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  is_master BOOLEAN;
  has_permission BOOLEAN;
BEGIN
  -- Verificar si es master
  SELECT check_master_permission() INTO is_master;
  
  -- Si es master, permitir todo
  IF is_master THEN
    RETURN TRUE;
  END IF;
  
  -- Validar según tipo de operación
  CASE operation_type
    WHEN 'read' THEN
      -- Permitir lectura de datos públicos
      RETURN check_public_access(table_name, record_id);
    
    WHEN 'write' THEN
      -- Solo permitir escritura si es dueño
      RETURN can_access_resource(table_name, record_id, 'write');
    
    WHEN 'admin' THEN
      -- Operaciones administrativas solo para masters
      RETURN FALSE;
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoría automática (opcional)
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en log de auditoría
  INSERT INTO audit_log (
    table_name, 
    operation, 
    user_id, 
    old_values, 
    new_values
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de auditoría (opcional - comentado por defecto)
/*
CREATE TRIGGER audit_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
*/

-- =====================================================
-- 12. INSTRUCCIONES DE USO
-- =====================================================

/*
RESUMEN DE POLÍTICAS CONFIGURADAS:

📋 CATEGORIES:
  ✅ Lectura pública para todos
  ✅ Gestión completa solo para usuarios maestros

📦 PRODUCTS:
  ✅ Lectura pública de productos activos y no suspendidos
  ✅ Gestión completa solo para usuarios maestros

👤 PROFILES:
  ✅ Usuarios pueden ver y editar su propio perfil
  ✅ Usuarios maestros pueden ver y gestionar todos los perfiles
  ✅ Los usuarios no pueden modificar su estatus de master

📊 PRICE_HISTORY:
  ✅ Lectura pública para transparencia
  ✅ Inserción y gestión solo para usuarios maestros

🔄 RESTORATION_POINTS:
  ✅ Acceso completo solo para usuarios maestros

🔒 SEGURIDAD ADICIONAL:
  ✅ Funciones de validación de permisos
  ✅ Sistema de auditoría (opcional)
  ✅ Verificación automática de configuración

PARA PROBAR LAS POLÍTICAS:
1. Crear usuario normal y probar acceso
2. Crear usuario master y probar acceso completo
3. Verificar que usuarios no maestros no puedan acceder a funciones administrativas
4. Comprobar que el público solo vea productos activos
*/

-- ═════════════════════════════════════════════════════
-- FIN DE POLÍTICAS RLS
-- ═════════════════════════════════════════════════════
