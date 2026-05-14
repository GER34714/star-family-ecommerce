const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del build de React
app.use(express.static(path.join(__dirname, 'build')));

// API endpoint para Mercado Pago
app.post('/api/create-mercadopago-preference', async (req, res) => {
  console.log('=== MERCADO PAGO API CALLED ===');
  console.log('API called with method:', req.method);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('Environment variables check:', {
    hasAccessToken: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    accessTokenPrefix: process.env.MERCADO_PAGO_ACCESS_TOKEN ? process.env.MERCADO_PAGO_ACCESS_TOKEN.substring(0, 20) + '...' : 'null'
  });

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('MERCADO_PAGO_ACCESS_TOKEN is not set in environment');
    return res.status(500).json({ error: 'Mercado Pago no está configurado en el servidor' });
  }

  try {
    console.log('Parsing request body...');
    const { items, origin, externalReference } = req.body;
    console.log('Request data:', { itemsCount: items?.length, origin, externalReference });

    if (!Array.isArray(items) || items.length === 0) {
      console.error('Invalid items array:', items);
      return res.status(400).json({ error: 'El carrito no tiene productos válidos para pagar' });
    }

    console.log('Making request to Mercado Pago API...');
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        items,
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
      })
    });

    console.log('Mercado Pago response status:', response.status);
    const responseText = await response.text();
    console.log('Mercado Pago response body:', responseText.substring(0, 200) + '...');

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Mercado Pago response:', responseText);
      return res.status(500).json({ error: 'Respuesta inválida de Mercado Pago' });
    }

    if (!response.ok || !data.id) {
      console.error('Mercado Pago error:', data);
      return res.status(response.status).json({ error: data.message || data.error || 'No se pudo crear la preferencia de Mercado Pago' });
    }

    console.log('Preference created successfully:', data.id);
    console.log('=== MERCADO PAGO API SUCCESS ===');
    return res.json({ id: data.id });
  } catch (error) {
    console.error('=== MERCADO PAGO API ERROR ===');
    console.error('API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: error.message || 'Error interno creando preferencia' });
  }
});

// Todas las demás rutas las maneja React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
