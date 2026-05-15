-- Clean invalid products with xl_ prefix IDs
-- This will remove products that have manually generated IDs

DELETE FROM products WHERE id::text LIKE 'xl_%';

-- Verify cleanup
SELECT COUNT(*) as remaining_invalid_products 
FROM products 
WHERE id::text LIKE 'xl_%';

-- Show total products after cleanup
SELECT COUNT(*) as total_products_after_cleanup 
FROM products;
