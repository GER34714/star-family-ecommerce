-- Fix RLS policies for products table - Version 2
-- This will drop existing policies and recreate them

-- First, drop all existing policies on products table
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;

-- Disable RLS temporarily
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Enable RLS again
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

-- Create policy for authenticated users to insert
CREATE POLICY "Enable insert for authenticated users" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update
CREATE POLICY "Enable update for authenticated users" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete
CREATE POLICY "Enable delete for authenticated users" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'products';
