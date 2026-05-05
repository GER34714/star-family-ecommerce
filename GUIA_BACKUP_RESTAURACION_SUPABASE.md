# 📋 Guía Completa de Backup y Restauración de Supabase

## 🎯 Objetivo
Esta guía te permite crear backups completos de todas las reglas de Supabase y restaurarlas fácilmente en caso de cualquier inconveniente.

## 📁 Archivos Disponibles

### 1. **BACKUP_COMPLETE_SUPABASE_RULES.js**
- **Propósito**: Script automatizado para crear backup completo
- **Formato**: Genera archivos JSON y SQL
- **Uso**: `node BACKUP_COMPLETE_SUPABASE_RULES.js`

### 2. **RESTORE_SUPABASE_RULES.js**
- **Propósito**: Script automatizado para restaurar desde backup
- **Formato**: Lee archivos JSON o SQL
- **Uso**: `node RESTORE_SUPABASE_RULES.js <archivo_backup>`

### 3. **CREATE_MANUAL_BACKUP.sql**
- **Propósito**: Script SQL para backup manual directo en Supabase
- **Formato**: Consultas SQL que generan sentencias de recreación
- **Uso**: Ejecutar directamente en SQL Editor de Supabase

## 🚀 Métodos de Backup

### Método 1: Automatizado (Recomendado)

```bash
# 1. Configurar variables de entorno
export SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# 2. Ejecutar backup
node BACKUP_COMPLETE_SUPABASE_RULES.js
```

**Resultado**: Se generan dos archivos:
- `SUPABASE_COMPLETE_RULES_BACKUP_YYYY-MM-DDTHH-MM-SS.json`
- `SUPABASE_COMPLETE_RULES_BACKUP_YYYY-MM-DDTHH-MM-SS.sql`

### Método 2: Manual (Alternativa)

1. Abre el **SQL Editor** en tu dashboard de Supabase
2. Copia y ejecuta el contenido de `CREATE_MANUAL_BACKUP.sql`
3. Exporta los resultados a CSV o cópialos
4. Guarda los resultados en un archivo de backup

## 🔄 Métodos de Restauración

### Método 1: Automatizado (Recomendado)

```bash
# Listar backups disponibles
node RESTORE_SUPABASE_RULES.js --list

# Restaurar desde JSON
node RESTORE_SUPABASE_RULES.js SUPABASE_COMPLETE_RULES_BACKUP_2026-05-05T17-50-31-363Z.json

# Restaurar desde SQL
node RESTORE_SUPABASE_RULES.js SUPABASE_COMPLETE_RULES_BACKUP_2026-05-05T17-50-31-363Z.sql
```

### Método 2: Manual

1. Abre el **SQL Editor** en tu dashboard de Supabase
2. Ejecuta las sentencias SQL generadas en el backup
3. Verifica que todas las reglas se hayan restaurado correctamente

## 📊 Qué se Incluye en el Backup

### ✅ Elementos Respaldados
- **Políticas RLS**: Todas las políticas de seguridad a nivel de fila
- **Funciones Personalizadas**: Funciones SQL definidas por el usuario
- **Triggers**: Disparadores automáticos en la base de datos
- **Índices**: Índices de rendimiento de tablas
- **Constraints**: Restricciones de integridad (PK, FK, UNIQUE, etc.)
- **Estructura de Tablas**: Definición completa de columnas y tipos
- **Configuración RLS**: Estado de Row Level Security por tabla
- **Tipos Personalizados**: Enumeraciones y tipos de datos personalizados
- **Storage**: Configuración de buckets (si es accesible)

### ⚠️ Limitaciones Conocidas
- Algunos triggers pueden necesitar ajuste manual
- La configuración de storage puede requerir configuración manual en el dashboard
- Las políticas de storage se configuran manualmente en el dashboard

## 🔧 Configuración Requerida

### Variables de Entorno
```bash
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
```

### Permisos Necesarios
- **Service Role Key**: Requerida para acceso completo a la base de datos
- **Permisos de administrador**: Para crear/modificar políticas y funciones

## 📋 Proceso Recomendado

### Antes de Realizar Cambios
1. **Crear backup**: Ejecuta siempre un backup antes de cambios importantes
2. **Verificar backup**: Revisa que los archivos se generen correctamente
3. **Documentar cambios**: Anota qué cambios vas a realizar

### Después de Realizar Cambios
1. **Probar cambios**: Verifica que todo funcione correctamente
2. **Crear nuevo backup**: Genera un backup post-cambios
3. **Archivar backups**: Mantén un historial de backups importantes

## 🚨 Buenas Prácticas

### Seguridad
- **Nunca compartas** tu Service Role Key
- **Guarda backups** en ubicaciones seguras
- **Usa versionado** para tracking de cambios

### Organización
- **Nombra backups** con fecha y hora clara
- **Mantén backups** recientes y antiguos
- **Documenta** cada backup con su propósito

### Testing
- **Prueba restauración** en entorno de desarrollo
- **Verifica integridad** después de restaurar
- **Mantén registro** de restauraciones realizadas

## 🔍 Solución de Problemas

### Errores Comunes

#### "fetch failed"
- **Causa**: Problemas de conexión o credenciales incorrectas
- **Solución**: Verifica SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY

#### "Permission denied"
- **Causa**: Permisos insuficientes con la clave utilizada
- **Solución**: Usa Service Role Key con permisos de administrador

#### "Policy already exists"
- **Causa**: La política ya existe en la base de datos
- **Solución**: El script automáticamente elimina políticas existentes antes de recrear

#### "Function not found"
- **Causa**: Función auxiliar no disponible
- **Solución**: El script intenta crear funciones auxiliares automáticamente

### Verificación Post-Restauración
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name NOT LIKE 'pg_%';

-- Verificar triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs de error en los scripts
2. Verifica credenciales y permisos
3. Prueba el método manual como alternativa
4. Contacta al equipo de soporte si es necesario

---

**Nota Importante**: Esta guía está diseñada para el proyecto Star Family E-commerce. Asegúrate de adaptar las configuraciones según tu proyecto específico.
