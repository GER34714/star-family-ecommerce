-- ═════════════════════════════════════════════════════
-- SUPABASE STORAGE CONFIGURATION
-- ═════════════════════════════════════════════════════
-- Generado: 2026-05-05
-- Versión: v1.0.0

-- =====================================================
-- 1. CONFIGURACIÓN DE BUCKETS
-- =====================================================

/*
NOTA IMPORTANTE:
Los buckets de Supabase Storage no se pueden crear completamente con SQL.
Se deben configurar desde el Dashboard de Supabase siguiendo estos pasos:

PASOS MANUALES DESDE DASHBOARD:
1. Ir a Supabase Dashboard → Storage
2. Hacer clic en "New bucket"
3. Crear bucket con nombre: "products"
4. Configurar las políticas como se describen abajo

Este archivo SQL contiene las políticas que deben configurarse
manualmente en el Dashboard para completar la configuración.
*/

-- =====================================================
-- 2. POLÍTICAS DE STORAGE PARA BUCKET "products"
-- =====================================================

/*
POLÍTICA 1: LECTURA PÚBLICA
Nombre: "Public Read Access"
Permisos: SELECT
Roles: anon, authenticated
Definición: {"bucket": "products"}
SQL: SELECT * FROM storage.objects WHERE bucket_id = 'products'

PROPÓSITO: Permitir que cualquier persona pueda ver las imágenes
de los productos sin necesidad de autenticación.
*/

/*
POLÍTICA 2: INSERCIÓN PARA USUARIOS AUTENTICADOS
Nombre: "Authenticated Insert"
Permisos: INSERT
Roles: authenticated
Definición: {"bucket": "products", "owner": auth.uid()}
SQL: INSERT INTO storage.objects (bucket_id, name, owner) 
VALUES ('products', name, auth.uid())

PROPÓSITO: Permitir que los usuarios autenticados puedan subir
imágenes de productos al bucket.
*/

/*
POLÍTICA 3: ACTUALIZACIÓN PARA DUEÑOS
Nombre: "Owner Update"
Permisos: UPDATE
Roles: authenticated
Definición: {"bucket": "products", "owner": auth.uid()}
SQL: UPDATE storage.objects 
SET name = EXCLUDED.name 
WHERE bucket_id = 'products' AND auth.uid() = owner

PROPÓSITO: Permitir que el dueño de una imagen pueda actualizarla.
*/

/*
POLÍTICA 4: ELIMINACIÓN PARA DUEÑOS Y MASTERS
Nombre: "Owner and Masters Delete"
Permisos: DELETE
Roles: authenticated
Definición: {"bucket": "products", "owner": auth.uid()}
SQL: DELETE FROM storage.objects 
WHERE bucket_id = 'products' AND auth.uid() = owner

PROPÓSITO: Permitir que el dueño de una imagen o un usuario master
puedan eliminarla.
*/

-- =====================================================
-- 3. FUNCIONES AUXILIARES PARA STORAGE
-- =====================================================

