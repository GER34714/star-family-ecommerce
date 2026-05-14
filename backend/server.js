// ═══════════════════════════════════════════════════════════════════════════════
// BACKEND STAR FAMILY E-COMMERCE - MERCADO PAGO API
// ═══════════════════════════════════════════════════════════════════════════════
// Arquitectura profesional separada del frontend
// Deploy: Render Web Service
// Port: Process.env.PORT || 3000
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const mercadopago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE CONFIGURACIÓN PROFESIONAL
// ═══════════════════════════════════════════════════════════════════════════════

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:5173',
    /^https:\/\/.*\.onrender\.com$/,
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.netlify\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDACIÓN DE VARIABLES DE ENTORNO CRÍTICAS
// ═══════════════════════════════════════════════════════════════════════════════

const validateEnvironment = () => {
  const required = ['MERCADOPAGO_ACCESS_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ VARIABLES DE ENTORNO FALTANTES:', missing);
    console.error('🔧 Configúralas en el dashboard de Render o en .env');
    return false;
  }
  
  console.log('✅ Variables de entorno OK');
  console.log(`🔑 Mercado Pago Token: ${process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 20)}...`);
  return true;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN MERCADO PAGO
// ═══════════════════════════════════════════════════════════════════════════════

if (validateEnvironment()) {
  mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
  });
  console.log('✅ Mercado Pago configurado correctamente');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS PRINCIPALES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ENDPOINT: /ping
 * MÉTODO: GET
 * PROPÓSITO: Health check simple para mantener el servicio activo
 */
