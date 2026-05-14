const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware mejorado con logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(cors({
  origin: ['http://localhost:3000', 'https://localhost:3000', /^https:\/\/.*\.onrender\.com$/],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos del build de React
app.use(express.static(path.join(__dirname, 'build')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] Health check requested`);
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    success: true,
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    port: PORT
  });
});

// API endpoint para Mercado Pago - ROBUST ERROR HANDLING
app.post('/api/create-mercadopago-preference', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n=== MERCADO PAGO API CALLED [${requestId}] ===`);
  
  // Always set response headers first
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Request-ID', requestId);
  
  try {
    // DETECCIÓN AUTOMÁTICA DE VARIABLES DE ENTORNO
    const requiredEnvVars = {
      'MERCADO_PAGO_ACCESS_TOKEN': process.env.MERCADO_PAGO_ACCESS_TOKEN
    };
    
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      console.error(`[${requestId}] ❌ MISSING ENV VARS:`, missingVars);
      const errorMsg = `FALTAN VARIABLES DE ENTORNO: ${missingVars.join(', ')}. Configúralas en el dashboard de Render.`;
      console.error(`[${requestId}] ${errorMsg}`);
      return res.status(500).json({ 
        success: false, 
        error: errorMsg,
        missing_variables: missingVars,
        request_id: requestId
      });
    }
    
    console.log(`[${requestId}] ✅ Environment variables OK`);
    console.log(`[${requestId}] Request headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));
    
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    console.log(`[${requestId}] Access token prefix:`, accessToken.substring(0, 20) + '...');

    // VALIDACIÓN ROBUSTA DEL REQUEST BODY
    if (!req.body || typeof req.body !== 'object') {
      console.error(`[${requestId}] ❌ Invalid request body`);
      return res.status(400).json({ 
        success: false, 
        error: 'Request body inválido',
        request_id: requestId
      });
    }
    
    const { items, origin, externalReference } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      console.error(`[${requestId}] ❌ Invalid items array:`, items);
      return res.status(400).json({ 
        success: false, 
        error: 'El carrito no tiene productos válidos para pagar',
        items_received: items,
        request_id: requestId
      });
    }
    
    // VALIDACIÓN DE ITEMS
    const validItems = items
      .filter(item => item && typeof item === 'object' && Number(item.quantity || item.qty || 1) > 0 && Number(item.unit_price || item.price) > 0)
      .map(item => ({
        title: String(item.title || item.name).slice(0, 250),
        quantity: Number(item.quantity || item.qty || 1),
        unit_price: Math.round(Number(item.unit_price || item.price) * 100) / 100,
        currency_id: item.currency_id || 'ARS',
        description: String(item.description || `${item.title || item.name} - Star Family`).slice(0, 600)
      }));
    
    if (validItems.length === 0) {
      console.error(`[${requestId}] ❌ No valid items found`);
      return res.status(400).json({ 
        success: false, 
        error: 'No hay productos válidos en el carrito',
        items_validation: { original: items, valid: validItems },
        request_id: requestId
      });
    }
    
    console.log(`[${requestId}] ✅ Request validation OK`);
    console.log(`[${requestId}] Items count:`, validItems.length);
    console.log(`[${requestId}] Origin:`, origin);
    console.log(`[${requestId}] External reference:`, externalReference);

    // REQUEST A MERCADO PAGO API CON TIMEOUT Y RETRY
    console.log(`[${requestId}] 🚀 Making request to Mercado Pago API...`);
    
    const mpPayload = {
      items: validItems,
      back_urls: {
        success: `${origin}/payment/success`,
        failure: `${origin}/payment/failure`,
        pending: `${origin}/payment/pending`
      },
      binary_mode: true,
      statement_descriptor: 'Star Family Mayorista',
      external_reference: externalReference,
      payment_methods: {
        excluded_payment_types: [],
        excluded_payment_methods: [],
        default_payment_method_id: null
      },
      purpose: 'wallet_purchase',
      payment_methods_allowed: {
        payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'account_money' }
        ]
      }
    };
    
    console.log(`[${requestId}] MP Payload:`, JSON.stringify(mpPayload, null, 2));
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    let response;
    try {
      response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'StarFamily-Ecommerce/1.0'
        },
        body: JSON.stringify(mpPayload),
        signal: controller.signal
      });
      clearTimeout(timeout);
    } catch (fetchError) {
      clearTimeout(timeout);
      console.error(`[${requestId}] ❌ Fetch error:`, fetchError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error de conexión con Mercado Pago',
        details: fetchError.message,
        request_id: requestId
      });
    }

    console.log(`[${requestId}] 📥 Mercado Pago response status:`, response.status);
    console.log(`[${requestId}] 📥 Response headers:`, JSON.stringify(Object.fromEntries(response.headers), null, 2));
    
    // MANEJO ROBUSTO DE RESPUESTA
    let responseText;
    try {
      responseText = await response.text();
      console.log(`[${requestId}] 📥 Raw response (${responseText.length} chars):`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
    } catch (textError) {
      console.error(`[${requestId}] ❌ Error reading response text:`, textError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error leyendo respuesta de Mercado Pago',
        details: textError.message,
        request_id: requestId
      });
    }
    
    if (!responseText || responseText.trim() === '') {
      console.error(`[${requestId}] ❌ EMPTY RESPONSE from Mercado Pago`);
      return res.status(500).json({ 
        success: false, 
        error: 'Mercado Pago devolvió respuesta vacía',
        status_code: response.status,
        request_id: requestId
      });
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[${requestId}] ✅ JSON parsed successfully`);
    } catch (parseError) {
      console.error(`[${requestId}] ❌ JSON parse error:`, parseError);
      console.error(`[${requestId}] ❌ Invalid JSON response:`, responseText);
      return res.status(500).json({ 
        success: false, 
        error: 'Respuesta inválida de Mercado Pago (JSON inválido)',
        raw_response: responseText.substring(0, 1000),
        parse_error: parseError.message,
        request_id: requestId
      });
    }
    
    // VALIDACIÓN DE RESPUESTA DE MERCADO PAGO
    if (!response.ok) {
      console.error(`[${requestId}] ❌ Mercado Pago API error:`, data);
      const mpError = data.message || data.error || data.cause || 'Error desconocido de Mercado Pago';
      return res.status(response.status).json({ 
        success: false, 
        error: `Mercado Pago: ${mpError}`,
        mp_status: response.status,
        mp_response: data,
        request_id: requestId
      });
    }
    
    if (!data || !data.id) {
      console.error(`[${requestId}] ❌ Invalid response structure:`, data);
      return res.status(500).json({ 
        success: false, 
        error: 'Respuesta de Mercado Pago sin ID de preferencia',
        mp_response: data,
        request_id: requestId
      });
    }
    
    // ÉXITO
    console.log(`[${requestId}] 🎉 SUCCESS - Preference created:`, data.id);
    console.log(`[${requestId}] === MERCADO PAGO API SUCCESS ===\n`);
    
    return res.status(200).json({ 
      success: true, 
      id: data.id,
      preference_id: data.id,
      request_id: requestId
    });
    
  } catch (unexpectedError) {
    console.error(`[${requestId}] 💥 UNEXPECTED ERROR:`, unexpectedError);
    console.error(`[${requestId}] 💥 Stack trace:`, unexpectedError.stack);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: unexpectedError.message,
      stack: process.env.NODE_ENV === 'development' ? unexpectedError.stack : undefined,
      request_id: requestId
    });
  }
});

// Catch-all handler para React - DEBE ESTAR ÚLTIMO
app.get('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] Serving React app for:`, req.path);
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] 🚀 Server running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] 📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[${new Date().toISOString()}] 🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`[${new Date().toISOString()}] 💳 Mercado Pago API: http://localhost:${PORT}/api/create-mercadopago-preference`);
});
