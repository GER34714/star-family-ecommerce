# Configuración de Mercado Pago en Render

## Variables de Entorno Requeridas

En el dashboard de Render → tu proyecto → Environment, agregá estas variables:

```
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-6318323343884379-051213-1de2b6c067eeb716b1e4ed751da8f3ac-1016520294
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=APP_USR-2601bd12-3a55-4f18-a4d2-b907a571537c
```

## Configuración del Servidor

### Build Command
```
npm install && npm run build
```

### Start Command
```
npm start
```

### Health Check Path
```
/api/health
```

## Debugging

### Logs del Servidor
Los logs incluyen:
- Request ID único para cada llamada
- Validación de variables de entorno
- Payload enviado a Mercado Pago
- Respuesta cruda de Mercado Pago
- Errores detallados con stack traces

### Debug en Frontend
En desarrollo, se muestra un panel de debug con:
- Tipo de error
- Request ID
- Respuesta del servidor
- Botón de health check

### Endpoints Disponibles
- `GET /api/health` - Health check del servidor
- `POST /api/create-mercadopago-preference` - Crear preferencia de Mercado Pago

## Flujo de Error Handling

1. **Variables faltantes**: Error claro indicando qué variables ENV faltan
2. **Request inválido**: Validación de items y payload
3. **Error de Mercado Pago**: Respuesta específica de MP con status code
4. **Respuesta vacía**: Detección y logging de respuestas vacías
5. **JSON inválido**: Parseo robusto con error específico
6. **Timeout**: 30s timeout con AbortController

## Testing

### Local Development
Usa `npm run dev` para desarrollo local (llama directamente a API de Mercado Pago)

### Production Testing
1. Verificá que las variables ENV estén configuradas
2. Hacé click en "Verificar API" para testear health check
3. Probá el checkout con items válidos

## Troubleshooting

### "Respuesta vacía del servidor"
- Revisá logs de Render para ver si el endpoint fue llamado
- Verificá que el servidor esté corriendo con `npm start`
- Chequeá que las variables ENV estén configuradas

### "Variables de entorno faltantes"
- Configurá las variables en el dashboard de Render
- Esperá a que Render haga redeploy
- Verificá con el health check

### Error de Mercado Pago
- Revisá que el ACCESS TOKEN sea válido
- Verificá que los items tengan precio > 0
- Chequeá los logs para ver la respuesta exacta de MP
