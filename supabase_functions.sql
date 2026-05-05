-- ═════════════════════════════════════════════════════
-- SUPABASE FUNCTIONS AND TRIGGERS
-- ═════════════════════════════════════════════════════
-- Generado: 2026-05-05
-- Versión: v1.0.0

-- =====================================================
-- 1. FUNCIONES DE UTILIDAD GENERAL
-- =====================================================

-- Función para actualizar timestamps automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar UUID aleatorio
CREATE OR REPLACE FUNCTION generate_uuid()
RETURNS UUID AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- Función para normalizar texto (quitar espacios, mayúsculas)
CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(LOWER(input_text));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. FUNCIONES DE VERIFICACIÓN DE PERMISOS
-- =====================================================

-- Función principal para verificar si es usuario master
CREATE OR REPLACE FUNCTION is_master_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario actual puede gestionar productos
CREATE OR REPLACE FUNCTION can_manage_products()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_master_user();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario actual puede gestionar categorías
CREATE OR REPLACE FUNCTION can_manage_categories()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_master_user();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el email del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email 
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_email, 'unknown');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FUNCIONES DE GESTIÓN DE USUARIOS
-- =====================================================

-- Función para configurar usuario master
CREATE OR REPLACE FUNCTION setup_master_user(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
  profile_count INTEGER;
BEGIN
  -- Validar email
  IF p_email IS NULL OR p_email = '' THEN
    RETURN 'Email inválido';
  END IF;
  
  -- Obtener el ID del usuario desde auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF user_id IS NULL THEN
    RETURN 'Usuario no encontrado en auth.users';
  END IF;
  
  -- Verificar si ya existe el perfil
  SELECT COUNT(*) INTO profile_count
  FROM profiles 
  WHERE id = user_id;
  
  -- Actualizar o insertar en profiles
  IF profile_count > 0 THEN
    UPDATE profiles 
    SET is_master = true, 
        role = 'master',
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN 'Usuario actualizado a master exitosamente';
  ELSE
    INSERT INTO profiles (id, email, is_master, role)
    VALUES (user_id, p_email, true, 'master');
    
    RETURN 'Usuario configurado como master exitosamente';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear nuevo usuario (solo para masters)
CREATE OR REPLACE FUNCTION create_user_account(
  p_email TEXT,
  p_password TEXT,
  p_is_master BOOLEAN DEFAULT false,
  p_role TEXT DEFAULT 'user'
)
RETURNS TEXT AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RETURN 'Solo los usuarios maestros pueden crear nuevos usuarios';
  END IF;
  
  -- Validar parámetros
  IF p_email IS NULL OR p_email = '' THEN
    RETURN 'Email es requerido';
  END IF;
  
  IF p_password IS NULL OR p_password = '' THEN
    RETURN 'Contraseña es requerida';
  END IF;
  
  -- Validar rol
  IF p_role NOT IN ('user', 'admin', 'master') THEN
    RETURN 'Rol inválido. Use: user, admin, master';
  END IF;
  
  -- Solo masters pueden crear otros masters
  IF p_is_master AND NOT is_master_user() THEN
    RETURN 'Solo los usuarios maestros pueden crear usuarios maestros';
  END IF;
  
  -- La creación real del usuario debe hacerse desde el frontend
  -- con supabase.auth.signUp(), esta función solo valida permisos
  
  RETURN 'Use supabase.auth.signUp() desde el frontend. Esta función validará los permisos automáticamente.';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener todos los usuarios (solo para masters)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  is_master BOOLEAN,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden ver todos los usuarios';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.is_master,
    p.role,
    p.created_at,
    a.last_sign_in_at
  FROM profiles p
  LEFT JOIN auth.users a ON p.id = a.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCIONES DE GESTIÓN DE PRODUCTOS
-- =====================================================

-- Función para crear producto con validación
CREATE OR REPLACE FUNCTION create_product_with_validation(
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_price DECIMAL(10,2),
  p_bulk_info TEXT DEFAULT '',
  p_image_url TEXT DEFAULT '',
  p_category_id UUID DEFAULT NULL,
  p_custom_badge TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  new_product_id UUID;
  category_exists BOOLEAN;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden crear productos';
  END IF;
  
  -- Validar parámetros
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'El nombre del producto es requerido';
  END IF;
  
  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'El precio debe ser un valor positivo';
  END IF;
  
  -- Verificar que la categoría existe si se proporciona
  IF p_category_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM categories WHERE id = p_category_id
    ) INTO category_exists;
    
    IF NOT category_exists THEN
      RAISE EXCEPTION 'La categoría especificada no existe';
    END IF;
  END IF;
  
  -- Crear producto
  INSERT INTO products (
    name, description, price, bulk_info, image_url, 
    category_id, custom_badge, created_by
  )
  VALUES (
    p_name, p_description, p_price, p_bulk_info, p_image_url,
    p_category_id, p_custom_badge, auth.uid()
  )
  RETURNING id INTO new_product_id;
  
  RETURN new_product_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando producto: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar producto con validación
CREATE OR REPLACE FUNCTION update_product_with_validation(
  p_product_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_price DECIMAL(10,2) DEFAULT NULL,
  p_bulk_info TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_custom_badge TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL,
  p_suspended BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  old_price DECIMAL(10,2);
  old_name TEXT;
  category_name TEXT;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden actualizar productos';
  END IF;
  
  -- Verificar que el producto existe
  IF NOT EXISTS(SELECT 1 FROM products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'El producto no existe';
  END IF;
  
  -- Obtener valores antiguos para historial
  SELECT price, name INTO old_price, old_name
  FROM products 
  WHERE id = p_product_id;
  
  -- Obtener nombre de la categoría si se actualiza
  IF p_category_id IS NOT NULL THEN
    SELECT name INTO category_name
    FROM categories 
    WHERE id = p_category_id;
  END IF;
  
  -- Actualizar producto solo con los campos proporcionados
  UPDATE products SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price = COALESCE(p_price, price),
    bulk_info = COALESCE(p_bulk_info, bulk_info),
    image_url = COALESCE(p_image_url, image_url),
    category_id = COALESCE(p_category_id, category_id),
    custom_badge = COALESCE(p_custom_badge, custom_badge),
    active = COALESCE(p_active, active),
    suspended = COALESCE(p_suspended, suspended),
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Si el precio cambió, registrar en historial
  IF p_price IS NOT NULL AND p_price != old_price THEN
    PERFORM log_price_change(
      p_product_id,
      COALESCE(p_name, old_name),
      category_name,
      old_price,
      p_price,
      'individual'
    );
  END IF;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error actualizando producto: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar producto con validación
CREATE OR REPLACE FUNCTION delete_product_with_validation(p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden eliminar productos';
  END IF;
  
  -- Verificar que el producto existe
  IF NOT EXISTS(SELECT 1 FROM products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'El producto no existe';
  END IF;
  
  -- Eliminar producto (el CASCADE eliminará el historial de precios)
  DELETE FROM products WHERE id = p_product_id;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error eliminando producto: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNCIONES DE GESTIÓN DE CATEGORÍAS
-- =====================================================

-- Función para crear categoría con validación
CREATE OR REPLACE FUNCTION create_category_with_validation(
  p_name TEXT,
  p_emoji TEXT DEFAULT '',
  p_color TEXT DEFAULT '#C41E3A'
)
RETURNS UUID AS $$
DECLARE
  new_category_id UUID;
  normalized_name TEXT;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden crear categorías';
  END IF;
  
  -- Validar parámetros
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'El nombre de la categoría es requerido';
  END IF;
  
  -- Normalizar nombre
  normalized_name := TRIM(p_name);
  
  -- Verificar que no exista una categoría con el mismo nombre
  IF EXISTS(SELECT 1 FROM categories WHERE name = normalized_name) THEN
    RAISE EXCEPTION 'Ya existe una categoría con ese nombre';
  END IF;
  
  -- Crear categoría
  INSERT INTO categories (name, emoji, color, created_by)
  VALUES (normalized_name, p_emoji, p_color, auth.uid())
  RETURNING id INTO new_category_id;
  
  RETURN new_category_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando categoría: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener categorías públicas
CREATE OR REPLACE FUNCTION get_public_categories()
RETURNS TABLE (
  id UUID,
  name TEXT,
  emoji TEXT,
  color TEXT,
  products_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.emoji,
    c.color,
    COUNT(p.id) as products_count
  FROM categories c
  LEFT JOIN products p ON c.id = p.category_id AND p.active = true AND p.suspended = false
  GROUP BY c.id, c.name, c.emoji, c.color
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNCIONES DE HISTORIAL DE PRECIOS
-- =====================================================

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
  user_email TEXT;
BEGIN
  -- Obtener email del usuario actual
  user_email := get_current_user_email();
  
  -- Insertar en historial
  INSERT INTO price_history (
    product_id, product_name, category_name, old_price, new_price,
    changed_by, type, adjustment_type, adjustment_value
  )
  VALUES (
    p_product_id, p_product_name, p_category_name, p_old_price, p_new_price,
    user_email, p_type, p_adjustment_type, p_adjustment_value
  )
  RETURNING id INTO history_id;
  
  RETURN history_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error registrando cambio de precio: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar precios masivamente
CREATE OR REPLACE FUNCTION bulk_update_prices(
  p_product_ids UUID[],
  p_adjustment_type TEXT,
  p_adjustment_value DECIMAL(10,2),
  p_category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  difference DECIMAL(10,2),
  percentage_change DECIMAL(5,2)
) AS $$
DECLARE
  product_record RECORD;
  new_price DECIMAL(10,2);
  category_name TEXT;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden actualizar precios masivamente';
  END IF;
  
  -- Validar tipo de ajuste
  IF p_adjustment_type NOT IN ('percentage', 'fixed') THEN
    RAISE EXCEPTION 'Tipo de ajuste inválido. Use: percentage o fixed';
  END IF;
  
  -- Procesar cada producto
  FOR product_record IN 
    SELECT p.id, p.name, p.price, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ANY(p_product_ids)
    AND (p_category_filter IS NULL OR c.name = p_category_filter)
  LOOP
    -- Calcular nuevo precio
    IF p_adjustment_type = 'percentage' THEN
      new_price := product_record.price + (product_record.price * p_adjustment_value / 100);
    ELSE -- fixed
      new_price := product_record.price + p_adjustment_value;
    END IF;
    
    -- Asegurar que el precio no sea negativo
    new_price := GREATEST(new_price, 0);
    
    -- Actualizar producto
    UPDATE products 
    SET price = new_price, updated_at = NOW()
    WHERE id = product_record.id;
    
    -- Registrar en historial
    PERFORM log_price_change(
      product_record.id,
      product_record.name,
      product_record.category_name,
      product_record.price,
      new_price,
      'bulk',
      p_adjustment_type,
      p_adjustment_value
    );
    
    -- Retornar resultado
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCIONES DE BACKUP Y RESTAURACIÓN
-- =====================================================

-- Función para crear punto de restauración
CREATE OR REPLACE FUNCTION create_restoration_point(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  point_id UUID;
  snapshot JSONB;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden crear puntos de restauración';
  END IF;
  
  -- Crear snapshot con productos y historial de precios
  snapshot := jsonb_build_object(
    'products', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'description', description,
          'price', price,
          'bulk_info', bulk_info,
          'image_url', image_url,
          'category_id', category_id,
          'custom_badge', custom_badge,
          'active', active,
          'suspended', suspended,
          'created_at', created_at
        )
      )
      FROM products
    ),
    'price_history', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'product_id', product_id,
          'product_name', product_name,
          'old_price', old_price,
          'new_price', new_price,
          'changed_by', changed_by,
          'type', type,
          'created_at', created_at
        )
      )
      FROM price_history
    ),
    'categories', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'emoji', emoji,
          'color', color
        )
      )
      FROM categories
    ),
    'created_at', NOW(),
    'created_by', get_current_user_email()
  );
  
  -- Crear punto de restauración
  INSERT INTO restoration_points (name, description, snapshot, created_by)
  VALUES (p_name, p_description, snapshot, auth.uid())
  RETURNING id INTO point_id;
  
  RETURN point_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando punto de restauración: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para restaurar desde punto