-- Función para verificar permisos de storage
CREATE OR REPLACE FUNCTION can_manage_storage_object(
  p_bucket_id TEXT,
  p_object_name TEXT DEFAULT NULL,
  p_operation TEXT DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
  is_master BOOLEAN;
  is_owner BOOLEAN;
BEGIN
  -- Verificar si es master
  SELECT is_master_user() INTO is_master;
  
  -- Si es master, tiene acceso completo
  IF is_master THEN
    RETURN TRUE;
  END IF;
  
  -- Para operaciones de lectura, el bucket products es público
  IF p_operation = 'read' AND p_bucket_id = 'products' THEN
    RETURN TRUE;
  END IF;
  
  -- Para operaciones de escritura, debe estar autenticado
  IF p_operation IN ('insert', 'update', 'delete') THEN
    -- Verificar si es el dueño del objeto
    SELECT EXISTS(
      SELECT 1 FROM storage.objects 
      WHERE bucket_id = p_bucket_id 
      AND name = p_object_name 
      AND owner = auth.uid()
    ) INTO is_owner;
    
    RETURN is_owner;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar URL pública de imagen
CREATE OR REPLACE FUNCTION get_public_image_url(
  p_object_name TEXT,
  p_bucket_id TEXT DEFAULT 'products'
)
RETURNS TEXT AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  -- Obtener URL base de Supabase desde configuración
  -- Esto debe ajustarse según tu configuración específica
  supabase_url := current_setting('app.settings.supabase_url', 'https://your-project.supabase.co');
  
  -- Construir URL pública
  RETURN supabase_url || '/storage/v1/object/public/' || p_bucket_id || '/' || p_object_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar URL de descarga con firma
CREATE OR REPLACE FUNCTION get_signed_image_url(
  p_object_name TEXT,
  p_bucket_id TEXT DEFAULT 'products',
  p_expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT AS $$
DECLARE
  supabase_url TEXT;
  signed_url TEXT;
BEGIN
  -- Verificar permisos
  IF NOT can_manage_storage_object(p_bucket_id, p_object_name, 'read') THEN
    RAISE EXCEPTION 'No tienes permisos para acceder a esta imagen';
  END IF;
  
  -- Obtener URL base
  supabase_url := current_setting('app.settings.supabase_url', 'https://your-project.supabase.co');
  
  -- Generar URL firmada (esto requiere implementación adicional)
  signed_url := supabase_url || '/storage/v1/object/sign/' || p_bucket_id || '/' || p_object_name || '?expires_in=' || p_expires_in;
  
  RETURN signed_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGERS PARA STORAGE
-- =====================================================

-- Función para log de operaciones en storage
CREATE OR REPLACE FUNCTION log_storage_operation()
RETURNS TRIGGER AS $$
DECLARE
  operation_type TEXT;
  user_email TEXT;
BEGIN
  -- Determinar tipo de operación
  IF TG_OP = 'INSERT' THEN
    operation_type := 'upload';
  ELSIF TG_OP = 'UPDATE' THEN
    operation_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    operation_type := 'delete';
  ELSE
    operation_type := TG_OP;
  END IF;
  
  -- Obtener email del usuario
  user_email := get_current_user_email();
  
  -- Loggear operación (en una tabla de auditoría si existe)
  BEGIN
    INSERT INTO audit_log (
      table_name, 
      operation, 
      user_id, 
      old_values, 
      new_values
    ) VALUES (
      'storage.objects',
      operation_type,
      auth.uid(),
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- La tabla audit_log no existe, ignorar
      NULL;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Nota: Los triggers en storage.objects deben configurarse manualmente
-- desde el Dashboard de Supabase si se necesitan

-- =====================================================
-- 5. VISTAS PARA GESTIÓN DE STORAGE
-- =====================================================

-- Vista para listar imágenes de productos con metadatos
CREATE OR REPLACE VIEW product_images_view AS
SELECT 
  so.id,
  so.name as object_name,
  so.bucket_id,
  so.created_at as uploaded_at,
  so.updated_at as last_modified,
  so.last_accessed_at,
  so.metadata,
  so.size_bytes,
  so.etag,
  so.owner,
  p.name as product_name,
  p.id as product_id,
  -- URL pública
  get_public_image_url(so.name, so.bucket_id) as public_url,
  -- URL firmada (para acceso privado)
  get_signed_image_url(so.name, so.bucket_id, 3600) as signed_url
FROM storage.objects so
LEFT JOIN products p ON p.image_url LIKE '%' || so.name
WHERE so.bucket_id = 'products'
ORDER BY so.created_at DESC;

-- Vista para estadísticas de storage
CREATE OR REPLACE VIEW storage_statistics_view AS
SELECT 
  'products' as bucket_name,
  COUNT(*) as total_objects,
  COUNT(DISTINCT owner) as unique_owners,
  SUM(size_bytes) as total_size_bytes,
  ROUND(SUM(size_bytes) / 1024.0 / 1024.0, 2) as total_size_mb,
  ROUND(SUM(size_bytes) / 1024.0 / 1024.0 / 1024.0, 2) as total_size_gb,
  MIN(created_at) as oldest_file,
  MAX(created_at) as newest_file,
  AVG(size_bytes) as avg_size_bytes
FROM storage.objects 
WHERE bucket_id = 'products';

-- =====================================================
-- 6. FUNCIONES DE MANTENIMIENTO DE STORAGE
-- =====================================================

-- Función para limpiar imágenes huérfanas
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS TABLE (
  object_name TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ,
  status TEXT
) AS $$
DECLARE
  image_record RECORD;
  is_orphaned BOOLEAN;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden limpiar imágenes';
  END IF;
  
  -- Buscar imágenes que no están asociadas a productos activos
  FOR image_record IN 
    SELECT 
      so.name as object_name,
      so.size_bytes,
      so.created_at,
      p.id as product_id
    FROM storage.objects so
    LEFT JOIN products p ON p.image_url LIKE '%' || so.name OR p.image_url = get_public_image_url(so.name, 'products')
    WHERE so.bucket_id = 'products'
    AND (p.id IS NULL OR p.active = false OR p.suspended = true)
  LOOP
    -- Determinar si es huérfana
    is_orphaned := (image_record.product_id IS NULL OR 
                   NOT EXISTS(SELECT 1 FROM products WHERE id = image_record.product_id AND active = true AND suspended = false));
    
    IF is_orphaned THEN
      -- Marcar para eliminación (no eliminar automáticamente)
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN QUERY;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para optimizar imágenes (placeholder)
CREATE OR REPLACE FUNCTION optimize_product_images(
  p_max_size_mb INTEGER DEFAULT 5,
  p_quality INTEGER DEFAULT 80
)
RETURNS TABLE (
  object_name TEXT,
  original_size BIGINT,
  optimized_size BIGINT,
  compression_ratio DECIMAL(5,2),
  status TEXT
) AS $$
DECLARE
  image_record RECORD;
BEGIN
  -- Verificar que el usuario actual es master
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Solo los usuarios maestros pueden optimizar imágenes';
  END IF;
  
  -- Esta función es un placeholder para futura optimización de imágenes
  -- Actualmente solo retorna estadísticas básicas
  
  FOR image_record IN 
    SELECT 
      name as object_name,
      size_bytes as original_size,
      created_at
    FROM storage.objects 
    WHERE bucket_id = 'products'
    AND size_bytes > p_max_size_mb * 1024 * 1024
    ORDER BY size_bytes DESC
    LIMIT 100
  LOOP
    -- Placeholder: simular optimización
    RETURN NEXT;
  END LOOP;
  
  RETURN QUERY;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCIONES DE UTILIDAD PARA FRONTEND
-- =====================================================

-- Función para subir imagen de producto
CREATE OR REPLACE FUNCTION upload_product_image(
  p_file_name TEXT,
  p_content_type TEXT,
  p_file_size BIGINT
)
RETURNS TABLE (
  upload_url TEXT,
  object_name TEXT,
  public_url TEXT
) AS $$
DECLARE
  object_name TEXT;
  upload_url TEXT;
  public_url TEXT;
BEGIN
  -- Verificar que el usuario actual está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes estar autenticado para subir imágenes';
  END IF;
  
  -- Generar nombre único para el objeto
  object_name := 'product_' || auth.uid() || '_' || EXTRACT(EPOCH FROM NOW()) || '_' || p_file_name;
  
  -- Construir URL de upload (esto debe ajustarse según tu configuración)
  upload_url := current_setting('app.settings.supabase_url', 'https://your-project.supabase.co') || 
                '/storage/v1/upload/resumable';
  
  -- Construir URL pública
  public_url := get_public_image_url(object_name, 'products');
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar imagen de producto
CREATE OR REPLACE FUNCTION delete_product_image(
  p_object_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  object_exists BOOLEAN;
BEGIN
  -- Verificar permisos
  IF NOT can_manage_storage_object('products', p_object_name, 'delete') THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar esta imagen';
  END IF;
  
  -- Verificar que el objeto existe
  SELECT EXISTS(
    SELECT 1 FROM storage.objects 
    WHERE bucket_id = 'products' AND name = p_object_name
  ) INTO object_exists;
  
  IF NOT object_exists THEN
    RAISE EXCEPTION 'La imagen no existe';
  END IF;
  
  -- La eliminación real debe hacerse desde el frontend
  -- Esta función solo valida permisos
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CONFIGURACIÓN DE SETTINGS
-- =====================================================

-- Configurar settings personalizados (opcional)
DO $$
BEGIN
  -- Crear settings si no existen
  INSERT INTO pg_settings (name, setting)
  VALUES 
    ('app.settings.supabase_url', 'https://your-project.supabase.co'),
    ('app.settings.storage_bucket', 'products'),
    ('app.settings.max_file_size', '5242880'), -- 5MB en bytes
    ('app.settings.allowed_image_types', '["image/jpeg", "image/png", "image/gif", "image/webp"]')
  ON CONFLICT (name) DO NOTHING;
EXCEPTION
  WHEN undefined_table THEN
    -- pg_settings puede no ser modificable, ignorar
    NULL;
END $$;

-- =====================================================
-- 9. VERIFICACIÓN DE CONFIGURACIÓN
-- =====================================================

-- Verificar que las funciones de storage fueron creadas
DO $$
DECLARE
  function_count INTEGER;
  expected_functions TEXT[] := ARRAY[
    'can_manage_storage_object',
    'get_public_image_url',
    'get_signed_image_url',
    'cleanup_orphaned_images',
    'optimize_product_images',
    'upload_product_image',
    'delete_product_image'
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
  
  RAISE NOTICE '✅ Funciones de storage creadas: %/%', function_count, array_length(expected_functions, 1);
  
  IF function_count < array_length(expected_functions, 1) THEN
    RAISE NOTICE '⚠️ Faltan funciones de storage por crear';
  END IF;
END $$;

-- Mostrar resumen de configuración
SELECT 
  'Storage Configuration' as component_type,
  'v1.0.0' as version,
  '2026-05-05' as created_at,
  'products' as main_bucket,
  'public_read, auth_write, owner_manage' as access_model;

-- =====================================================
-- 10. INSTRUCCIONES DE CONFIGURACIÓN MANUAL
-- =====================================================

/*
INSTRUCCIONES COMPLETAS PARA CONFIGURAR STORAGE:

1. CREAR BUCKET:
   - Ir a Supabase Dashboard → Storage
   - Clic en "New bucket"
   - Nombre: "products"
   - Public bucket: NO (manejaremos acceso con políticas)
   - File size limit: 5MB (recomendado)
   - Allowed MIME types: image/* (o específicos)

2. CONFIGURAR POLÍTICAS:
   
   POLÍTICA 1 - LECTURA PÚBLICA:
   - Name: "Public Read Access"
   - Allowed operation: SELECT
   - Target roles: anon, authenticated
   - Policy definition: {"bucket": "products"}
   - SQL: SELECT * FROM storage.objects WHERE bucket_id = 'products'
   
   POLÍTICA 2 - INSERCIÓN AUTENTICADA:
   - Name: "Authenticated Insert"
   - Allowed operation: INSERT
   - Target roles: authenticated
   - Policy definition: {"bucket": "products", "owner": auth.uid()}
   - SQL: INSERT INTO storage.objects (bucket_id, name, owner) 
           VALUES ('products', name, auth.uid())
   
   POLÍTICA 3 - ACTUALIZACIÓN DE DUEÑO:
   - Name: "Owner Update"
   - Allowed operation: UPDATE
   - Target roles: authenticated
   - Policy definition: {"bucket": "products", "owner": auth.uid()}
   - SQL: UPDATE storage.objects 
           SET name = EXCLUDED.name 
           WHERE bucket_id = 'products' AND auth.uid() = owner
   
   POLÍTICA 4 - ELIMINACIÓN DE DUEÑO:
   - Name: "Owner Delete"
   - Allowed operation: DELETE
   - Target roles: authenticated
   - Policy definition: {"bucket": "products", "owner": auth.uid()}
   - SQL: DELETE FROM storage.objects 
           WHERE bucket_id = 'products' AND auth.uid() = owner

3. VERIFICAR CONFIGURACIÓN:
   - Subir una imagen de prueba
   - Verificar que sea accesible públicamente
   - Probar eliminar la imagen
   - Verificar que usuarios no autenticados no puedan subir

4. INTEGRACIÓN CON FRONTEND:
   - Usar las funciones proporcionadas en el frontend
   - Implementar manejo de errores
   - Agregar validación de tipos de archivo
   - Implementar barra de progreso para uploads

5. MONITOREO:
   - Revisar regularmente el uso de storage
   - Limpiar imágenes huérfanas periódicamente
   - Monitorear tamaño total del bucket
   - Configurar alertas de uso

NOTAS IMPORTANTES:
- Las URLs públicas siguen el formato: https://project.supabase.co/storage/v1/object/public/products/filename.jpg
- Las URLs firmadas son para acceso temporal a archivos privados
- El límite por defecto de Supabase es 100MB por archivo, configurable por bucket
- Se recomienda implementar compresión de imágenes en el frontend antes de subir
- Considerar implementar CDN para mejor rendimiento en producción
*/

-- ═══════════════════════════════════════════════════
-- FIN DE CONFIGURACIÓN DE STORAGE
-- ═══════════════════════════════════════════════════
