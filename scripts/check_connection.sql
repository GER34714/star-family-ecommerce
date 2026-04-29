-- ═════════════════════════════════════════════════════
-- VERIFICACIÓN DE CONEXIÓN Y CONFIGURACIÓN DE SUPABASE
-- ═════════════════════════════════════════════════════

-- 1. VERIFICAR ESTRUCTURA DE TABLAS
-- ═════════════════════════════════════════════════════

SELECT 
  'TABLAS EN LA BASE DE DATOS:' as section,
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. VERIFICAR TABLA PROFILES
-- ═════════════════════════════════════════════════════

SELECT 
  'ESTADO DE TABLA PROFILES:' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. VERIFICAR POLÍTICAS RLS
-- ═════════════════════════════════════════════════════

SELECT 
  'POLÍTICAS RLS ACTIVAS:' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'products')
ORDER BY tablename, policyname;

-- 4. VERIFICAR USUARIOS EN AUTH.USERS
-- ═════════════════════════════════════════════════════

SELECT 
  'USUARIOS EN AUTH.USERS:' as section,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC;

-- 5. VERIFICAR PERFILES EXISTENTES
-- ═════════════════════════════════════════════════════

SELECT 
  'PERFILES EXISTENTES:' as section,
  p.id,
  p.email,
  p.is_master,
  p.role,
  p.created_at as profile_created,
  u.email as auth_email,
  u.created_at as user_created
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- 6. VERIFICAR TRIGGERS
-- ═════════════════════════════════════════════════════

SELECT 
  'TRIGGERS ACTIVOS:' as section,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_condition,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 7. VERIFICAR FUNCIONES
-- ═════════════════════════════════════════════════════

SELECT 
  'FUNCIONES DISPONIBLES:' as section,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%master%' OR routine_name LIKE '%user%' OR routine_name LIKE '%profile%'
ORDER BY routine_name;

-- 8. PRUEBA DE CONEXIÓN
-- ═════════════════════════════════════════════════════

SELECT 
  'PRUEBA DE CONEXIÓN:' as section,
  version() as postgres_version,
  current_database() as database_name,
  current_user as current_user,
  session_user as session_user;

-- 9. ESTADO DE RLS
-- ═════════════════════════════════════════════════════

SELECT 
  'ESTADO ROW LEVEL SECURITY:' as section,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'products')
ORDER BY tablename;

-- 10. INSTRUCCIONES PARA FRONTEND
-- ═════════════════════════════════════════════════════

SELECT 
  'CONFIGURACIÓN FRONTEND REQUERIDA:' as section,
  'Verificar .env con REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY' as env_config,
  'Usar getSupabaseClient() desde src/supabaseClient.js' as client_usage,
  'Autenticar con supabase.auth.signInWithPassword()' as auth_method;
