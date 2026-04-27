-- ═══════════════════════════════════════════════════
-- VERIFICAR ESTADO DE image_url EN PRODUCTOS EXISTENTES
-- ═══════════════════════════════════════════════════

-- Verificar cuántos productos tienen image_url vacío
SELECT 
    'Productos con image_url VACÍO' as status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products), 2) as percentage
FROM products 
WHERE image_url IS NULL OR image_url = '' OR TRIM(image_url) = '';

-- Verificar cuántos productos tienen image_url con contenido
SELECT 
    'Productos con image_url CON CONTENIDO' as status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products), 2) as percentage
FROM products 
WHERE image_url IS NOT NULL AND image_url != '' AND TRIM(image_url) != '';

-- Mostrar ejemplos de productos con image_url vacío
SELECT 
    id,
    name,
    category,
    CASE 
        WHEN image_url IS NULL THEN 'NULL'
        WHEN image_url = '' THEN 'EMPTY'
        WHEN TRIM(image_url) = '' THEN 'WHITESPACE ONLY'
        ELSE image_url
    END as image_url_status,
    price
FROM products 
WHERE image_url IS NULL OR image_url = '' OR TRIM(image_url) = ''
ORDER BY category, name
LIMIT 10;

-- Mostrar ejemplos de productos con image_url con contenido
SELECT 
    id,
    name,
    category,
    image_url,
    price
FROM products 
WHERE image_url IS NOT NULL AND image_url != '' AND TRIM(image_url) != ''
ORDER BY category, name
LIMIT 5;
