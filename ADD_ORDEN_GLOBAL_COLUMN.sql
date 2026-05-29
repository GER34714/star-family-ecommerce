-- Add orden_global column to products table for global product ordering
-- Run this in your Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS orden_global INTEGER DEFAULT 999;

-- Update existing products to have sequential orden_global values
-- based on their current sort_order within each category
WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY category, sort_order, id) as new_orden
  FROM products
  WHERE active = true AND suspended = false
)
UPDATE products 
SET orden_global = ranked.new_orden
FROM ranked
WHERE products.id = ranked.id;

-- Verify the update
SELECT id, name, category, sort_order, orden_global 
FROM products 
WHERE active = true AND suspended = false
ORDER BY orden_global
LIMIT 20;
