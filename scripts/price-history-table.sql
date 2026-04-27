-- Crear tabla price_history para historial de cambios de precios
CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('individual', 'bulk')),
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  difference DECIMAL(10,2),
  percentage_change TEXT,
  user_email TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Campos para cambios masivos
  adjustment_type TEXT CHECK (adjustment_type IN ('percentage', 'fixed')),
  adjustment_value DECIMAL(10,2),
  affected_categories TEXT[], -- Array de categorías afectadas
  changes_count INTEGER DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_type ON price_history(type);
CREATE INDEX IF NOT EXISTS idx_price_history_user ON price_history(user_email);

-- Crear trigger para actualizar updated_at en products
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

-- Verificar que la tabla fue creada
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'price_history' 
ORDER BY ordinal_position;
