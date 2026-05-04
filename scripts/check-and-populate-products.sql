-- ═════════════════════════════════════════════════════
-- VERIFICAR Y POBLAR TABLA PRODUCTS
-- ═════════════════════════════════════════════════════

-- Paso 1: Verificar si la tabla products existe
SELECT 'Verificando si existe la tabla products...' as status;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'products';

-- Paso 2: Si no existe, crear la tabla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'products'
    ) THEN
        CREATE TABLE products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            bulk_info TEXT,
            image_url TEXT,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        
        -- Política RLS para lectura pública
        CREATE POLICY "Products are viewable by everyone" ON products
            FOR SELECT USING (true);
            
        -- Política RLS para inserción (solo usuarios autenticados)
        CREATE POLICY "Authenticated users can insert products" ON products
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
            
        -- Política RLS para actualización (solo usuarios autenticados)
        CREATE POLICY "Authenticated users can update products" ON products
            FOR UPDATE USING (auth.role() = 'authenticated');
            
        -- Política RLS para eliminación (solo usuarios autenticados)
        CREATE POLICY "Authenticated users can delete products" ON products
            FOR DELETE USING (auth.role() = 'authenticated');
        
        RAISE NOTICE '✅ Tabla products creada exitosamente';
    ELSE
        RAISE NOTICE '✅ Tabla products ya existe';
    END IF;
END $$;

-- Paso 3: Verificar cuántos productos hay actualmente
SELECT 'Contando productos existentes...' as status;

SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN active = true THEN 1 END) as active_products
FROM products;

-- Paso 4: Si no hay productos, insertar productos de ejemplo
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    
    IF product_count = 0 THEN
        -- Insertar productos de ejemplo
        INSERT INTO products (name, description, category, price, bulk_info, image_url) VALUES
        ('Salchichas Largas x6', 'Salchichas largas de alta calidad, paquete de 6 unidades', 'Frescos', 19725.00, 'Bulto x 12 paquetes', 'https://example.com/salchichas.jpg'),
        ('Hamburguesas Clásicas x4', 'Hamburguesas clásicas de carne, paquete de 4 unidades', 'Frescos', 24500.00, 'Bulto x 10 paquetes', 'https://example.com/hamburguesas.jpg'),
        ('Panchos Armados x12', 'Panchos completos con pan y salsa, paquete de 12 unidades', 'Panchos Armados', 15600.00, 'Bulto x 8 paquetes', 'https://example.com/panchos.jpg'),
        ('Pizza Muzzarella', 'Pizza tradicional con muzzarella, tamaño familiar', 'Pizzas y Empanadas', 32000.00, 'Bulto x 6 unidades', 'https://example.com/pizza.jpg'),
        ('Empanadas Variadas x12', 'Caja con 12 empanadas variadas (carne, pollo, jamón y queso)', 'Pizzas y Empanadas', 18500.00, 'Bulto x 10 cajas', 'https://example.com/empanadas.jpg'),
        ('Medialunas Frescas x24', 'Medialunas de manteca frescas, paquete de 24 unidades', 'Medialunas y Chipas', 8900.00, 'Bulto x 20 paquetes', 'https://example.com/medialunas.jpg'),
        ('Chipas Tradicionales x20', 'Chipas tradicionales paraguayas, paquete de 20 unidades', 'Medialunas y Chipas', 7200.00, 'Bulto x 25 paquetes', 'https://example.com/chipas.jpg'),
        ('Combo Familiar', 'Combo especial con hamburguesas, papas y bebidas para 4 personas', 'Combos', 45000.00, 'Combo completo', 'https://example.com/combo.jpg');
        
        RAISE NOTICE '✅ Se insertaron 8 productos de ejemplo';
    ELSE
        RAISE NOTICE '✅ Ya existen % productos en la tabla', product_count;
    END IF;
END $$;

-- Paso 5: Verificar productos insertados
SELECT 'Verificando productos finales...' as status;

SELECT 
    id,
    name,
    category,
    price,
    active,
    created_at
FROM products 
ORDER BY created_at ASC;

-- Paso 6: Resumen final
SELECT 
    'RESUMEN FINAL' as titulo,
    COUNT(*) as total_productos,
    COUNT(CASE WHEN active = true THEN 1 END) as productos_activos,
    COUNT(CASE WHEN active = false THEN 1 END) as productos_inactivos
FROM products;

SELECT '✅ Script completado exitosamente' as resultado;
