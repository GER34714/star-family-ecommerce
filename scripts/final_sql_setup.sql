-- ═════════════════════════════════════════════════════
-- ESQUEMA COMPLETO SUPABASE - STAR FAMILY E-COMMERCE
-- ═════════════════════════════════════════════════════

-- =====================================================
-- 1. CREAR TABLAS
-- =====================================================

-- CATEGORÍAS
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT,
  color TEXT DEFAULT '#C41E3A',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCTOS
CREATE TABLE products (
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
-- 2. HABILITAR ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. POLÍTICAS DE SEGURIDAD (SIN IF NOT EXISTS)
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Masters can manage categories" ON categories;
DROP POLICY IF EXISTS "Public can view active products" ON products;
DROP POLICY IF EXISTS "Masters can manage products" ON products;

-- Crear nuevas políticas
CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Masters can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (active = true);

CREATE POLICY "Masters can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- 4. INSERTAR DATOS INICIALES
-- =====================================================

-- CATEGORÍAS
INSERT INTO categories (name, emoji, color) VALUES
('Frescos', '🌭', '#E53E3E'),
('Completos', '🌭', '#DD6B20'),
('Panchos Armados', '🌭', '#D97706'),
('Hamburguesas', '🍔', '#7C3AED'),
('Pizzas y Empanadas', '🍕', '#2563EB'),
('Medialunas y Chipas', '🥐', '#059669'),
('Combos', '📦', '#C41E3A')
ON CONFLICT (name) DO NOTHING;

-- PRODUCTOS
INSERT INTO products (id, name, description, price, bulk_info, image_url, category_id, active) VALUES
-- FRESCOS
(gen_random_uuid(), 'Salchichas Cortas x6', 'Salchichas cocidas y ahumadas sin piel. La clásica de siempre.', 19725.00, 'Bulto x 24 paquetes', '', (SELECT id FROM categories WHERE name = 'Frescos'), true),
(gen_random_uuid(), 'Salchichas Largas x6', 'Salchichas largas cocidas y ahumadas sin piel.', 19050.00, 'Bulto x 12 paquetes', '', (SELECT id FROM categories WHERE name = 'Frescos'), true),
(gen_random_uuid(), 'Salchichas Largas x18', 'Salchichas largas cocidas y ahumadas sin piel.', 19050.00, 'Bulto x 4 paquetes', '', (SELECT id FROM categories WHERE name = 'Frescos'), true),
(gen_random_uuid(), 'Salchichita 500g', 'Salchichitas ideales para kioscos y eventos.', 3437.00, 'Bulto x 6 paquetes de 500gr', '', (SELECT id FROM categories WHERE name = 'Frescos'), true),
(gen_random_uuid(), 'Premium Alemana x12', 'Línea premium tipo alemana. Sabor superior.', 35000.00, 'Bulto x 4 paquetes', '', (SELECT id FROM categories WHERE name = 'Frescos'), true),

-- COMPLETOS
(gen_random_uuid(), 'Completo Cortas', 'Kit completo con pan incluido. Listo para vender.', 19725.00, '144 Salchichas + 144 Panes', '', (SELECT id FROM categories WHERE name = 'Completos'), true),
(gen_random_uuid(), 'Completo Largas (x18)', 'Salchichas largas con pan. Ideal para eventos y locales.', 34800.00, '72 Salchichas + 72 Panes', '', (SELECT id FROM categories WHERE name = 'Completos'), true),
(gen_random_uuid(), 'Completo Largas (x6)', 'Formato alternativo con salchichas largas y pan.', 34800.00, '72 Salchichas (12paq x6) + 72 Panes', '', (SELECT id FROM categories WHERE name = 'Completos'), true),

-- PANCHOS ARMADOS
(gen_random_uuid(), '30 Panchos Cortos', 'Kit completo listo para armar. Panes + salchichas + aderezo.', 11700.00, '30 Panes + 30 Salchichas + 1 Aderezo', '', (SELECT id FROM categories WHERE name = 'Panchos Armados'), true),
(gen_random_uuid(), '60 Panchos Cortos', 'Kit completo listo para armar. Panes + salchichas + aderezo.', 22200.00, '60 Panes + 60 Salchichas + 1 Aderezo', '', (SELECT id FROM categories WHERE name = 'Panchos Armados'), true),
(gen_random_uuid(), '36 Panchos Largos', 'Kit completo listo para armar. Panes + salchichas + aderezo.', 21600.00, '36 Panes + 36 Salchichas + 1 Aderezo', '', (SELECT id FROM categories WHERE name = 'Panchos Armados'), true),
(gen_random_uuid(), '72 Panchos Largos', 'Kit completo listo para armar. Panes + salchichas + aderezo.', 42000.00, '72 Panes + 72 Salchichas + 1 Aderezo', '', (SELECT id FROM categories WHERE name = 'Panchos Armados'), true),

-- HAMBURGUESAS
(gen_random_uuid(), '24 Hamburguesas Clásicas 69g', '24 panes + 24 medallones de carne + 1 aderezo.', 22900.00, '24 Panes + 24 Medallones + 1 Aderezo', '', (SELECT id FROM categories WHERE name = 'Hamburguesas'), true),
(gen_random_uuid(), '60 Hamburguesas Clásicas 69g', '60 panes + 60 medallones de carne + 1 aderezo.', 55400.00, '60 Panes + 60 Medallones + 1 Aderezo', '', (SELECT id FROM categories WHERE name = 'Hamburguesas'), true),
(gen_random_uuid(), '20 Hamburguesas Gigantes 110g', '20 panes + 20 medallones gigantes + 1 aderezo.', 26800.00, '20 Panes + 20 Medallones + 1 Aderezo', '', (SELECT id FROM categories WHERE name = 'Hamburguesas'), true),
(gen_random_uuid(), '40 Hamburguesas Gigantes 110g', '40 panes + 40 medallones gigantes + 1 aderezo.', 52400.00, '40 Panes + 40 Medallones + 1 Aderezo', '', (SELECT id FROM categories WHERE name = 'Hamburguesas'), true),

-- PIZZAS Y EMPANADAS
(gen_random_uuid(), 'Pizzas Mozzarella x11', 'Pizza congelada con salsa de tomate y mozzarella. Lista para hornear.', 48125.00, 'Caja x 11 unidades · $4.375 c/u', '', (SELECT id FROM categories WHERE name = 'Pizzas y Empanadas'), true),
(gen_random_uuid(), 'Empanadas Premium x42', 'Carne, pollo, jamón y queso, y verduras. Premium.', 36540.00, 'Caja x 42 unidades · $870 c/u', '', (SELECT id FROM categories WHERE name = 'Pizzas y Empanadas'), true),

-- MEDIALUNAS Y CHIPAS
(gen_random_uuid(), 'Chipa x4.5kg', 'Chipas artesanales premium.', 46875.00, 'Caja x 4.5 kg', '', (SELECT id FROM categories WHERE name = 'Medialunas y Chipas'), true),
(gen_random_uuid(), 'Medialunas Crudas x96', 'Medialunas de manteca premium 55g c/u.', 40800.00, 'Caja x 96 unidades (55g c/u)', '', (SELECT id FROM categories WHERE name = 'Medialunas y Chipas'), true),

-- COMBOS
(gen_random_uuid(), 'Combo Pancho Largo', '1 salchicha larga + 1 pan + aderezos. El más vendido.', 3200.00, 'Caja x 12 combos de 6 (72 panchos)', '', (SELECT id FROM categories WHERE name = 'Combos'), true),
(gen_random_uuid(), 'Combo Hamburguesa 69g', '1 medallón clásico + 1 pan + aderezos.', 3500.00, 'Caja x 15 combos de 4', '', (SELECT id FROM categories WHERE name = 'Combos'), true),
(gen_random_uuid(), 'Combo Hamburguesa 110g', '1 medallón gigante + 1 pan + aderezos.', 4950.00, 'Caja x 10 combos de 4', '', (SELECT id FROM categories WHERE name = 'Combos'), true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. VERIFICACIÓN FINAL
-- =====================================================
SELECT '✅ Base de datos Star Family configurada exitosamente' as status;
SELECT 
    (SELECT COUNT(*) FROM categories) as categorias_creadas,
    (SELECT COUNT(*) FROM products) as productos_creados;
