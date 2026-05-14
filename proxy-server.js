const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://localhost:3000', /^https:\/\/.*\.onrender\.com$/],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'mercadopago-proxy'
  });
});

// Proxy seguro para Mercado Pago
app.post('/mercadopago-preference', async (req, res) => {
  const requestId = `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] 🚀 Mercado Pago Proxy Request`);
  
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error(`[${requestId}] ❌ Missing access token`);
      return res.status(500).json({ 
        error: 'Mercado Pago no está configurado',
        request_id: requestId
      });
    }
    
    const { items, origin, externalReference } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Items inválidos',
        request_id: requestId
      });
    }
    
    // Validar y preparar items
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
      description: String(item.description || `${item.name} - Star Family`).slice(0, 600)
    }));
    
    if (validItems.length === 0) {
      return res.status(400).json({ 
        error: 'No hay productos válidos',
        request_id: requestId
      });
    }
    
    console.log(`[${requestId}] 📦 Processing ${validItems.length} items`);
    
    const mpPayload = {
      items: validItems,
      back_urls: {
        success: `${origin}/payment/success`,
        failure: `${origin}/payment/failure`,
        pending: `${origin}/payment/pending`
      },
      binary_mode: true,
      statement_descriptor: 'Star Family Mayorista',
      external_reference: externalReference || `order_${Date.now()}`,
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
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'StarFamily-Proxy/1.0'
      },
      body: JSON.stringify(mpPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      console.error(`[${requestId}] ❌ Empty response from Mercado Pago`);
      return res.status(500).json({ 
        error: 'Respuesta vacía de Mercado Pago',
        request_id: requestId
      });
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[${requestId}] ❌ JSON parse error:`, parseError);
      return res.status(500).json({ 
        error: 'Respuesta inválida de Mercado Pago',
        request_id: requestId
      });
    }
    
    if (!response.ok || !data.id) {
      console.error(`[${requestId}] ❌ Mercado Pago error:`, data);
      return res.status(response.status).json({ 
        error: data.message || data.error || 'Error de Mercado Pago',
        request_id: requestId
      });
    }
    
    console.log(`[${requestId}] ✅ Success: Preference ${data.id}`);
    
    return res.json({ 
      id: data.id,
      success: true,
      request_id: requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] 💥 Proxy error:`, error);
    return res.status(500).json({ 
      error: 'Error interno del proxy',
      request_id: requestId
    });
  }
});

app.listen(PORT, () => {
  console.log(`🔒 Mercado Pago Proxy running on port ${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🎯 Endpoint: http://localhost:${PORT}/mercadopago-preference`);
});
