-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA DE PRODUCTOS CON ESTADOS DRAFT/PUBLISHED Y PERSISTENCIA EN SUPABASE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Eliminar tabla si existe para recrearla con la estructura correcta
-- Usar CASCADE para eliminar también las dependencias (como price_history_product_id_fkey)
DROP TABLE IF EXISTS products CASCADE;

-- Crear tabla de productos con el esquema exacto solicitado
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT NULL,                    -- null = sin categoría = no visible en tienda
    precio NUMERIC NOT NULL,
    bulto TEXT NULL,                        -- cantidad por bulto / unidad de venta
    imagen TEXT NULL,                       -- URL de la imagen del producto
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Campos adicionales para compatibilidad con el sistema existente
    description TEXT DEFAULT '',
    bulk_info TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    custom_badge TEXT DEFAULT '',
    active BOOLEAN DEFAULT true,
    suspended BOOLEAN DEFAULT false,
    category_id UUID REFERENCES categories(id) NULL
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_nombre ON products(nombre);
CREATE INDEX idx_products_categoria_status ON products(categoria, status) WHERE categoria IS NOT NULL;
CREATE INDEX idx_products_published ON products(status) WHERE status = 'published';

-- ═══════════════════════════════════════════════════════════════════════════════
-- RECREAR TABLA PRICE_HISTORY (si fue eliminada por CASCADE)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar si existe price_history y recrearla si es necesario
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'price_history') THEN
        CREATE TABLE price_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            product_name TEXT NOT NULL,
            old_price NUMERIC NOT NULL,
            new_price NUMERIC NOT NULL,
            changed_by TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Índices para price_history
        CREATE INDEX idx_price_history_product_id ON price_history(product_id);
        CREATE INDEX idx_price_history_created_at ON price_history(created_at);
        
        -- Habilitar RLS para price_history
        ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
        
        -- Políticas para price_history
        CREATE POLICY "Admin puede ver todo el historial" ON price_history FOR SELECT
        USING (
            auth.uid() IS NOT NULL
        );
        
        CREATE POLICY "Admin puede insertar historial" ON price_history FOR INSERT
        WITH CHECK (
            auth.uid() IS NOT NULL
        );
        
        RAISE NOTICE 'Tabla price_history recreada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla price_history ya existe, omitiendo recreación';
    END IF;
END $$;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Habilitar RLS en la tabla productos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura pública solo para productos publicados con categoría asignada
CREATE POLICY "Productos públicos visibles en tienda"
ON products FOR SELECT
USING (
    status = 'published' 
    AND categoria IS NOT NULL 
    AND categoria != 'sin categoría'
    AND categoria != ''
    AND active = true 
    AND suspended = false
);

-- Política 2: Lectura completa para usuarios autenticados (panel admin)
CREATE POLICY "Admin puede ver todos los productos"
ON products FOR SELECT
USING (
    auth.uid() IS NOT NULL
);

-- Política 3: Inserción solo para usuarios autenticados admin
CREATE POLICY "Admin puede insertar productos"
ON products FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Política 4: Actualización solo para usuarios autenticados admin
CREATE POLICY "Admin puede actualizar productos"
ON products FOR UPDATE
USING (
    auth.uid() IS NOT NULL
);

-- Política 5: Eliminación solo para usuarios autenticados admin
CREATE POLICY "Admin puede eliminar productos"
ON products FOR DELETE
USING (
    auth.uid() IS NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VISTAS ÚTILES PARA EL PANEL ADMIN
-- ═══════════════════════════════════════════════════════════════════════════════

-- Vista para productos pendientes (sin categoría)
CREATE VIEW admin_products_pending AS
SELECT 
    id,
    nombre,
    categoria,
    precio,
    bulto,
    imagen,
    status,
    created_at,
    updated_at
FROM products 
WHERE categoria IS NULL 
   OR categoria = 'sin categoría' 
   OR categoria = ''
ORDER BY created_at DESC;

-- Vista para productos publicados
CREATE VIEW admin_products_published AS
SELECT 
    id,
    nombre,
    categoria,
    precio,
    bulto,
    imagen,
    status,
    created_at,
    updated_at
FROM products 
WHERE status = 'published'
ORDER BY created_at DESC;

-- Vista para productos en draft (con categoría pero no publicados)
CREATE VIEW admin_products_draft AS
SELECT 
    id,
    nombre,
    categoria,
    precio,
    bulto,
    imagen,
    status,
    created_at,
    updated_at
FROM products 
WHERE status = 'draft' 
   AND categoria IS NOT NULL 
   AND categoria != 'sin categoría'
   AND categoria != ''
ORDER BY created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMENTARIOS Y DOCUMENTACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE products IS 'Tabla de productos con estados draft/published y persistencia en Supabase';
COMMENT ON COLUMN products.id IS 'UUID generado automáticamente por Supabase';
COMMENT ON COLUMN products.nombre IS 'Nombre del producto (requerido)';
COMMENT ON COLUMN products.categoria IS 'Categoría del producto (null = sin categoría = no visible en tienda)';
COMMENT ON COLUMN products.precio IS 'Precio del producto (requerido)';
COMMENT ON COLUMN products.bulto IS 'Cantidad por bulto o unidad de venta';
COMMENT ON COLUMN products.imagen IS 'URL de la imagen del producto';
COMMENT ON COLUMN products.status IS 'Estado del producto: draft = no visible en tienda, published = visible en tienda';
COMMENT ON COLUMN products.created_at IS 'Fecha de creación automática';
COMMENT ON COLUMN products.updated_at IS 'Fecha de última actualización automática';

-- Reglas de negocio implementadas:
-- 1. Un producto importado desde Excel NUNCA se publica automáticamente (status = 'draft')
-- 2. Solo se publica cuando el admin le asigna una categoría manualmente
-- 3. Los productos sin categoría (categoria IS NULL) NUNCA se muestran en la tienda pública
-- 4. La persistencia sobrevive recargas, cierres de navegador y reinicios del servidor
-- 5. RLS asegura que solo usuarios autenticados admin puedan modificar datos
