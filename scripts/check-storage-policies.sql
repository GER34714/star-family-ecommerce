-- ═══════════════════════════════════════════════════
-- VERIFICAR POLÍTICAS ACTUALES DE STORAGE
-- ═══════════════════════════════════════════════════

-- Verificar políticas existentes en storage.objects
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Verificar si RLS está habilitado en storage.objects
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerlspolicy
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Contar políticas por tipo de comando
SELECT 
    cmd,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
GROUP BY cmd
ORDER BY cmd;
