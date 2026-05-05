-- ═════════════════════════════════════════════════════
-- SUPABASE SCHEMA COMPLETO - STAR FAMILY E-COMMERCE
-- ═════════════════════════════════════════════════════
-- Generado: 2026-05-05
-- Versión: v1.0.0

-- =====================================================
-- 1. CREAR EXTENSIONES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. CREAR TIPOS ENUM
-- =====================================================
-- No se utilizan enums personalizados para mayor flexibilidad
-- Se usan TEXT con CHECK constraints

-- =====================================================
-- 3. CREAR TABLAS
-- =====================================================

-- CATEGORÍAS
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '',
  color TEXT DEFAULT '#C41E3A',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCTOS
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  bulk_info TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  custom_badge TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_master BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'master')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HISTORIAL DE PRECIOS
CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category_name TEXT,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) GENERATED ALWAYS AS (new_price - old_price) STORED,
  percentage_change DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN old_price > 0 THEN ((new_price - old_price) / old_price * 100) ELSE 0 END) STORED,
  changed_by TEXT NOT NULL,
  type TEXT DEFAULT 'individual' CHECK (type IN ('individual', 'bulk')),
  adjustment_type TEXT CHECK (adjustment_type IN ('percentage', 'fixed')),
  adjustment_value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PUNTOS DE RESTAURACIÓN
CREATE TABLE IF NOT EXISTS restoration_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  snapshot JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CREAR ÍNDICES
-- =====================================================

