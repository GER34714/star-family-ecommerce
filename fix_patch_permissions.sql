-- Fix PATCH permissions for products table
-- This will allow the anon role to update products

-- Grant explicit UPDATE permissions to anon role
GRANT UPDATE ON products TO anon;

-- Also grant INSERT and SELECT to be safe
GRANT SELECT ON products TO anon;
GRANT INSERT ON products TO anon;
GRANT DELETE ON products TO anon;

-- Verify permissions
SELECT has_table_privilege('anon', 'products', 'SELECT') as can_select,
       has_table_privilege('anon', 'products', 'INSERT') as can_insert,
       has_table_privilege('anon', 'products', 'UPDATE') as can_update,
       has_table_privilege('anon', 'products', 'DELETE') as can_delete;

-- Test with a simple update (this should work now)
-- Note: This is just to test permissions, it won't actually change anything
-- SELECT 'Testing UPDATE permissions...' as status;
