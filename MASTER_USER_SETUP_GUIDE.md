# 📚 Guía de Configuración - Sistema de Usuarios Maestros

## 🎯 Resumen del Sistema

Se ha implementado un sistema completo de **Usuarios Maestros** con las siguientes características:

- **Base de datos segura** con Row Level Security (RLS)
- **Autenticación integrada** con Supabase
- **Protección a nivel frontend** con componentes especializados
- **Gestión centralizada** de usuarios y permisos

## 📁 Archivos Creados

### Scripts SQL (Base de Datos)
1. **`scripts/create-master-users-system.sql`** - Creación de tabla profiles y configuración básica
2. **`scripts/insert-master-users.sql`** - Inserción de usuarios maestros iniciales
3. **`scripts/master-user-rls-policies.sql`** - Políticas de seguridad RLS completas

### Componentes Frontend
1. **`src/useMasterUser.js`** - Hook personalizado para gestión de usuarios maestros
2. **`src/MasterProtectedRoute.jsx`** - Componentes de protección de rutas
3. **`src/UserManagement.jsx`** - Panel de gestión de usuarios

---

## 🚀 Pasos de Instalación

### 1. Configuración de la Base de Datos

Ejecuta los siguientes scripts en orden en el editor SQL de Supabase:

```sql
-- Paso 1: Crear tabla y configuración básica
-- Ejecutar: scripts/create-master-users-system.sql

-- Paso 2: Configurar políticas de seguridad
-- Ejecutar: scripts/master-user-rls-policies.sql

-- Paso 3: Insertar usuarios maestros (después de crearlos en auth)
-- Ejecutar: scripts/insert-master-users.sql
```

### 2. Creación de Usuarios Maestros

#### Opción A: Desde el Dashboard de Supabase
1. Ve a **Authentication → Users**
2. Crea los siguientes usuarios:
   - **Email:** `ciborg347@gmail.com` | **Contraseña:** `34714589`
   - **Email:** `starfamily@gmail.com` | **Contraseña:** `34714589`
3. Ejecuta el script `insert-master-users.sql` para asignar permisos

#### Opción B: Desde el Frontend (después de implementación)
1. Inicia sesión como usuario maestro existente
2. Ve al panel de gestión de usuarios
3. Crea nuevos usuarios con la opción "Usuario Master" activada

### 3. Integración en el Frontend

#### Importar el hook en tu componente principal:
```javascript
import { useMasterUser } from './useMasterUser';
```

#### Usar componentes de protección:
```javascript
import { MasterProtectedRoute, MasterProtectedButton } from './MasterProtectedRoute';

// Para proteger una sección completa
<MasterProtectedRoute>
  <UserManagement />
</MasterProtectedRoute>

// Para proteger un botón específico
<MasterProtectedButton onClick={handleAdminAction}>
  Acción Administrativa
</MasterProtectedButton>
```

---

## 🔐 Sistema de Seguridad

### Niveles de Protección

1. **Nivel Base de Datos (RLS)**
   - Solo usuarios maestros pueden INSERT/UPDATE/DELETE en `profiles`
   - Solo usuarios maestros pueden INSERT/UPDATE/DELETE en `products`
   - Usuarios normales solo pueden leer su propio perfil

2. **Nivel Frontend**
   - Componentes de protección visual
   - Validación antes de ejecutar acciones
   - Mensajes claros de acceso denegado

3. **Nivel API**
   - Verificación automática del estado de master
   - Funciones seguras con validación de permisos

### Políticas RLS Implementadas

```sql
-- Ejemplo de política para profiles
CREATE POLICY "Masters can insert profiles" ON profiles
  FOR INSERT WITH CHECK (check_master_user());

-- Solo usuarios con is_master = true pueden insertar
```

---

## 👥 Usuarios Configurados

### Usuarios Maestros Iniciales
| Email | Contraseña | Rol | Estado |
|-------|------------|-----|---------|
| ciborg347@gmail.com | 34714589 | Master | ⏳ Por configurar |
| starfamily@gmail.com | 34714589 | Master | ⏳ Por configurar |

### Verificación de Configuración
```sql
-- Consulta para verificar usuarios maestros
SELECT 
  p.email,
  p.is_master,
  p.role,
  p.created_at
FROM profiles p
WHERE p.is_master = true;
```

---

## 🛠️ Uso del Sistema

### Para Usuarios Maestros

1. **Iniciar Sesión**
   ```javascript
   const { signIn } = useMasterUser();
   await signIn('ciborg347@gmail.com', '34714589');
   ```

2. **Gestionar Usuarios**
   - Acceder al panel de gestión de usuarios
   - Crear nuevos usuarios
   - Asignar permisos de master
   - Eliminar usuarios

3. **Verificar Permisos**
   ```javascript
   const { isMaster, checkPermission } = useMasterUser();
   
   if (isMaster) {
     // Ejecutar acción administrativa
   }
   ```

### Para Usuarios Normales

1. **Acceso Limitado**
   - Solo pueden ver su propio perfil
   - No pueden acceder a funciones administrativas
   - Mensajes claros de acceso denegado

---

## 🔧 Mantenimiento

### Monitoreo
- Revisar logs de Supabase para accesos no autorizados
- Verificar que las políticas RLS estén funcionando
- Monitorear creación de nuevos usuarios

### Actualizaciones
- Mantener seguros los credenciales de usuarios maestros
- Actualizar políticas si se agregan nuevas tablas
- Revisar permisos periódicamente

### Respaldo
- Crear puntos de restauración antes de cambios importantes
- Documentar cualquier modificación al sistema
- Mantener registro de usuarios maestros

---

## 🚨 Consideraciones de Seguridad

1. **Contraseñas Fuertes**
   - Las contraseñas proporcionadas son temporales
   - Cambiarlas después del primer inicio de sesión

2. **Principio de Mínimo Privilegio**
   - Solo asignar permisos de master cuando sea necesario
   - Usar roles específicos para diferentes niveles de acceso

3. **Auditoría**
   - Mantener registro de cambios en permisos
   - Monitorear accesos a funciones administrativas

4. **Validación Doble**
   - Protección a nivel de base de datos (RLS)
   - Protección a nivel de frontend
   - Validación en el backend si es necesario

---

## 📞 Soporte y Troubleshooting

### Problemas Comunes

1. **"Acceso denegado" en operaciones**
   - Verificar que el usuario tiene `is_master = true`
   - Revisar que las políticas RLS estén activas

2. **No aparecen los usuarios maestros**
   - Ejecutar la consulta de verificación
   - Asegurarse que los usuarios existen en `auth.users`

3. **Error en el frontend**
   - Verificar la configuración de Supabase
   - Revisar que los componentes estén importados correctamente

### Consultas Útiles

```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'products');

-- Verificar usuarios con permisos
SELECT * FROM profiles WHERE is_master = true;

-- Probar función de verificación
SELECT check_master_user();
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar scripts SQL en orden
- [ ] Crear usuarios maestros en auth.users
- [ ] Asignar permisos de master
- [ ] Integrar componentes frontend
- [ ] Probar acceso con usuarios maestros
- [ ] Probar acceso con usuarios normales
- [ ] Verificar políticas RLS
- [ ] Documentar usuarios y permisos

---

**🎉 ¡Sistema de Usuarios Maestros configurado exitosamente!**

El sistema ahora proporciona un control granular de acceso con múltiples capas de seguridad, asegurando que solo los usuarios autorizados puedan realizar operaciones críticas en la base de datos y la aplicación.
