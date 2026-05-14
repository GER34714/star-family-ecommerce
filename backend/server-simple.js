// ═══════════════════════════════════════════════════════════════════════════════
// BACKEND SIMPLIFICADO - DEBUGGING VERSION
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

// Endpoint de Mercado Pago simplificado
app.post('/create-preference', async (req, res) => {
  const requestId = `req_${Date.now()}`;
  console.log(`[${requestId}] 🚀 Mercado Pago request received`);
  console.log(`[${requestId}] Body:`, JSON.stringify(req.body, null, 2));
  
  try {
    // Validación básica
    if (!req.body || !req.body.items || !Array.isArray(req.body.items)) {
      return res.status(400).json({
        success: false,
        error: 'Items inválidos',
        request_id: requestId
      });
    }
    
    // Test response (simulado por ahora)
    const mockPreferenceId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[${requestId}] ✅ Mock preference created: ${mockPreferenceId}`);
    
    res.json({
      success: true,
      preference_id: mockPreferenceId,
      id: mockPreferenceId,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      mock: true,
      message: 'Respuesta simulada - Mercado Pago API no conectada aún'
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      request_id: requestId
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method,
    available_endpoints: ['/ping', '/health', '/test', '/create-preference']
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
