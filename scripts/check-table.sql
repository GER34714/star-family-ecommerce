-- Verificar el esquema actual de la tabla products
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- Si la columna id es UUID, necesitamos recrear la tabla
-- Primero eliminamos la tabla si existe y la creamos correctamente
DROP TABLE IF EXISTS products CASCADE;

-- Crear tabla products con el esquema correcto
CREATE TABLE products (
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
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_name ON products(name);

-- Verificar que la tabla fue creada correctamente
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
