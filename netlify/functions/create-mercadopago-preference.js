exports.handler = async (event) => {
  console.log('Function called with method:', event.httpMethod);
  console.log('Environment variables check:', {
    hasAccessToken: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    accessTokenPrefix: process.env.MERCADO_PAGO_ACCESS_TOKEN ? process.env.MERCADO_PAGO_ACCESS_TOKEN.substring(0, 20) + '...' : 'null'
  });

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('MERCADO_PAGO_ACCESS_TOKEN is not set in environment');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Mercado Pago no está configurado en el servidor' })
    };
  }

  try {
    console.log('Parsing request body...');
    const { items, origin, externalReference } = JSON.parse(event.body || '{}');
    console.log('Request data:', { itemsCount: items?.length, origin, externalReference });

    if (!Array.isArray(items) || items.length === 0) {
      console.error('Invalid items array:', items);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'El carrito no tiene productos válidos para pagar' })
      };
    }

    console.log('Making request to Mercado Pago API...');
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
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
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Respuesta inválida de Mercado Pago' })
      };
    }

    if (!response.ok || !data.id) {
      console.error('Mercado Pago error:', data);
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.message || data.error || 'No se pudo crear la preferencia de Mercado Pago' })
      };
    }

    console.log('Preference created successfully:', data.id);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Error interno creando preferencia' })
    };
  }
};
