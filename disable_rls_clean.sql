-- Disable RLS completely for products table - Clean version
-- First drop the policy, then disable RLS

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow all operations" ON products;

-- Disable RLS completely
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'products';

-- Check if we can now access the table
SELECT COUNT(*) as total_products FROM products LIMIT 1;
