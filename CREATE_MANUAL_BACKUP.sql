-- ═══════════════════════════════════════════════════════════════════════════════
-- BACKUP MANUAL COMPLETO DE REGLAS DE SUPABASE
-- Ejecutar este script directamente en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Backup de todas las políticas RLS
SELECT 
    'POLICY' as type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    'CREATE POLICY "' || policyname || '" ON ' || tablename || ' FOR ' || cmd || 
    CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
    CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
    ';' as recreation_sql
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Backup de todas las funciones personalizadas
SELECT 
    'FUNCTION' as type,
    routine_name,
    routine_schema,
    data_type as return_type,
    routine_definition,
    'CREATE OR REPLACE FUNCTION ' || routine_name || '() RETURNS ' || data_type || ' AS ' || 
    routine_definition || ' LANGUAGE ' || lower(language) || ';' as recreation_sql
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name NOT LIKE 'pg_%'
AND routine_name NOT LIKE 'information_%';

-- 3. Backup de todos los triggers
SELECT 
    'TRIGGER' as type,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement,
    'CREATE TRIGGER ' || trigger_name || ' ' || action_timing || ' ' || event_manipulation || 
    ' ON ' || event_object_table || ' FOR EACH ROW ' || action_statement || ';' as recreation_sql
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- 4. Backup de todos los índices
SELECT 
    'INDEX' as type,
    indexname,
    tablename,
    indexdef,
    indexdef as recreation_sql
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname NOT LIKE 'pg_%';

-- 5. Backup de constraints de tablas
SELECT 
    'CONSTRAINT' as type,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' ' || tc.constraint_type || 
    CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
            ' (' || kcu.column_name || ') REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ')'
        WHEN tc.constraint_type = 'UNIQUE' THEN 
            ' (' || kcu.column_name || ')'
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 
            ' (' || kcu.column_name || ')'
        ELSE ''
    END ||
    ';' as recreation_sql
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public';

-- 6. Backup de estructura completa de tablas
SELECT 
    'TABLE' as type,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    'ALTER TABLE ' || table_name || ' ADD COLUMN ' || column_name || ' ' || data_type ||
    CASE 
        WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
        WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL THEN '(' || numeric_precision || ',' || numeric_scale || ')'
        WHEN numeric_precision IS NOT NULL THEN '(' || numeric_precision || ')'
        ELSE ''
    END ||
    CASE 
        WHEN is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END ||
    CASE 
        WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
        ELSE ''
    END ||
    ';' as recreation_sql
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 7. Backup de configuración de RLS por tabla
SELECT 
    'RLS' as type,
    schemaname,
    tablename,
    rowsecurity,
    'ALTER TABLE ' || tablename || ' ENABLE ROW LEVEL SECURITY;' as recreation_sql
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- 8. Backup de tipos de datos personalizados
SELECT 
    'TYPE' as type,
    typname,
    typtype,
    'CREATE TYPE ' || typname || ' AS ' || 
    CASE 
        WHEN typtype = 'e' THEN 'ENUM (' || 
            (SELECT string_agg(quote_literal(enumlabel), ', ') 
             FROM pg_enum 
             WHERE enumtypid = pg_type.oid) || ')'
        ELSE '/* Tipo complejo - revisar manualmente */'
    END ||
    ';' as recreation_sql
FROM pg_type 
WHERE typtype IN ('e', 'c') 
AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ═══════════════════════════════════════════════════════════════════════════════
-- INSTRUCCIONES:
-- 1. Ejecutar este script en el SQL Editor de Supabase
-- 2. Exportar los resultados a CSV o copiarlos
-- 3. Guardar los resultados en un archivo de backup
-- 4. Para restaurar, ejecutar las sentencias SQL generadas en la columna "recreation_sql"
-- ═══════════════════════════════════════════════════════════════════════════════