CREATE OR REPLACE FUNCTION restore_from_point(p_point_id UUID)
RETURNS TEXT AS $$
DECLARE
  snapshot JSONB;
  products_data JSONB;
  price_history_data JSONB;
  categories_data JSONB;
  restored_count INTEGER := 0;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden restaurar desde puntos';
  END IF;
  
  -- Obtener snapshot
  SELECT snapshot INTO snapshot
  FROM restoration_points 
  WHERE id = p_point_id;
  
  IF snapshot IS NULL THEN
    RAISE EXCEPTION 'Punto de restauración no encontrado';
  END IF;
  
  -- Extraer datos
  products_data := snapshot -> 'products';
  price_history_data := snapshot -> 'price_history';
  categories_data := snapshot -> 'categories';
  
  -- Restaurar categorías
  IF categories_data IS NOT NULL THEN
    DELETE FROM categories;
    INSERT INTO categories (id, name, emoji, color, created_at)
    SELECT 
      (value ->> 'id')::UUID,
      value ->> 'name',
      value ->> 'emoji',
      value ->> 'color',
      (value ->> 'created_at')::TIMESTAMPTZ
    FROM jsonb_array_elements(categories_data);
  END IF;
  
  -- Restaurar productos
  IF products_data IS NOT NULL THEN
    DELETE FROM products;
    INSERT INTO products (
      id, name, description, price, bulk_info, image_url,
      category_id, custom_badge, active, suspended, created_at
    )
    SELECT 
      (value ->> 'id')::UUID,
      value ->> 'name',
      value ->> 'description',
      (value ->> 'price')::DECIMAL(10,2),
      value ->> 'bulk_info',
      value ->> 'image_url',
      (value ->> 'category_id')::UUID,
      value ->> 'custom_badge',
      (value ->> 'active')::BOOLEAN,
      (value ->> 'suspended')::BOOLEAN,
      (value ->> 'created_at')::TIMESTAMPTZ
    FROM jsonb_array_elements(products_data);
    
    GET DIAGNOSTICS restored_count = ROW_COUNT;
  END IF;
  
  -- Restaurar historial de precios
  IF price_history_data IS NOT NULL THEN
    DELETE FROM price_history;
    INSERT INTO price_history (
      id, product_id, product_name, old_price, new_price,
      changed_by, type, created_at
    )
    SELECT 
      (value ->> 'id')::UUID,
      (value ->> 'product_id')::UUID,
      value ->> 'product_name',
      (value ->> 'old_price')::DECIMAL(10,2),
      (value ->> 'new_price')::DECIMAL(10,2),
      value ->> 'changed_by',
      value ->> 'type',
      (value ->> 'created_at')::TIMESTAMPTZ
    FROM jsonb_array_elements(price_history_data);
  END IF;
  
  RETURN FORMAT('Restauración completada. % productos restaurados.', restored_count);
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error restaurando desde punto: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCIONES DE BÚSQUEDA Y FILTRADO
-- =====================================================

