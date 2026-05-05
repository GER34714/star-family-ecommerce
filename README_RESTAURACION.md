# 🔄 STAR FAMILY E-COMMERCE - GUÍA DE RESTAURACIÓN COMPLETA

**Fecha:** 2026-05-05  
**Versión:** v1.0.0  
**Proyecto:** Star Family E-commerce - Mayorista  

---

## 📋 TABLA DE CONTENIDO

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Supabase](#configuración-de-supabase)
3. [Instalación del Frontend](#instalación-del-frontend)
4. [Configuración de Mercado Pago](#configuración-de-mercado-pago)
5. [Despliegue](#despliegue)
6. [Verificación Final](#verificación-final)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 REQUISITOS PREVIOS

### Software Necesario
- **Node.js** v16+ (recomendado v18)
- **npm** o **yarn** para gestión de paquetes
- **Git** para control de versiones
- **Editor de código** (VS Code recomendado)

### Cuentas y Servicios
- **Supabase** (cuenta gratuita o pro)
- **Mercado Pago** (cuenta developer)
- **Dominio** (opcional, para producción)

### Conocimientos Básicos
- Conceptos básicos de **React**
- Conocimiento de **SQL** básico
- Manejo de **terminal/command line**
- Conceptos de **variables de entorno**

---

## 🗄️ CONFIGURACIÓN DE SUPABASE

### 1. Crear Proyecto en Supabase

#### Paso 1: Iniciar Sesión
1. Visita [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea una nueva organización: **"Star Family"**

#### Paso 2: Crear Proyecto
1. Clic en **"New Project"**
2. Nombre del proyecto: **"star-family-ecommerce"**
3. Contraseña de base de datos: **guarda esta contraseña**
4. Región: **elige la más cercana a tus usuarios**
5. Espera a que se cree el proyecto (2-3 minutos)

#### Paso 3: Obtener Credenciales
1. Una vez creado, ve a **Settings → API**
2. Copia los siguientes valores:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: (guardar, no usar en frontend)

### 2. Ejecutar Schema de Base de Datos

#### Paso 1: Acceder al Editor SQL
1. En el Dashboard de Supabase, ve a **SQL Editor**
2. Crea una nueva consulta

#### Paso 2: Ejecutar Schema Principal
1. Copia el contenido del archivo **`supabase_schema.sql`**
2. Pega en el editor SQL
3. Clic en **"Run"** o presiona `Ctrl+Enter`
4. Espera a que se ejecuten todas las consultas

#### Paso 3: Verificar Creación
```sql
-- Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Debe mostrar:
-- categories
-- products  
-- profiles
-- price_history
-- restoration_points
```

#### Paso 4: Ejecutar Políticas RLS
1. Copia el contenido del archivo **`supabase_rls.sql`**
2. Pega en el editor SQL
3. Ejecuta todas las políticas

#### Paso 5: Ejecutar Funciones y Triggers
1. Copia el contenido del archivo **`supabase_functions.sql`**
2. Pega en el editor SQL
3. Ejecuta todas las funciones

### 3. Configurar Storage

#### Paso 1: Crear Bucket
1. Ve a **Storage** en el menú lateral
2. Clic en **"New bucket"**
3. Configura:
   - **Name**: `products`
   - **Public bucket**: `NO`
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/*`

#### Paso 2: Configurar Políticas de Storage
1. En la misma sección de Storage, ve a **Policies**
2. Crea las siguientes políticas una por una:

**POLÍTICA 1: Lectura Pública**
- **Name**: `Public Read Access`
- **Allowed operation**: `SELECT`
- **Target roles**: `anon`, `authenticated`
- **Policy definition**: `{"bucket": "products"}`
- **SQL**: `SELECT * FROM storage.objects WHERE bucket_id = 'products'`

**POLÍTICA 2: Inserción Autenticada**
- **Name**: `Authenticated Insert`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**: `{"bucket": "products", "owner": auth.uid()}`
- **SQL**: `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('products', name, auth.uid())`

**POLÍTICA 3: Actualización de Dueño**
- **Name**: `Owner Update`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy definition**: `{"bucket": "products", "owner": auth.uid()}`
- **SQL**: `UPDATE storage.objects SET name = EXCLUDED.name WHERE bucket_id = 'products' AND auth.uid() = owner`

**POLÍTICA 4: Eliminación de Dueño**
- **Name**: `Owner Delete`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**: `{"bucket": "products", "owner": auth.uid()}`
- **SQL**: `DELETE FROM storage.objects WHERE bucket_id = 'products' AND auth.uid() = owner`

### 4. Crear Usuarios Maestros

#### Paso 1: Crear Usuarios en Authentication
1. Ve a **Authentication → Users**
2. Clic en **"Add user"**
3. Crea usuarios iniciales:
   - **Email**: `admin@starfamily.com`
   - **Password**: `tu-contraseña-segura`
   - **Auto-confirm**: `marcado`

#### Paso 2: Asignar Permisos de Master
1. Ve al **SQL Editor**
2. Ejecuta la siguiente función para cada usuario master:
```sql
SELECT setup_master_user('admin@starfamily.com');
```

#### Paso 3: Verificar Configuración
```sql
-- Verificar usuarios maestros
SELECT email, is_master, role, created_at
FROM profiles 
WHERE is_master = true;
```

---

## 💻 INSTALACIÓN DEL FRONTEND

### 1. Preparar Entorno Local

#### Paso 1: Obtener el Código
```bash
# Si tienes el código en ZIP, descomprime
# Si está en Git, clona el repositorio
git clone <URL_DEL_REPOSITORIO>
cd star-family-ecommerce

# O copia los archivos del backup
```

#### Paso 2: Instalar Dependencias
```bash
# Limpiar caché de npm (opcional pero recomendado)
npm cache clean --force

# Instalar dependencias
npm install

# Si hay problemas con npm, intenta con yarn
# yarn install
```

#### Paso 3: Configurar Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env.local

# Editar el archivo .env.local
nano .env.local
# o usa tu editor preferido
```

#### Paso 4: Configurar .env.local
```bash
# ═════════════════════════════════════════════════════
# STAR FAMILY E-COMMERCE - CONFIGURACIÓN LOCAL
# ═════════════════════════════════════════════════════

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Mercado Pago Configuration (modo test)
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# API Configuration (opcional)
REACT_APP_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

**IMPORTANTE**: Reemplaza los valores placeholder con tus credenciales reales.

### 2. Ejecutar en Desarrollo

#### Paso 1: Iniciar Servidor
```bash
# Iniciar servidor de desarrollo
npm start

# El servidor iniciará en:
# http://localhost:3000
```

#### Paso 2: Acceder a la Aplicación
1. Abre tu navegador
2. Ve a `http://localhost:3000`
3. Deberías ver la página principal de Star Family

#### Paso 3: Probar Acceso de Admin
1. Clic en **"Admin"** en la navegación
2. Ingresa con el usuario master:
   - **Email**: `admin@starfamily.com`
   - **Password**: `tu-contraseña`
3. Deberías acceder al panel de administración

### 3. Verificar Funcionalidades

#### Checklist Básico:
- [ ] Página principal carga correctamente
- [ ] Productos se muestran en el catálogo
- [ ] Búsqueda funciona
- [ ] Filtros por categoría funcionan
- [ ] Carrito de compras funciona
- [ ] Panel de admin es accesible
- [ ] Creación de productos funciona
- [ ] Subida de imágenes funciona

---

## 💳 CONFIGURACIÓN DE MERCADO PAGO

### 1. Crear Cuenta de Mercado Pago

#### Paso 1: Registrarse
1. Visita [mercadopago.com/developers](https://www.mercadopago.com/developers)
2. Crea una cuenta o inicia sesión
3. Completa el proceso de verificación

#### Paso 2: Crear Aplicación
1. En el dashboard, ve a **"Tus aplicaciones"**
2. Clic en **"Crear aplicación"**
3. Configura:
   - **Nombre**: `Star Family E-commerce`
   - **Descripción**: `Tienda online de productos mayoristas`
   - **Categoría**: `E-commerce`

#### Paso 3: Obtener Credenciales
1. Una vez creada la aplicación, ve a **"Credenciales"**
2. Copia las siguientes claves:
   - **Public Key**: `APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Access Token**: `APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Configurar URLs de Retorno

#### Paso 1: Configurar en Mercado Pago
1. En la configuración de tu aplicación, ve a **"URL de retorno"**
2. Configura las siguientes URLs:
   - **Success**: `https://tudominio.com/payment/success`
   - **Failure**: `https://tudominio.com/payment/failure`
   - **Pending**: `https://tudominio.com/payment/pending`

#### Paso 2: Webhook (Opcional)
1. Configura webhook para notificaciones:
   - **Notification URL**: `https://tudominio.com/api/webhooks/mercadopago`
   - **Events**: `payment_created`, `payment_updated`

### 3. Actualizar Variables de Entorno

#### Paso 1: Modo Desarrollo
```bash
# En .env.local
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Paso 2: Modo Producción
```bash
# En .env.production (para despliegue)
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Probar Integración

#### Paso 1: Probar en Desarrollo
1. Agrega productos al carrito
2. Clic en **"Pagar"**
3. Selecciona **"Pagar con Mercado Pago"**
4. Debería aparecer el botón de Mercado Pago

#### Paso 2: Probar Flujo Completo
1. Completa el proceso de pago
2. Verifica que llegues a las páginas de retorno
3. Confirma que recibas las notificaciones (si configuraste webhook)

---

## 🚀 DESPLIEGUE

### Opción 1: Vercel (Recomendado)

#### Paso 1: Preparar para Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login en Vercel
vercel login

# Build para producción
npm run build
```

#### Paso 2: Desplegar
```bash
# Desplegar en Vercel
vercel --prod

# Seguir las instrucciones:
# - Conectar cuenta de Vercel
# - Seleccionar configuración (presets: Create React App)
# - Confirmar despliegue
```

#### Paso 3: Configurar Variables en Vercel
1. Ve al dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a **Settings → Environment Variables**
4. Agrega todas las variables de entorno:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_MERCADO_PAGO_PUBLIC_KEY`
   - `REACT_APP_MERCADO_PAGO_ACCESS_TOKEN`

### Opción 2: Netlify

#### Paso 1: Preparar para Netlify
```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Login en Netlify
netlify login

# Build para producción
npm run build
```

#### Paso 2: Desplegar
```bash
# Desplegar en Netlify
netlify deploy --prod --dir=build

# Seguir las instrucciones del CLI
```

#### Paso 3: Configurar Variables en Netlify
1. Ve al dashboard de Netlify
2. Selecciona tu sitio
3. Ve a **Site settings → Build & deploy → Environment**
4. Agrega todas las variables de entorno

### Opción 3: Servidor Propio

#### Paso 1: Configurar Servidor Web
```bash
# Usar nginx (recomendado para producción)
sudo apt update
sudo apt install nginx

# Configurar nginx
sudo nano /etc/nginx/sites-available/star-family
```

#### Paso 2: Configuración de Nginx
```nginx
server {
    listen 80;
    server_name tudominio.com;
    
    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tudominio.com;
    
    # Certificados SSL (usa Let's Encrypt)
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Directorio del build
    root /var/www/star-family/build;
    index index.html;
    
    # Manejar rutas de React
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Optimización para assets estáticos
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### Paso 3: Desplegar Archivos
```bash
# Copiar build al servidor
sudo cp -r build/* /var/www/star-family/

# Reiniciar nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## ✅ VERIFICACIÓN FINAL

### 1. Checklist de Funcionalidades

#### Frontend
- [ ] **Página Principal**: Carga correctamente en todos los dispositivos
- [ ] **Catálogo**: Muestra productos con imágenes y precios
- [ ] **Búsqueda**: Funciona en tiempo real
- [ ] **Filtros**: Por categoría, precio y estado
- [ ] **Carrito**: Agregar, eliminar y modificar productos
- [ ] **Checkout**: Flujo completo de pago
- [ ] **Responsive**: Funciona en móviles, tablets y desktop
- [ ] **PWA**: Se puede instalar como aplicación

#### Panel de Administración
- [ ] **Acceso**: Login con usuarios maestros funciona
- [ ] **Gestión de Productos**: Crear, editar, eliminar
- [ ] **Gestión de Categorías**: Crear y administrar categorías
- [ ] **Subida de Imágenes**: Funciona con Storage de Supabase
- [ ] **Gestión de Precios**: Individual y masivo
- [ ] **Historial**: Registro de cambios de precios
- [ ] **Backup/Restore**: Puntos de restauración funcionan
- [ ] **Importación Excel**: Carga de productos desde archivo

#### Backend/Database
- [ ] **Conexión**: Frontend se conecta a Supabase
- [ ] **RLS**: Políticas de seguridad funcionan correctamente
- [ ] **Storage**: Imágenes se suben y son accesibles
- [ ] **Autenticación**: Login y logout funcionan
- [ ] **Permisos**: Usuarios maestros tienen acceso completo

#### Integraciones
- [ ] **Mercado Pago**: Botón aparece y funciona
- [ ] **WhatsApp**: Compartir carrito funciona
- [ ] **PWA**: Service worker funciona correctamente
- [ ] **SEO**: Meta tags y estructura correcta

### 2. Tests de Estrés

#### Pruebas de Carga
```bash
# Probar con múltiples usuarios simultáneos
# Puedes usar herramientas como:
# - Apache JMeter
# - k6
# - Artillery
```

#### Pruebas de Funcionalidad
1. **Crear 50+ productos** con imágenes
2. **Procesar 10+ pedidos** simultáneos
3. **Subir imágenes grandes** (hasta 5MB)
4. **Probar importación** de 100+ productos desde Excel
5. **Verificar rendimiento** con 1000+ productos

### 3. Monitoreo

#### Configurar Alertas
1. **Supabase**: Configurar alertas de uso
2. **Mercado Pago**: Configurar notificaciones de pagos
3. **Servidor**: Monitorear CPU, memoria y disco
4. **Dominio**: Configurar Uptime monitoring

#### Métricas Clave
- **Uptime**: >99.5%
- **Tiempo de carga**: <3 segundos
- **Tasa de conversión**: Monitorear checkout
- **Errores**: <1% de las solicitudes

---

## 🔧 TROUBLESHOOTING

### Problemas Comunes y Soluciones

#### 1. Error de Conexión a Supabase
**Síntoma**: `NetworkError` o `CORS error`
**Causa**: URL o key incorrectos
**Solución**:
```bash
# Verificar .env.local
echo $REACT_APP_SUPABASE_URL
echo $REACT_APP_SUPABASE_ANON_KEY

# Asegurar que no haya espacios ni caracteres extraños
# Reiniciar servidor después de cambios
npm start
```

#### 2. Error de Permisos (RLS)
**Síntoma**: `permission denied for table`
**Causa**: Políticas RLS mal configuradas
**Solución**:
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'products';

-- Re-ejecutar políticas RLS
-- Contenido de supabase_rls.sql
```

#### 3. Error al Subir Imágenes
**Síntoma**: `Storage error` o `Permission denied`
**Causa**: Políticas de storage incorrectas
**Solución**:
1. Verificar configuración de bucket en Dashboard
2. Revisar políticas de storage
3. Verificar tamaño y tipo de archivo

#### 4. Error de Mercado Pago
**Síntoma**: `Invalid credentials` o `CORS error`
**Causa**: Keys incorrectas o URLs mal configuradas
**Solución**:
```bash
# Verificar keys
echo $REACT_APP_MERCADO_PAGO_PUBLIC_KEY
echo $REACT_APP_MERCADO_PAGO_ACCESS_TOKEN

# Usar keys de TEST para desarrollo
# Usar keys de PROD para producción
```

#### 5. Build Fallido
**Síntoma**: Error durante `npm run build`
**Causa**: Variables de entorno faltantes o errores de código
**Solución**:
```bash
# Limpiar cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Verificar variables de entorno
npm run build
```

#### 6. PWA No Funciona
**Síntoma**: No aparece opción de instalar
**Causa**: Service worker mal configurado o HTTPS faltante
**Solución**:
1. Verificar `manifest.json`
2. Asegurar HTTPS en producción
3. Probar con Chrome DevTools → Application → Manifest

### Herramientas de Debugging

#### Frontend
```bash
# React Developer Tools
# Chrome DevTools
# Redux DevTools (si usas Redux)
```

#### Backend
```bash
# Supabase Logs
# Supabase Database Inspector
# Network tab en browser DevTools
```

#### Monitoro
```bash
# Vercel Analytics (si usas Vercel)
# Netlify Analytics (si usas Netlify)
# Google Analytics (opcional)
```

---

## 📞 SOPORTE Y CONTACTO

### Recursos Oficiales
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **React Docs**: [reactjs.org/docs](https://reactjs.org/docs)
- **Mercado Pago Docs**: [mercadopago.com/developers](https://www.mercadopago.com/developers)

### Comunidad
- **Supabase Discord**: [discord.gg/supabase](https://discord.gg/supabase)
- **Stack Overflow**: Etiquetas `supabase`, `react`, `mercadopago`

### Soporte Técnico
- **Issues de GitHub**: Reportar bugs en el repositorio
- **Email de Soporte**: Para consultas técnicas
- **Documentación**: Revisar archivos SQL y código fuente

---

## 🎯 RESUMEN FINAL

### ✅ Proyecto Restaurado Exitosamente

Este documento te ha guiado a través del proceso completo de restauración del proyecto Star Family E-commerce, incluyendo:

1. **✅ Configuración completa de Supabase**
   - Base de datos con todas las tablas
   - Políticas RLS configuradas
   - Storage para imágenes funcionando
   - Usuarios maestros creados

2. **✅ Frontend React funcionando**
   - Todas las dependencias instaladas
   - Variables de entorno configuradas
   - Aplicación corriendo localmente
   - PWA funcionando correctamente

3. **✅ Integraciones completas**
   - Mercado Pago configurado
   - Sistema de autenticación funcionando
   - Storage de imágenes operativo
   - Carrito y checkout funcionando

4. **✅ Despliegue listo**
   - Build optimizado generado
   - Opciones de despliegue documentadas
   - Configuración de producción lista
   - Monitoreo configurado

### 🚀 Próximos Pasos Recomendados

1. **Monitoreo continuo**: Configurar alertas y métricas
2. **Optimización**: Implementar cache y CDN
3. **Testing**: Agregar tests automatizados
4. **Seguridad**: Revisión periódica de permisos
5. **Escalabilidad**: Plan para crecimiento del tráfico

---

**¡Felicidades! Has restaurado exitosamente el proyecto Star Family E-commerce. 🎉**

El sistema está listo para producción y puede comenzar a recibir pedidos. Mantén este documento como referencia para mantenimiento futuro.

---

*Última actualización: 2026-05-05*  
*Versión: v1.0.0*  
*Estado: ✅ Completo y Probado*
