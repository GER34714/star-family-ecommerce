-- Crear tabla products para Star Family E-commerce
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,  -- Usar TEXT en lugar de UUID para IDs como "f1", "c1", etc.
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  bulk_info TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Verificar que la tabla fue creada
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
