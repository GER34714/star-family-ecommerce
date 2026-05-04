-- ═════════════════════════════════════════════════════
-- ESQUEMA COMPLETO DE BASE DE DATOS PARA STAR FAMILY E-COMMERCE
-- ═════════════════════════════════════════════════════

-- =====================================================
-- 1. TABLA DE CATEGORÍAS
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT,
  color TEXT DEFAULT '#C41E3A',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA DE PRODUCTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  bulk_info TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA DE PEDIDOS (ORDERS)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  notes TEXT DEFAULT '',
  whatsapp_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA DE ÍTEMES DE PEDIDO (ORDER_ITEMS)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL CHECK (product_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABLA DE HISTORIAL DE PRECIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('individual', 'bulk')),
  old_price DECIMAL(10,2) CHECK (old_price >= 0),
  new_price DECIMAL(10,2) CHECK (new_price >= 0),
  difference DECIMAL(10,2),
  percentage_change DECIMAL(5,2),
  user_email TEXT,
  adjustment_type TEXT CHECK (adjustment_type IN ('percentage', 'fixed')),
  adjustment_value DECIMAL(10,2),
  affected_categories TEXT[],
  changes_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp);

-- =====================================================
-- 7. HABILITAR ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. POLÍTICAS DE SEGURIDAD - CATEGORIES
-- =====================================================
-- Todos pueden ver categorías
CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

-- Solo masters pueden gestionar categorías
CREATE POLICY "Masters can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 9. POLÍTICAS DE SEGURIDAD - PRODUCTS
-- =====================================================
-- Todos pueden ver productos activos
CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (active = true);

-- Solo masters pueden gestionar productos
CREATE POLICY "Masters can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 10. POLÍTICAS DE SEGURIDAD - ORDERS
-- =====================================================
-- Usuarios pueden ver sus propios pedidos
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (user_id = auth.uid());

-- Usuarios pueden crear sus propios pedidos
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Solo masters pueden ver todos los pedidos
CREATE POLICY "Masters can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- Masters pueden gestionar todos los pedidos
CREATE POLICY "Masters can manage orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 11. POLÍTICAS DE SEGURIDAD - ORDER_ITEMS
-- =====================================================
-- Usuarios pueden ver items de sus propios pedidos
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Usuarios pueden crear items de sus propios pedidos
CREATE POLICY "Users can create order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Masters pueden ver todos los items
CREATE POLICY "Masters can view all order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 12. POLÍTICAS DE SEGURIDAD - PRICE_HISTORY
-- =====================================================
-- Todos pueden ver historial de precios
CREATE POLICY "Public can view price history" ON price_history
  FOR SELECT USING (true);

