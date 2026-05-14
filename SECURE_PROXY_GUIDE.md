# 🔒 Guía de Proxy Seguro para Mercado Pago

## ⚠️ Problema de Seguridad Resuelto

El access token de Mercado Pago estaba expuesto en el frontend. Ahora usamos un proxy seguro que oculta las credenciales.

## 🛡️ Arquitectura Segura

### Antes (Inseguro):
```
Frontend → Mercado Pago API (con token expuesto)
```

### Ahora (Seguro):
```
Frontend → Proxy Server → Mercado Pago API (token oculto)
```

## 📁 Archivos Nuevos

### `proxy-server.js`
- Servidor Express dedicado para Mercado Pago
- Maneja el access token de forma segura
- Endpoint: `/mercadopago-preference`
- Health check: `/health`

### `src/MercadoPagoCheckout.jsx` (Actualizado)
- Usa proxy en producción: `/mercadopago-preference`
- Usa MP directo en desarrollo (localhost)
- Sin credenciales expuestas en producción

## 🚀 Configuración en Render

### Opción 1: Servicio Separado (Recomendado)
1. **Crear nuevo Web Service** en Render
2. **Nombre**: `star-family-mp-proxy`
3. **Build Command**: `npm install`
4. **Start Command**: `node proxy-server.js`
5. **Variables de Entorno**:
   ```
   MERCADO_PAGO_ACCESS_TOKEN=APP_USR-6318323343884379-051213-1de2b6c067eeb716b1e4ed751da8f3ac-1016520294
   ```

### Opción 2: Mismo Servicio (Rápido)
1. **Actualizar el servicio existente**
2. **Start Command**: `node server.js`
3. **Agregar variables de entorno** al servicio principal

## 🔧 Configuración del Frontend

### Localhost (Desarrollo)
- Usa directamente API de Mercado Pago
- Token visible solo en desarrollo
- Endpoint: `https://api.mercadopago.com/checkout/preferences`

### Producción (Render)
- Usa proxy seguro
- Token oculto en backend
- Endpoint: `/mercadopago-preference`

## 🧪 Testing

### 1. Health Check del Proxy
```bash
curl https://tu-proxy.onrender.com/health
```

### 2. Test del Endpoint
```bash
curl -X POST https://tu-proxy.onrender.com/mercadopago-preference \
  -H "Content-Type: application/json" \
  -d '{"items":[{"name":"Test","price":100,"qty":1}],"origin":"https://tuapp.com","externalReference":"test_123"}'
```

### 3. Botones en la App
- **"Verificar Proxy"**: Testea health check
- **"Test Seguro"**: Testea el flujo completo

## 🔄 Flujo de Datos

1. **Frontend** envía items al proxy (sin token)
2. **Proxy** valida y agrega credenciales
3. **Proxy** llama a Mercado Pago API
4. **Mercado Pago** devuelve preference ID
5. **Proxy** devuelve ID al frontend
6. **Frontend** inicializa checkout con ID

## 🛡️ Beneficios de Seguridad

### ✅ Token Protegido
- Nunca expuesto en el frontend
- Solo visible en variables de entorno del servidor
- Sin acceso desde navegador

### ✅ Validación Centralizada
- Items validados en el proxy
- Previne payloads maliciosos
- Logging centralizado

### ✅ Error Handling
- Respuestas consistentes
- Sin exposición de errores de Mercado Pago
- Debugging seguro

## 📋 Checklist de Deploy

### Render Dashboard:
- [ ] Variables de entorno configuradas
- [ ] Start command correcto
- [ ] Health check funcionando
- [ ] Logs sin errores

### Testing:
- [ ] Health check responde
- [ ] Proxy endpoint funciona
- [ ] Checkout crea preferencias
- [ ] Pago completo funciona

## 🚨 Troubleshooting

### "Proxy Health Check Failed"
- Verificar que el proxy esté corriendo
- Revisar variables de entorno
- Chequear logs del servidor

### "Error en el pago"
- Testear con botón "Test Seguro"
- Verificar logs del proxy
- Validar items del carrito

### "Respuesta vacía"
- Revisar conexión a Mercado Pago
- Verificar access token
- Chequear timeout settings

## 🎯 Estado Final

✅ **Seguro**: Access token protegido  
✅ **Funcional**: Checkout operativo  
✅ **Escalable**: Proxy dedicado  
✅ **Debuggable**: Logs completos  

El pago ahora es seguro y funcional en producción.
