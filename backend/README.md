# Star Family Backend - Mercado Pago API

## 📋 Descripción

Backend API profesional para Star Family E-commerce con integración segura de Mercado Pago.

## 🏗️ Arquitectura

- **Node.js + Express** - Servidor web robusto
- **Mercado Pago SDK** - Integración oficial con Mercado Pago
- **CORS** - Configuración segura para frontend
- **Logging profesional** - Debugging completo
- **Error handling** - Manejo robusto de errores

## 🚀 Endpoints Disponibles

### Health & Monitoring
- `GET /ping` - Health check simple (mantiene servicio activo)
- `GET /health` - Health check detallado con métricas

### Mercado Pago
- `POST /create-preference` - Crear preferencia de pago

### Debug (solo desarrollo)
- `GET /debug/env` - Variables de entorno
- `POST /debug/request-test` - Testing request/response

## 🔧 Variables de Entorno

Copiar `.env.example` a `.env`:

```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
```

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Producción
npm start

# Debug
npm run debug
```

## 🚀 Deploy en Render

### Configuración Web Service

1. **Tipo**: Web Service (no Static Site)
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Runtime**: Node.js
6. **Plan**: Free/Standard

### Variables de Entorno en Render

```
NODE_ENV=production
PORT=10000
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6318323343884379-051213-1de2b6c067eeb716b1e4ed751da8f3ac-1016520294
```

### Auto-Deploy

- Activar auto-deploy desde GitHub
- Configurar webhook para mantener servicio activo

## 🧪 Testing

### Health Check
```bash
curl https://tu-backend.onrender.com/ping
```

### Crear Preferencia
```bash
curl -X POST https://tu-backend.onrender.com/create-preference \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"name": "Producto Test", "price": 1000, "qty": 2}
    ],
    "origin": "https://tu-frontend.com",
    "externalReference": "test_123"
  }'
```

## 🔍 Debugging

### Logs en Producción
Los logs están configurados para mostrar:
- Request ID único
- Timestamp
- Método y ruta
- IP del cliente
- Errores con stack trace

### Debug Info
Cada request incluye headers de debugging:
- `X-Request-ID`: Identificador único
- `X-Timestamp`: Timestamp del request

## 🛡️ Seguridad

- **CORS** configurado para dominios específicos
- **Input validation** en todos los endpoints
- **Error sanitization** para producción
- **Rate limiting** recomendado (implementar si es necesario)
- **HTTPS** obligatorio en producción

## 🔄 Mantener Servicio Activo

Render Free Tier se duerme después de 15 minutos inactividad. Soluciones:

1. **Cron job** cada 10 minutos:
   ```bash
   curl https://tu-backend.onrender.com/ping
   ```

2. **Uptime monitoring** servicios como:
   - UptimeRobot
   - Pingdom
   - Better Uptime

## 📈 Monitoreo

### Métricas disponibles en `/health`:
- Uptime del servidor
- Uso de memoria
- Estado de Mercado Pago
- Environment y versión

### Logs importantes:
- Requests exitosos
- Errores de Mercado Pago
- Validaciones fallidas
- timeouts

## 🚨 Troubleshooting

### Common Issues

1. **404 Not Found**
   - Verificar Root Directory: `backend`
   - Verificar Start Command: `npm start`

2. **500 Internal Server**
   - Revisar variables de entorno
   - Verificar MERCADOPAGO_ACCESS_TOKEN

3. **CORS Errors**
   - Verificar FRONTEND_URL configurada
   - Revisar configuración de origins

4. **Empty Response**
   - Verificar que servidor está corriendo
   - Revisar logs en Render dashboard

## 📞 Soporte

Para issues de producción:
1. Revisar logs en Render dashboard
2. Verificar variables de entorno
3. Testear endpoints con curl
4. Revisar configuración CORS

## 🔄 Integración con Frontend

El frontend debe configurar:
```
REACT_APP_BACKEND_URL=https://tu-backend.onrender.com
```

Y usar endpoints:
- `/health` para health checks
- `/create-preference` para Mercado Pago
