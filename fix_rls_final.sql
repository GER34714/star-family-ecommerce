-- Fix RLS policies for products table - Final Version
-- Remove all existing policies and create simple ones

-- Drop ALL existing policies on products table
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;
DROP POLICY IF EXISTS "Productos públicos visibles en tienda" ON products;
DROP POLICY IF EXISTS "Admin puede ver todos los productos" ON products;
DROP POLICY IF EXISTS "Admin puede insertar productos" ON products;
DROP POLICY IF EXISTS "Admin puede actualizar productos" ON products;
DROP POLICY IF EXISTS "Admin puede eliminar productos" ON products;

-- Disable RLS completely temporarily
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Enable RLS again
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create simple policy for ALL access (temporary fix)
CREATE POLICY "Allow all operations" ON products
  FOR ALL USING (true) WITH CHECK (true);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'products';
