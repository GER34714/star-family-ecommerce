# 🚀 Guía de Deploy en Render - Star Family Ecommerce

## ⚠️ PROBLEMA ACTUAL: "Not Found" en API endpoints

El error `Unexpected token 'N', 'Not Found' is not valid JSON` indica que Render está devolviendo HTML "Not Found" en lugar de ejecutar el server.js.

## 🔧 CONFIGURACIÓN CORRECTA EN RENDER

### 1. Build Command
```
npm install && npm run build
```

### 2. Start Command  
```
npm start
```

### 3. Variables de Entorno (Environment Variables)
```
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-6318323343884379-051213-1de2b6c067eeb716b1e4ed751da8f3ac-1016520294
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=APP_USR-2601bd12-3a55-4f18-a4d2-b907a571537c
NODE_ENV=production
```

### 4. Health Check Path
```
/api/health
```

## 🔍 DIAGNÓSTICO DEL PROBLEMA

### Posibles Causas:
1. **Render no está ejecutando server.js** - está sirviendo solo archivos estáticos
2. **El build no está generando la carpeta build/**
3. **El start command no está configurado correctamente**
4. **Las rutas API no están registradas antes del catch-all**

### Verificación en Render Dashboard:
1. **Build Log**: Revisar que `npm run build` genere carpeta `build/`
2. **Server Log**: Verificar que el servidor Express inicie correctamente
3. **Environment**: Confirmar variables de entorno configuradas

## 🛠️ SOLUCIONES

### Opción 1: Verificar Configuración Actual
1. En Render dashboard → tu servicio
2. Revisar "Build & Deploy Settings"
3. Confirmar que "Start Command" sea `npm start`
4. Verificar que "Build Command" sea `npm install && npm run build`

### Opción 2: Re-deploy Forzado
1. En Render dashboard → Manual Deploy
2. Seleccionar "Deploy latest commit"
3. Esperar a que termine y revisar logs

### Opción 3: Verificar Estructura de Archivos
El proyecto debe tener esta estructura:
```
/
├── server.js (servidor Express)
├── package.json (con "start": "node server.js")
├── build/ (generado por npm run build)
│   ├── index.html
│   └── static/
└── src/
    └── App.jsx
```

## 🧪 TESTING

### 1. Health Check
```
GET https://tu-app.onrender.com/api/health
```
**Response esperado:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-05-13T...",
  "environment": "production"
}
```

### 2. Mercado Pago API
```
POST https://tu-app.onrender.com/api/create-mercadopago-preference
```

## 📋 LOGS IMPORTANTES

### Server Start Logs (deben verse en Render):
```
[2026-05-13T...] 🚀 Server running on port 10000
[2026-05-13T...] 📡 Environment: production
[2026-05-13T...] 🏥 Health check: http://localhost:10000/api/health
[2026-05-13T...] 💳 Mercado Pago API: http://localhost:10000/api/create-mercadopago-preference
```

### Request Logs:
```
[2026-05-13T...] GET /api/health
[2026-05-13T...] Health check requested
```

## 🚨 SI SIGUE FALLANDO

### Verificar en Render:
1. **Service Type**: Debe ser "Web Service"
2. **Runtime**: Node.js (última versión)
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Health Check Path**: `/api/health`

### Debug Steps:
1. Revisar "Build Log" - ¿se generó carpeta `build/`?
2. Revisar "Server Log" - ¿inició Express server?
3. Testear health check manualmente
4. Revisar variables de entorno

## 🎯 EXITO ESPERADO

Una vez configurado correctamente:
- ✅ Health check devuelve JSON válido
- ✅ Mercado Pago API responde correctamente
- ✅ App React funciona en producción
- ✅ Checkout de Mercado Pago opera sin errores