-- Índices para categories
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(created_at);

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_suspended ON products(suspended);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(active, category_id);
CREATE INDEX IF NOT EXISTS idx_products_name_active ON products(name, active) WHERE active = true AND suspended = false;

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_is_master ON profiles(is_master);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Índices para price_history
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON price_history(created_at);
CREATE INDEX IF NOT EXISTS idx_price_history_product_created ON price_history(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_price_history_type ON price_history(type);

-- Índices para restoration_points
CREATE INDEX IF NOT EXISTS idx_restoration_points_created_at ON restoration_points(created_at);
CREATE INDEX IF NOT EXISTS idx_restoration_points_created_by ON restoration_points(created_by);

-- =====================================================
-- 5. CREAR VISTAS
-- =====================================================

-- Vista para gestión de usuarios maestros
CREATE OR REPLACE VIEW master_users_view AS
SELECT 
  p.id,
  p.email,
  p.is_master,
  p.role,
  p.created_at as user_created_at,
  a.created_at as auth_created_at,
  a.last_sign_in_at,
  a.updated_at as auth_updated_at,
  p.updated_at as profile_updated_at
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
ORDER BY p.created_at DESC;

-- Vista para productos con categorías
CREATE OR REPLACE VIEW products_with_categories AS
SELECT 
  p.*,
  c.name as category_name,
  c.emoji as category_emoji,
  c.color as category_color
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.active = true AND p.suspended = false;

-- Vista para estadísticas de precios
CREATE OR REPLACE VIEW price_statistics AS
SELECT 
  ph.product_id,
  ph.product_name,
  ph.category_name,
  COUNT(*) as price_changes,
  MAX(ph.created_at) as last_change,
  MIN(ph.old_price) as min_price,
  MAX(ph.new_price) as max_price,
  AVG(ph.new_price) as avg_price
FROM price_history ph
GROUP BY ph.product_id, ph.product_name, ph.category_name;

-- =====================================================
-- 6. CREAR FUNCIONES
-- =====================================================

-- Función para actualizar timestamps automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si es usuario master
CREATE OR REPLACE FUNCTION is_master_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para configurar usuario master
CREATE OR REPLACE FUNCTION setup_master_user(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Obtener el ID del usuario desde auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF user_id IS NULL THEN
    RETURN 'Usuario no encontrado';
  END IF;
  
  -- Actualizar o insertar en profiles
  INSERT INTO profiles (id, email, is_master, role)
  VALUES (user_id, p_email, true, 'master')
  ON CONFLICT (id) 
  DO UPDATE SET 
    is_master = true, 
    role = 'master',
    updated_at = NOW();
  
  RETURN 'Usuario configurado como master exitosamente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear punto de restauración
CREATE OR REPLACE FUNCTION create_restoration_point(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_snapshot JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  point_id UUID;
BEGIN
  -- Verificar que el usuario es master
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  ) THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden crear puntos de restauración';
  END IF;
  
  -- Crear punto de restauración
  INSERT INTO restoration_points (name, description, snapshot, created_by)
  VALUES (p_name, p_description, p_snapshot, auth.uid())
  RETURNING id INTO point_id;
  
  RETURN point_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar cambio de precio
CREATE OR REPLACE FUNCTION log_price_change(
  p_product_id UUID,
  p_product_name TEXT,
  p_category_name TEXT DEFAULT NULL,
  p_old_price DECIMAL(10,2),
  p_new_price DECIMAL(10,2),
  p_type TEXT DEFAULT 'individual',
  p_adjustment_type TEXT DEFAULT NULL,
  p_adjustment_value DECIMAL(10,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  history_id UUID;
BEGIN
  -- Verificar que el usuario es master
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  ) THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden registrar cambios de precio';
  END IF;
  
  -- Insertar en historial
  INSERT INTO price_history (
    product_id, product_name, category_name, old_price, new_price,
    changed_by, type, adjustment_type, adjustment_value
  )
  VALUES (
    p_product_id, p_product_name, p_category_name, p_old_price, p_new_price,
    auth.jwt() ->> 'email', p_type, p_adjustment_type, p_adjustment_value
  )
  RETURNING id INTO history_id;
  
  RETURN history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CREAR TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at en categories
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en products
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en profiles
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para registrar cambios de precio automáticamente
CREATE OR REPLACE FUNCTION log_price_change_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si el precio cambió
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    PERFORM log_price_change(
      NEW.id,
      NEW.name,
      (SELECT name FROM categories WHERE id = NEW.category_id),
      OLD.price,
      NEW.price,
      'individual'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_price_change_log
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price)
  EXECUTE FUNCTION log_price_change_trigger();

-- =====================================================
-- 8. INSERTAR DATOS INICIALES
-- =====================================================

-- Categorías base
INSERT INTO categories (name, emoji, color) VALUES
  ('Frescos', '🌭', '#E53E3E'),
  ('Completos', '🌭', '#DD6B20'),
  ('Panchos Armados', '🌭', '#D97706'),
  ('Hamburguesas', '🍔', '#7C3AED'),
  ('Pizzas y Empanadas', '🍕', '#2563EB'),
  ('Medialunas y Chipas', '🥐', '#059669'),
  ('Combos', '📦', '#C41E3A'),
  ('Helados', '🍦', '#06B6D4'),
  ('Congelados', '❄️', '#3B82F6')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 9. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todas las tablas fueron creadas
DO $$
DECLARE
  table_count INTEGER;
  expected_tables TEXT[] := ARRAY['categories', 'products', 'profiles', 'price_history', 'restoration_points'];
  found_tables TEXT[] := '{}';
  table_name TEXT;
BEGIN
  FOR table_name IN SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = ANY(expected_tables)
  LOOP
    found_tables := array_append(found_tables, table_name);
  END LOOP;
  
  table_count := array_length(found_tables, 1);
  
  IF table_count = array_length(expected_tables, 1) THEN
    RAISE NOTICE '✅ Schema creado exitosamente. Tablas: %', array_to_string(found_tables, ', ');
  ELSE
    RAISE NOTICE '⚠️ Faltan tablas. Creadas: %', array_to_string(found_tables, ', ');
  END IF;
END $$;

-- Mostrar resumen final
SELECT 
  'Schema Star Family E-commerce' as project,
  'v1.0.0' as version,
  '2026-05-05' as created_at,
  (SELECT COUNT(*) FROM categories) as categories_count,
  (SELECT COUNT(*) FROM products) as products_count,
  (SELECT COUNT(*) FROM profiles) as profiles_count;

-- ═════════════════════════════════════════════════════
-- FIN DEL SCHEMA
-- ═════════════════════════════════════════════════════
