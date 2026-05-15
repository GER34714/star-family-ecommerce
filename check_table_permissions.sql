-- Check table permissions and ownership
-- This will help identify why access is still denied

-- Check table owner
SELECT tableowner, tablespace 
FROM pg_tables 
WHERE tablename = 'products';

-- Check current user permissions
SELECT has_table_privilege('anon', 'products', 'SELECT') as can_select,
       has_table_privilege('anon', 'products', 'INSERT') as can_insert,
       has_table_privilege('anon', 'products', 'UPDATE') as can_update,
       has_table_privilege('anon', 'products', 'DELETE') as can_delete;

-- Check if table exists and its schema
SELECT table_schema, table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'products';

-- Grant explicit permissions to anon role
GRANT ALL ON products TO anon;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;

-- Verify permissions after grant
SELECT has_table_privilege('anon', 'products', 'SELECT') as can_select_after,
       has_table_privilege('anon', 'products', 'INSERT') as can_insert_after,
       has_table_privilege('anon', 'products', 'UPDATE') as can_update_after,
       has_table_privilege('anon', 'products', 'DELETE') as can_delete_after;
