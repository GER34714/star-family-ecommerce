// ═══════════════════════════════════════════════════════════════════════════════
// BACKEND SIMPLIFICADO - DEBUGGING VERSION
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json());

// Health check simple
app.get('/ping', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'star-family-backend-simple',
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Health check detallado
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    service: 'star-family-backend-simple',
    mercadopago_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    token_prefix: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 10) + '...'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    env_vars: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HAS_MERCADOPAGO_TOKEN: !!process.env.MERCADOPAGO_ACCESS_TOKEN
    }
  });
});

// Endpoint de Mercado Pago real
const createMercadoPagoPreference = async (req, res) => {
  const requestId = `req_${Date.now()}`;
  console.log(`[${requestId}] 🚀 Mercado Pago request received`);
  console.log(`[${requestId}] Body:`, JSON.stringify(req.body, null, 2));
  
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'MERCADO_PAGO_ACCESS_TOKEN no está configurado en el servidor',
        request_id: requestId
      });
    }

    if (!req.body || !req.body.items || !Array.isArray(req.body.items)) {
      return res.status(400).json({
        success: false,
        error: 'Items inválidos',
        request_id: requestId
      });
    }

    const { items, origin, externalReference } = req.body;
    const validItems = items
      .filter(item => item && Number(item.quantity || item.qty || 1) > 0 && Number(item.unit_price || item.price) > 0)
      .map(item => ({
        title: String(item.title || item.name).slice(0, 250),
        quantity: Number(item.quantity || item.qty || 1),
        unit_price: Math.round(Number(item.unit_price || item.price) * 100) / 100,
        currency_id: item.currency_id || 'ARS',
        description: String(item.description || `${item.title || item.name} - Star Family`).slice(0, 600)
      }));

    if (!validItems.length) {
      return res.status(400).json({
        success: false,
        error: 'No hay productos válidos para crear la preferencia',
        request_id: requestId
      });
    }

    const siteOrigin = origin || process.env.FRONTEND_URL || `http://localhost:${PORT}`;
    const mpPayload = {
      items: validItems,
      back_urls: {
        success: `${siteOrigin}/payment/success`,
        failure: `${siteOrigin}/payment/failure`,
        pending: `${siteOrigin}/payment/pending`
      },
      binary_mode: true,
      statement_descriptor: 'Star Family Mayorista',
      external_reference: externalReference || `order_${Date.now()}`,
      payment_methods: {
        excluded_payment_types: [],
        excluded_payment_methods: [],
        default_payment_method_id: null
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'StarFamily-Backend/1.0'
      },
      body: JSON.stringify(mpPayload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        error: 'Mercado Pago devolvió una respuesta inválida',
        request_id: requestId
      });
    }

    if (!response.ok || !data.id) {
      return res.status(response.status || 500).json({
        success: false,
        error: data.message || data.error || 'No se pudo crear la preferencia de Mercado Pago',
        mp_response: data,
        request_id: requestId
      });
    }

    return res.json({
      success: true,
      id: data.id,
      preference_id: data.id,
      request_id: requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      request_id: requestId
    });
  }
};

app.post('/create-preference', createMercadoPagoPreference);
app.post('/api/create-mercadopago-preference', createMercadoPagoPreference);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method,
    available_endpoints: ['/ping', '/health', '/test', '/create-preference', '/api/create-mercadopago-preference']
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend simplificado corriendo en puerto ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🏓 Ping: http://localhost:${PORT}/ping`);
  console.log(`🧪 Test: http://localhost:${PORT}/test`);
  console.log(`💳 MP: http://localhost:${PORT}/create-preference`);
});

module.exports = app;