-- Función para buscar productos con filtros avanzados
CREATE OR REPLACE FUNCTION search_products(
  p_search_term TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_min_price DECIMAL(10,2) DEFAULT NULL,
  p_max_price DECIMAL(10,2) DEFAULT NULL,
  p_active_only BOOLEAN DEFAULT true,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price DECIMAL(10,2),
  bulk_info TEXT,
  image_url TEXT,
  custom_badge TEXT,
  category_id UUID,
  category_name TEXT,
  category_emoji TEXT,
  category_color TEXT,
  active BOOLEAN,
  suspended BOOLEAN,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.bulk_info,
    p.image_url,
    p.custom_badge,
    p.category_id,
    c.name as category_name,
    c.emoji as category_emoji,
    c.color as category_color,
    p.active,
    p.suspended,
    p.created_at,
    -- Ranking para búsqueda de texto
    CASE 
      WHEN p_search_term IS NOT NULL THEN
        CASE
          WHEN LOWER(p.name) LIKE LOWER(p_search_term) || '%' THEN 1.0
          WHEN LOWER(p.name) LIKE '%' || LOWER(p_search_term) || '%' THEN 0.8
          WHEN LOWER(p.description) LIKE '%' || LOWER(p_search_term) || '%' THEN 0.6
          ELSE 0.0
        END
      ELSE 1.0
    END as rank
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE 
    -- Filtro por término de búsqueda
    (p_search_term IS NULL OR 
     LOWER(p.name) LIKE '%' || LOWER(p_search_term) || '%' OR
     LOWER(p.description) LIKE '%' || LOWER(p_search_term) || '%')
    -- Filtro por categoría
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    -- Filtro por precio mínimo
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    -- Filtro por precio máximo
    AND (p_max_price IS NULL OR p.price <= p_max_price)
    -- Filtro por activos
    AND (NOT p_active_only OR (p.active = true AND p.suspended = false))
  ORDER BY 
    rank DESC,
    p.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Trigger para registrar cambios de precio automáticamente
CREATE OR REPLACE FUNCTION log_price_change_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si el precio cambió y no es un nuevo registro
  IF TG_OP = 'UPDATE' AND OLD.price IS DISTINCT FROM NEW.price THEN
    PERFORM log_price_change(
      NEW.id,
      NEW.name,
      (SELECT name FROM categories WHERE id = NEW.category_id),
      OLD.price,
      NEW.price,
      'individual'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER products_price_change_log
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price)
  EXECUTE FUNCTION log_price_change_trigger();

-- Trigger para timestamps
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. FUNCIONES DE ESTADÍSTICAS Y REPORTES
-- =====================================================

-- Función para obtener estadísticas del catálogo
CREATE OR REPLACE FUNCTION get_catalog_statistics()
RETURNS TABLE (
  metric_name TEXT,
  metric_value BIGINT,
  metric_details JSONB
) AS $$
BEGIN
  -- Total de productos
  RETURN QUERY SELECT 'total_products'::TEXT, COUNT(*)::BIGINT, NULL::JSONB FROM products;
  
  -- Productos activos
  RETURN QUERY SELECT 'active_products'::TEXT, COUNT(*)::BIGINT, NULL::JSONB 
  FROM products WHERE active = true AND suspended = false;
  
  -- Productos suspendidos
  RETURN QUERY SELECT 'suspended_products'::TEXT, COUNT(*)::BIGINT, NULL::JSONB 
  FROM products WHERE suspended = true;
  
  -- Total de categorías
  RETURN QUERY SELECT 'total_categories'::TEXT, COUNT(*)::BIGINT, NULL::JSONB FROM categories;
  
  -- Cambios de precio hoy
  RETURN QUERY SELECT 'price_changes_today'::TEXT, COUNT(*)::BIGINT, NULL::JSONB 
  FROM price_history WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Puntos de restauración
  RETURN QUERY SELECT 'restoration_points'::TEXT, COUNT(*)::BIGINT, NULL::JSONB 
  FROM restoration_points;
  
  -- Usuarios maestros
  RETURN QUERY SELECT 'master_users'::TEXT, COUNT(*)::BIGINT, NULL::JSONB 
  FROM profiles WHERE is_master = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener productos más vendidos (simulado)
CREATE OR REPLACE FUNCTION get_top_products(
  p_limit INTEGER DEFAULT 10,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category_name TEXT,
  price DECIMAL(10,2),
  sales_count BIGINT,
  revenue DECIMAL(12,2)
) AS $$
BEGIN
  -- Esta función es un placeholder para futuras estadísticas de ventas
  -- Actualmente retorna productos activos ordenados por nombre
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    c.name as category_name,
    p.price,
    -- Placeholder: en el futuro esto vendrá de una tabla de ventas
    FLOOR(RANDOM() * 100 + 1)::BIGINT as sales_count,
    p.price * FLOOR(RANDOM() * 100 + 1) as revenue
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.active = true AND p.suspended = false
  ORDER BY p.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. FUNCIONES DE MANTENIMIENTO
-- =====================================================

-- Función para limpiar historial de precios antiguo
CREATE OR REPLACE FUNCTION cleanup_old_price_history(
  p_days_to_keep INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden limpiar el historial';
  END IF;
  
  -- Eliminar registros antiguos
  DELETE FROM price_history 
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para optimizar tablas
CREATE OR REPLACE FUNCTION optimize_tables()
RETURNS TEXT AS $$
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden optimizar tablas';
  END IF;
  
  -- Actualizar estadísticas del optimizador
  ANALYZE products;
  ANALYZE categories;
  ANALYZE price_history;
  ANALYZE profiles;
  ANALYZE restoration_points;
  
  -- Reindexar tablas principales
  REINDEX TABLE products;
  REINDEX TABLE categories;
  REINDEX TABLE price_history;
  
  RETURN 'Optimización completada. Tablas analizadas y reindexadas.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todas las funciones fueron creadas
DO $$
DECLARE
  function_count INTEGER;
  expected_functions TEXT[] := ARRAY[
    'update_updated_at_column',
    'is_master_user',
    'setup_master_user',
    'create_user_account',
    'get_all_users',
    'create_product_with_validation',
    'update_product_with_validation',
    'delete_product_with_validation',
    'create_category_with_validation',
    'get_public_categories',
    'log_price_change',
    'bulk_update_prices',
    'create_restoration_point',
    'restore_from_point',
    'search_products',
    'get_catalog_statistics',
    'get_top_products',
    'cleanup_old_price_history',
    'optimize_tables'
  ];
  found_functions TEXT[] := '{}';
  function_name TEXT;
BEGIN
  FOR function_name IN 
    SELECT proname 
    FROM pg_proc 
    WHERE proname = ANY(expected_functions)
    AND pronamespace = 'public'::regnamespace
  LOOP
    found_functions := array_append(found_functions, function_name);
  END LOOP;
  
  function_count := array_length(found_functions, 1);
  
  RAISE NOTICE '✅ Funciones creadas: %/%', function_count, array_length(expected_functions, 1);
  
  IF function_count < array_length(expected_functions, 1) THEN
    RAISE NOTICE '⚠️ Faltan funciones por crear';
  END IF;
END $$;

-- Mostrar resumen final
SELECT 
  'Functions and Triggers' as component_type,
  'v1.0.0' as version,
  '2026-05-05' as created_at,
  COUNT(*) as total_functions
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND prokind = 'f';

-- ═══════════════════════════════════════════════════
-- FIN DE FUNCIONES Y TRIGGERS
-- ═══════════════════════════════════════════════════