-- Solo masters pueden gestionar historial
CREATE POLICY "Masters can manage price history" ON price_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 13. DATOS INICIALES - CATEGORÍAS
-- =====================================================
INSERT INTO categories (name, emoji, color) VALUES
('Frescos', '🌭', '#E53E3E'),
('Completos', '🌭', '#DD6B20'),
('Panchos Armados', '🌭', '#D97706'),
('Hamburguesas', '🍔', '#7C3AED'),
('Pizzas y Empanadas', '🍕', '#2563EB'),
('Medialunas y Chipas', '🥐', '#059669'),
('Combos', '📦', '#C41E3A')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 14. DATOS INICIALES - PRODUCTOS DE EJEMPLO
-- =====================================================
INSERT INTO products (name, description, price, bulk_info, image_url, category_id) VALUES
('Super Pancho Fresco', 'Pancho tradicional de alta calidad', 450.00, 'Bulto x 50 unidades', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Frescos')),
('Completo Especial', 'Completo con todos los ingredientes', 520.00, 'Bulto x 40 unidades', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Completos')),
('Pancho Armado Clásico', 'Pancho precocido listo para servir', 580.00, 'Bulto x 30 unidades', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Panchos Armados')),
('Hamburguesa Premium', 'Hamburguesa de 150g con queso', 750.00, 'Bulto x 20 unidades', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Hamburguesas')),
('Pizza Individual', 'Pizza margarita individual congelada', 680.00, 'Bulto x 12 unidades', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Pizzas y Empanadas')),
('Empanadas Surtidas', 'Caja con empanadas de carne y pollo', 890.00, 'Bulto x 24 unidades', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Pizzas y Empanadas')),
('Medialunas de Manteca', 'Medialunas tradicionales argentinas', 420.00, 'Bulto x 60 unidades', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Medialunas y Chipas')),
('Chipas Queso', 'Chipas con queso parmesano', 380.00, 'Bulto x 80 unidades', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Medialunas y Chipas')),
('Combo Fiesta', 'Variedad de productos para eventos', 2500.00, 'Incluye 20 panchos + 10 hamburguesas', 'https://iili.io/B6XgSSI.jpg', (SELECT id FROM categories WHERE name = 'Combos'))
ON CONFLICT DO NOTHING;

-- =====================================================
-- 15. TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================
-- Trigger para actualizar updated_at en categorías
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 16. VISTAS ÚTILES
-- =====================================================
-- Vista de productos con nombres de categorías
CREATE OR REPLACE VIEW products_with_categories AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.bulk_info,
    p.image_url,
    p.active,
    p.created_at,
    p.updated_at,
    c.name as category_name,
    c.emoji as category_emoji,
    c.color as category_color
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- Vista de pedidos con detalles
CREATE OR REPLACE VIEW orders_with_details AS
SELECT 
    o.id,
    o.user_id,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.total_amount,
    o.status,
    o.notes,
    o.whatsapp_message,
    o.created_at,
    o.updated_at,
    COUNT(oi.id) as item_count,
    ARRAY_AGG(oi.product_name) as products
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.user_id, o.customer_name, o.customer_email, o.customer_phone, o.total_amount, o.status, o.notes, o.whatsapp_message, o.created_at, o.updated_at;

-- =====================================================
-- 17. FUNCIONES HELPER
-- =====================================================
-- Función para crear pedido con items
CREATE OR REPLACE FUNCTION create_order_with_items(
    p_customer_name TEXT DEFAULT NULL,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_notes TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
    order_uuid UUID;
    item JSONB;
    product_record RECORD;
    total_amount DECIMAL(10,2) := 0;
BEGIN
    -- Calcular total
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT price INTO product_record 
        FROM products 
        WHERE id = (item->>'product_id')::UUID 
        AND active = true;
        
        IF product_record IS NOT NULL THEN
            total_amount := total_amount + (product_record.price * (item->>'quantity')::INTEGER);
        END IF;
    END LOOP;
    
    -- Crear orden
    INSERT INTO orders (
        user_id, customer_name, customer_email, customer_phone, 
        total_amount, status, notes
    ) VALUES (
        auth.uid(), p_customer_name, p_customer_email, p_customer_phone,
        total_amount, 'pending', p_notes
    ) RETURNING id INTO order_uuid;
    
    -- Crear items
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT price, name INTO product_record 
        FROM products 
        WHERE id = (item->>'product_id')::UUID 
        AND active = true;
        
        IF product_record IS NOT NULL THEN
            INSERT INTO order_items (
                order_id, product_id, product_name, product_price, 
                quantity, subtotal
            ) VALUES (
                order_uuid,
                (item->>'product_id')::UUID,
                product_record.name,
                product_record.price,
                (item->>'quantity')::INTEGER,
                product_record.price * (item->>'quantity')::INTEGER
            );
        END IF;
    END LOOP;
    
    RETURN order_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 18. VERIFICACIÓN FINAL
-- =====================================================
SELECT '✅ Base de datos Star Family configurada exitosamente' as status;
SELECT '📊 Tablas creadas: categories, products, orders, order_items, price_history' as tables_created;
SELECT '🔐 Políticas RLS configuradas para acceso seguro' as rls_configured;
SELECT '📁 Vistas útiles creadas: products_with_categories, orders_with_details' as views_created;
SELECT '⚡ Función helper: create_order_with_items()' as functions_created;
SELECT '🗂️ Índices optimizados para rendimiento' as indexes_created;
