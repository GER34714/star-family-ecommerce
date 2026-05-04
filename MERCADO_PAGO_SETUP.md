# 🛒 Configuración de Mercado Pago - Star Family E-commerce

## 📋 Requisitos Previos

1. **Cuenta de Mercado Pago** - Crear cuenta en [mercadopago.com](https://mercadopago.com)
2. **Credenciales de API** - Obtener claves desde el dashboard
3. **Modo de pruebas** - Activar modo sandbox para desarrollo

## 🔧 Configuración de Credenciales

### 1. Obtener Claves de Mercado Pago

1. Iniciar sesión en [Mercado Pago](https://mercadopago.com)
2. Ir a **"Tu integración"** → **"Credenciales"**
3. Copiar las siguientes claves:
   - **Public Key** (Clave pública)
   - **Access Token** (Token de acceso)

### 2. Configurar Variables de Entorno

Reemplazar los valores placeholder en los archivos `.env`:

```bash
# .env.local (para desarrollo)
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=TU_PUBLIC_KEY_AQUI
REACT_APP_MERCADO_PAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI

# .env.production (para producción)
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=TU_PUBLIC_KEY_PRODUCCION_AQUI
REACT_APP_MERCADO_PAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_PRODUCCION_AQUI
```

## 🚀 Funcionalidades Implementadas

### ✅ **Botón de Pago en Carrito**
- Integración con el componente `MercadoPagoButton`
- Creación automática de preferencias de pago
- Soporte para múltiples productos en el carrito
- Cálculo automático de totales

### ✅ **Proceso de Pago**
1. **Selección**: Usuario agrega productos al carrito
2. **Checkout**: Hace clic en "Pagar con Mercado Pago"
3. **Preferencia**: Se crea preferencia con items del carrito
4. **Redirección**: Mercado Pago procesa el pago
5. **Retorno**: Usuario vuelve a la tienda con resultado

### ✅ **Manejo de Estados**
- **Pago exitoso**: Limpia carrito y muestra confirmación
- **Pago fallido**: Muestra mensaje de error
- **Pago pendiente**: Maneja estados intermedios

## 📱 Flujo de Usuario

```
Catálogo → Agregar al Carrito → Ver Carrito → 
Pagar con Mercado Pago → Checkout de MP → 
Confirmación/Rechazo → Volver a Tienda
```

## 🔍 Componentes Clave

### `MercadoPagoButton.jsx`
```javascript
// Características principales:
- Creación de preferencias de pago
- Integración con Wallet de Mercado Pago
- Manejo de errores y estados
- Soporte para múltiples items
- Callbacks para éxito/error
```

### Integración en `App.jsx`
```javascript
// Botón agregado en CartDrawer:
<MercadoPagoButton 
  cartItems={cart}
  total={total}
  onPaymentSuccess={handleSuccess}
  onPaymentError={handleError}
/>
```

## 🛡️ Seguridad Implementada

- **Tokens de acceso**: Configurados en variables de entorno
- **Modo sandbox**: Pruebas sin transacciones reales
- **Validación**: Verificación de items y montos
- **Callbacks**: Manejo seguro de respuestas

## 🌐 URLs de Configuración

- **Dashboard**: https://mercadopago.com/dashboard
- **Credenciales**: https://mercadopago.com/developers/panel/credentials
- **Webhooks**: https://mercadopago.com/developers/panel/webhooks

## 🧪 Testing

### Modo de Pruebas
1. Usar credenciales de TEST
2. Tarjetas de prueba disponibles:
   - **Visa**: 4509 9535 6623 3704
   - **Mastercard**: 5031 7557 3453 0604
   - **Código de seguridad**: Cualquier 3 dígitos
   - **Vencimiento**: Cualquier fecha futura

### Flujo de Testing
1. Agregar productos al carrito
2. Hacer clic en "Pagar con Mercado Pago"
3. Completar datos de prueba
4. Verificar redirección y callbacks

## 📊 Estados de Pago

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `approved` | Pago aprobado | Limpiar carrito, confirmar pedido |
| `pending` | Pago pendiente | Mostrar estado de procesamiento |
| `rejected` | Pago rechazado | Mostrar error, mantener carrito |
| `error` | Error en el proceso | Mostrar mensaje de error |

## 🔄 Webhooks (Opcional)

Para producción, configurar webhooks para:
- Notificaciones de pagos en tiempo real
- Actualización automática de estados
- Confirmación de órdenes

**Endpoint**: `https://tu-dominio.com/webhooks/mercadopago`

## 🚨 Consideraciones Importantes

1. **Producción**: Usar claves de producción, no de prueba
2. **SSL**: El sitio debe tener HTTPS obligatoriamente
3. **Dominios**: Configurar URLs de retorno en dashboard de MP
4. **Tasas**: Considerar comisiones de Mercado Pago
5. **Logística**: Tener sistema de gestión de pedidos

## 📞 Soporte

- **Documentación**: https://www.mercadopago.com.ar/developers
- **Soporte MP**: https://www.mercadopago.com.ar/ayuda
- **Proyecto**: Star Family E-commerce

---

**Estado**: ✅ Integración completa lista para configuración  
**Próximo paso**: Configurar credenciales reales de Mercado Pago
