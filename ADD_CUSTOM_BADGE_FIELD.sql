-- Script para agregar el campo custom_badge a la tabla products
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna custom_badge a la tabla products
ALTER TABLE products 
ADD COLUMN custom_badge TEXT;

-- Crear índice para mejor rendimiento (opcional)
-- CREATE INDEX idx_products_custom_badge ON products(custom_badge);

-- Comentario sobre el campo
COMMENT ON COLUMN products.custom_badge IS 'Etiqueta personalizada para mostrar en el badge del producto en lugar de la categoría';

-- Ejemplos de uso:
-- UPDATE products SET custom_badge = 'OFERTA' WHERE id = 'uuid-del-producto';
-- UPDATE products SET custom_badge = 'NUEVO' WHERE id = 'uuid-del-producto';
-- UPDATE products SET custom_badge = 'EDICIÓN LIMITADA' WHERE id = 'uuid-del-producto';

-- Si el campo está vacío o NULL, no se mostrará ningún badge
