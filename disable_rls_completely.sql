-- Disable RLS completely for products table
-- This will remove all row-level security restrictions

-- Disable RLS completely
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'products';

-- Check if we can now access the table
SELECT COUNT(*) as total_products FROM products LIMIT 1;
