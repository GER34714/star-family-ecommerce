-- ═════════════════════════════════════════════════════
-- CREAR USUARIOS EN AUTH.USERS USANDO SQL
-- ═════════════════════════════════════════════════════

-- NOTA: Los usuarios en auth.users deben crearse usando el API de Supabase
-- Este script muestra cómo hacerlo usando SQL con el admin API

-- Opción 1: Usando el Admin API (requiere service role key)
-- Esta opción solo funciona si tienes el service role key

-- Verificar si los usuarios ya existen
SELECT 'Verificando usuarios existentes en auth.users...' as status;

SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email IN ('ciborg347@gmail.com', 'starfamily@gmail.com');

-- Opción 2: Crear usuarios usando SQL RPC (si está configurado)
SELECT 'Intentando crear usuarios con RPC...' as status;

-- Función para crear usuario (si existe)
-- NOTA: Esta función debe ser creada por un admin primero

-- Opción 3: Instrucciones manuales para crear usuarios
SELECT 'INSTRUCCIONES PARA CREAR USUARIOS:' as instrucciones;
SELECT '1. Ve al dashboard de Supabase' as paso1;
SELECT '2. Navega a Authentication → Users' as paso2;
SELECT '3. Haz clic en "Add user"' as paso3;
SELECT '4. Crea los siguientes usuarios:' as paso4;
SELECT '   - Email: ciborg347@gmail.com, Password: 34714589' as usuario1;
SELECT '   - Email: starfamily@gmail.com, Password: 34714589' as usuario2;
SELECT '5. Marca "Auto-confirm" para ambos usuarios' as paso5;
SELECT '6. Haz clic en "Save"' as paso6;

-- Después de crear los usuarios, ejecuta:
SELECT 'DESPUÉS DE CREAR LOS USUARIOS, EJECUTA:' as siguientes_pasos;
SELECT 'SELECT setup_master_user(''ciborg347@gmail.com'');' as comando1;
SELECT 'SELECT setup_master_user(''starfamily@gmail.com'');' as comando2;

-- Verificación final
SELECT '✅ Script listo - ahora crea los usuarios manualmente' as resultado;

-- Consulta para verificar después de crear usuarios
SELECT 'Para verificar que los usuarios fueron creados:' as verificacion;
SELECT 'SELECT id, email FROM auth.users WHERE email IN (''ciborg347@gmail.com'', ''starfamily@gmail.com'');' as consulta_verificacion;