app.get('/ping', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🏓 PING recibido`);
  
  res.status(200).json({
    ok: true,
    timestamp,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    service: 'star-family-backend',
    version: '1.0.0'
  });
});

/**
 * ENDPOINT: /health
 * MÉTODO: GET
 * PROPÓSITO: Health check detallado para monitoreo
 */
app.get('/health', (req, res) => {
  const timestamp = new Date().toISOString();
  const memUsage = process.memoryUsage();
  
  console.log(`[${timestamp}] 🏥 HEALTH CHECK solicitado`);
  
  res.status(200).json({
    ok: true,
    status: 'healthy',
    timestamp,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    service: 'star-family-backend',
    version: '1.0.0',
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
    },
    mercadopago: {
      configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      tokenPrefix: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 10) + '...'
    }
  });
});

/**
 * ENDPOINT: /create-preference
 * MÉTODO: POST
 * PROPÓSITO: Crear preferencia de pago en Mercado Pago
 * BODY: { items: [], origin: "", externalReference: "" }
 */
app.post('/create-preference', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${timestamp}] 🚀 MERCADO PAGO PREFERENCE REQUEST [${requestId}]`);
  console.log(`${'='.repeat(80)}`);
  
  // Headers para debugging
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Timestamp', timestamp);
  
  try {
    // ═══════════════════════════════════════════════════════════════════════════════
    // VALIDACIÓN DE VARIABLES DE ENTORNO
    // ═══════════════════════════════════════════════════════════════════════════════
    
    if (!validateEnvironment()) {
      const error = 'FALTAN VARIABLES DE ENTORNO CRÍTICAS';
      console.error(`[${requestId}] ❌ ${error}`);
      return res.status(500).json({
        success: false,
        error,
        request_id: requestId,
        timestamp,
        missing_variables: ['MERCADOPAGO_ACCESS_TOKEN']
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VALIDACIÓN DEL REQUEST BODY
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log(`[${requestId}] 📥 Request headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`[${requestId}] 📥 Request body:`, JSON.stringify(req.body, null, 2));
    
    if (!req.body || typeof req.body !== 'object') {
      const error = 'Request body inválido o ausente';
      console.error(`[${requestId}] ❌ ${error}`);
      return res.status(400).json({
        success: false,
        error,
        request_id: requestId,
        timestamp,
        received_body: req.body
      });
    }
    
    const { items, origin, externalReference } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      const error = 'El carrito no tiene productos válidos para pagar';
      console.error(`[${requestId}] ❌ ${error}`);
      console.error(`[${requestId}] Items recibidos:`, items);
      return res.status(400).json({
        success: false,
        error,
        request_id: requestId,
        timestamp,
        items_validation: {
          received: items,
          is_array: Array.isArray(items),
          length: items?.length || 0
        }
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VALIDACIÓN Y LIMPIEZA DE ITEMS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    const validItems = items.filter(item => 
      item && 
      typeof item === 'object' && 
      item.name && 
      typeof item.price === 'number' && 
      item.price > 0
    ).map(item => ({
      title: String(item.name).slice(0, 250),
      quantity: Number(item.qty || item.quantity || 1),
      unit_price: Math.round(Number(item.price) * 100) / 100,
      currency_id: 'ARS',
      description: String(item.description || `${item.name} - Star Family`).slice(0, 600),
      picture_url: item.image_url || undefined,
      category_id: item.category || undefined
    }));
    
    if (validItems.length === 0) {
      const error = 'No hay productos válidos en el carrito después de validación';
      console.error(`[${requestId}] ❌ ${error}`);
      console.error(`[${requestId}] Items originales:`, items);
      console.error(`[${requestId}] Items válidos:`, validItems);
      return res.status(400).json({
        success: false,
        error,
        request_id: requestId,
        timestamp,
        items_validation: {
          original: items,
          valid: validItems,
          original_count: items.length,
          valid_count: validItems.length
        }
      });
    }
    
    console.log(`[${requestId}] ✅ Items validados: ${validItems.length} productos`);
    console.log(`[${requestId}] 📦 Items procesados:`, validItems.map(i => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price
    })));
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE PREFERENCIA MERCADO PAGO
    // ═══════════════════════════════════════════════════════════════════════════════
    
    const preferenceData = {
      items: validItems,
      payer: {
        name: 'Cliente',
        email: undefined
      },
      back_urls: {
        success: `${origin}/payment/success`,
        failure: `${origin}/payment/failure`,
        pending: `${origin}/payment/pending`
      },
      auto_return: 'approved',
      binary_mode: true,
      statement_descriptor: 'Star Family Mayorista',
      external_reference: externalReference || `order_${Date.now()}_${validItems.length}_items`,
      payment_methods: {
        excluded_payment_types: [],
        excluded_payment_methods: [],
        default_payment_method_id: null,
        installments: null
      },
      purpose: 'wallet_purchase',
      payment_methods_allowed: {
        payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'account_money' },
          { id: 'debit_card' }
        ]
      },
      expires: false,
      date_created: new Date().toISOString()
    };
    
    console.log(`[${requestId}] 📤 Preference data prepared:`, {
      items_count: validItems.length,
      total_amount: validItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
      origin,
      external_reference: preferenceData.external_reference
    });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CREACIÓN DE PREFERENCIA EN MERCADO PAGO
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log(`[${requestId}] 🚀 Enviando a Mercado Pago API...`);
    const startTime = Date.now();
    
    let response;
    try {
      response = await mercadopago.preferences.create(preferenceData);
      const responseTime = Date.now() - startTime;
      console.log(`[${requestId}] ✅ Mercado Pago response time: ${responseTime}ms`);
      console.log(`[${requestId}] 📥 Response status:`, response.status);
      console.log(`[${requestId}] 📥 Response body:`, JSON.stringify(response.body, null, 2));
    } catch (mpError) {
      const responseTime = Date.now() - startTime;
      console.error(`[${requestId}] ❌ Mercado Pago API error (${responseTime}ms):`, mpError);
      console.error(`[${requestId}] ❌ Stack trace:`, mpError.stack);
      
      return res.status(500).json({
        success: false,
        error: 'Error comunicándose con Mercado Pago API',
        details: mpError.message,
        request_id: requestId,
        timestamp,
        response_time: responseTime
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VALIDACIÓN DE RESPUESTA DE MERCADO PAGO
    // ═══════════════════════════════════════════════════════════════════════════════
    
    if (!response || !response.body || !response.body.id) {
      const error = 'Respuesta inválida de Mercado Pago';
      console.error(`[${requestId}] ❌ ${error}`);
      console.error(`[${requestId}] Response completa:`, response);
      
      return res.status(500).json({
        success: false,
        error,
        request_id: requestId,
        timestamp,
        mercado_pago_response: response
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ÉXITO - PREFERENCIA CREADA
    // ═══════════════════════════════════════════════════════════════════════════════
    
    const preferenceId = response.body.id;
    const initPoint = response.body.init_point;
    const sandboxInitPoint = response.body.sandbox_init_point;
    
    console.log(`[${requestId}] 🎉 PREFERENCIA CREADA CON ÉXITO`);
    console.log(`[${requestId}] 🎫 Preference ID: ${preferenceId}`);
    console.log(`[${requestId}] 🔗 Init Point: ${initPoint}`);
    console.log(`[${requestId}] 🔗 Sandbox: ${sandboxInitPoint}`);
    console.log(`${'='.repeat(80)}\n`);
    
    return res.status(200).json({
      success: true,
      preference_id: preferenceId,
      id: preferenceId,
      init_point: initPoint,
      sandbox_init_point: sandboxInitPoint,
      request_id: requestId,
      timestamp,
      items_processed: validItems.length,
      total_amount: validItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
    });
    
  } catch (unexpectedError) {
    console.error(`[${requestId}] 💥 ERROR INESPERADO DEL SERVIDOR`);
    console.error(`[${requestId}] 💥 Error:`, unexpectedError);
    console.error(`[${requestId}] 💥 Stack trace:`, unexpectedError.stack);
    console.error(`${'='.repeat(80)}\n`);
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: unexpectedError.message,
      request_id: requestId,
      timestamp,
      stack: process.env.NODE_ENV === 'development' ? unexpectedError.stack : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE DEBUGGING Y MONITOREO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ENDPOINT: /debug/env
 * MÉTODO: GET
 * PROPÓSITO: Debugging de variables de entorno (solo desarrollo)
 */
app.get('/debug/env', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found in production' });
  }
  
  res.json({
    environment: process.env.NODE_ENV,
    port: PORT,
    mercadopago_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    mercadopago_token_prefix: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 10) + '...',
    all_env_keys: Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('PRIVATE'))
  });
});

/**
 * ENDPOINT: /debug/request-test
 * MÉTODO: POST
 * PROPÓSITO: Testing de request/response para debugging
 */
app.post('/debug/request-test', (req, res) => {
  const requestId = `debug_${Date.now()}`;
  console.log(`[${requestId}] 🧪 DEBUG REQUEST TEST`);
  
  res.json({
    success: true,
    request_id: requestId,
    timestamp: new Date().toISOString(),
    received_headers: req.headers,
    received_body: req.body,
    server_info: {
      node_version: process.version,
      platform: process.platform,
      uptime: process.uptime()
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════

// 404 Handler
app.use('*', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ❌ 404 - Ruta no encontrada: ${req.method} ${req.path}`);
  
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method,
    timestamp,
    available_endpoints: [
      'GET /ping',
      'GET /health',
      'POST /create-preference',
      'GET /debug/env (dev only)',
      'POST /debug/request-test (dev only)'
    ]
  });
});

// Error Handler Global
app.use((error, req, res, next) => {
  const timestamp = new Date().toISOString();
  const requestId = `error_${Date.now()}`;
  
  console.error(`[${requestId}] 💥 ERROR GLOBAL CAPTURADO`);
  console.error(`[${requestId}] Path: ${req.method} ${req.path}`);
  console.error(`[${requestId}] Error:`, error);
  console.error(`[${requestId}] Stack:`, error.stack);
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    request_id: requestId,
    timestamp,
    details: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIO DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`${'='.repeat(80)}`);
  console.log(`[${timestamp}] 🚀 SERVIDOR BACKEND STAR FAMILY INICIADO`);
  console.log(`${'='.repeat(80)}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🏓 Ping: http://localhost:${PORT}/ping`);
  console.log(`💳 Mercado Pago: http://localhost:${PORT}/create-preference`);
  console.log(`🧪 Debug: http://localhost:${PORT}/debug/env`);
  console.log(`${'='.repeat(80)}`);
  
  if (!validateEnvironment()) {
    console.error('⚠️ ADVERTENCIA: Variables de entorno incompletas. El servicio puede no funcionar correctamente.');
  }
});

module.exports = app;
