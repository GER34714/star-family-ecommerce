-- ═════════════════════════════════════════════════════
-- SUPABASE MIGRATION SCRIPT
-- Ejecutar en SQL Editor de Supabase
-- ═════════════════════════════════════════════════════

-- Nuevas columnas en products
ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_retail_price BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_boxes INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_banner BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS banner_title TEXT;

-- Verificar tabla categories (crear si no existe)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '',
  color TEXT DEFAULT '#C41E3A',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas RLS para categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON categories;
DROP POLICY IF EXISTS "Auth insert categories" ON categories;
DROP POLICY IF EXISTS "Auth update categories" ON categories;
DROP POLICY IF EXISTS "Auth delete categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Auth insert categories" ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update categories" ON categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth delete categories" ON categories FOR DELETE USING (auth.role() = 'authenticated');

-- Insertar categorías base si no existen
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
