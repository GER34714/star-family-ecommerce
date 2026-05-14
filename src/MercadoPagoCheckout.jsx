import React, { useState, useEffect } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// Inicializar Mercado Pago con la clave pública proporcionada
initMercadoPago('APP_USR-2601bd12-3a55-4f18-a4d2-b907a571537c');

const MercadoPagoCheckout = ({ cartItems, total, onPaymentSuccess, onPaymentError, onClose }) => {
  const [preferenceId, setPreferenceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  const createPreference = async () => {
    const requestId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`\n=== MERCADO PAGO FRONTEND [${requestId}] ===`);
    
    setLoading(true);
    setErrorMessage('');
    setDebugInfo(null);
    
    try {
      // VALIDACIÓN DE ITEMS
      const items = cartItems
        .filter(item => item && item.name && Number(item.price) > 0)
        .map(item => ({
          title: String(item.name).slice(0, 250),
          quantity: Number(item.qty || item.quantity || 1),
          unit_price: Math.round(Number(item.price) * 100) / 100,
          currency_id: 'ARS',
          description: String(item.description || `${item.name} - Star Family`).slice(0, 600)
        }));

      console.log(`[${requestId}] 📦 Cart items processed:`, {
        original: cartItems.length,
        valid: items.length,
        items: items.map(i => ({ name: i.title, price: i.unit_price, qty: i.quantity }))
      });

      if (!items.length) {
        console.error(`[${requestId}] ❌ No valid items in cart`);
        throw new Error('El carrito no tiene productos válidos para pagar');
      }

      const preferencePayload = {
        items,
        origin: window.location.origin,
        externalReference: `order_${Date.now()}_${cartItems.length}_items`
      };

      console.log(`[${requestId}] 📤 Payload prepared:`, {
        itemsCount: items.length,
        origin: window.location.origin,
        externalReference: preferencePayload.externalReference,
        total: total
      });

      const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const endpoint = isLocalDevelopment 
        ? 'https://api.mercadopago.com/checkout/preferences'
        : '/api/create-mercadopago-preference';
      
      console.log(`[${requestId}] 🌐 Environment:`, isLocalDevelopment ? 'LOCAL' : 'PRODUCTION');
      console.log(`[${requestId}] 🔗 Endpoint:`, endpoint);

      // REQUEST CON TIMEOUT Y DETALLE COMPLETO
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000); // 35s timeout
      
      let response;
      try {
        const requestConfig = isLocalDevelopment
          ? {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer APP_USR-6318323343884379-051213-1de2b6c067eeb716b1e4ed751da8f3ac-1016520294`,
                'User-Agent': 'StarFamily-Ecommerce/1.0'
              },
              body: JSON.stringify({
                items,
                back_urls: {
                  success: `${window.location.origin}/payment/success`,
                  failure: `${window.location.origin}/payment/failure`,
                  pending: `${window.location.origin}/payment/pending`
                },
                binary_mode: true,
                statement_descriptor: 'Star Family Mayorista',
                external_reference: preferencePayload.externalReference,
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
              }),
              signal: controller.signal
            }
          : {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'StarFamily-Ecommerce/1.0'
              },
              body: JSON.stringify(preferencePayload),
              signal: controller.signal
            };

        console.log(`[${requestId}] 📤 Request config:`, {
          method: requestConfig.method,
          headers: requestConfig.headers,
          bodyLength: requestConfig.body.length
        });

        response = await fetch(endpoint, requestConfig);
        clearTimeout(timeout);
      } catch (fetchError) {
        clearTimeout(timeout);
        console.error(`[${requestId}] ❌ Fetch error:`, fetchError);
        const error = fetchError.name === 'AbortError' 
          ? 'Timeout de conexión (35s)' 
          : `Error de conexión: ${fetchError.message}`;
        
        setDebugInfo({
          type: 'fetch_error',
          error: error,
          endpoint,
          requestId
        });
        
        throw new Error(error);
      }

      console.log(`[${requestId}] 📥 Response status:`, response.status);
      console.log(`[${requestId}] 📥 Response headers:`, Object.fromEntries(response.headers.entries()));

      // MANEJO ROBUSTO DE RESPUESTA
      let responseText;
      try {
        responseText = await response.text();
        console.log(`[${requestId}] 📥 Raw response (${responseText.length} chars):`, responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : ''));
      } catch (textError) {
        console.error(`[${requestId}] ❌ Error reading response:`, textError);
        
        setDebugInfo({
          type: 'response_read_error',
          error: textError.message,
          status: response.status,
          requestId
        });
        
        throw new Error('Error leyendo respuesta del servidor');
      }
      
      if (!responseText || responseText.trim() === '') {
        console.error(`[${requestId}] ❌ EMPTY RESPONSE`);
        
        setDebugInfo({
          type: 'empty_response',
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          requestId
        });
        
        throw new Error('El servidor devolvió una respuesta vacía. Verifica los logs del servidor.');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log(`[${requestId}] ✅ JSON parsed successfully`);
      } catch (parseError) {
        console.error(`[${requestId}] ❌ JSON parse error:`, parseError);
        console.error(`[${requestId}] ❌ Invalid JSON:`, responseText);
        
        setDebugInfo({
          type: 'json_parse_error',
          error: parseError.message,
          rawResponse: responseText.substring(0, 2000),
          requestId
        });
        
        throw new Error('Respuesta inválida del servidor (JSON malformado)');
      }
      
      // VALIDACIÓN DE RESPUESTA
      if (!response.ok) {
        console.error(`[${requestId}] ❌ HTTP error:`, data);
        
        setDebugInfo({
          type: 'http_error',
          status: response.status,
          response: data,
          requestId
        });
        
        const errorMsg = data.error || data.message || 'Error del servidor';
        throw new Error(`Error ${response.status}: ${errorMsg}`);
      }
      
      if (!data || !data.id) {
        console.error(`[${requestId}] ❌ Invalid response structure:`, data);
        
        setDebugInfo({
          type: 'invalid_response',
          response: data,
          requestId
        });
        
        throw new Error('Respuesta sin ID de preferencia válido');
      }

      // ÉXITO
      console.log(`[${requestId}] 🎉 SUCCESS - Preference ID:`, data.id);
      console.log(`[${requestId}] === MERCADO PAGO FRONTEND SUCCESS ===\n`);
      
      setPreferenceId(data.id);
      setDebugInfo({
        type: 'success',
        preferenceId: data.id,
        requestId
      });
      
      // Cerrar el carrito cuando se crea la preferencia y se abre el checkout
      onClose?.();
      
    } catch (error) {
      console.error(`[${requestId}] 💥 FRONTEND ERROR:`, error);
      console.error(`[${requestId}] === MERCADO PAGO FRONTEND ERROR ===\n`);
      
      setErrorMessage(error.message || 'No se pudo cargar el método de pago');
      onPaymentError?.(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cartItems.length > 0) {
      createPreference();
    }
  }, [cartItems]);

  const handlePayment = (response) => {
    console.log('Payment submitted:', response);
    // No llamar a onPaymentSuccess aquí - solo cuando el pago realmente se complete
  };

  const handleError = (error) => {
    console.error('Payment error:', error);
    // No llamar a onPaymentError inmediatamente - el usuario puede corregir en el checkout
  };

  const handleReady = () => {
    console.log('Mercado Pago button ready');
  };

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #C41E3A',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 12px'
        }}></div>
        <p style={{ 
          margin: 0, 
          color: '#6c757d',
          fontSize: '14px',
          fontFamily: "'Poppins', sans-serif"
        }}>
          Cargando opciones de pago...
        </p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!preferenceId) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '20px',
        background: '#f8d7da',
        borderRadius: '12px',
        border: '1px solid #f5c6cb'
      }}>
        <p style={{ 
          margin: '0 0 12px', 
          color: '#721c24',
          fontSize: '14px',
          fontFamily: "'Poppins', sans-serif"
        }}>
          {errorMessage || 'No se pudo cargar el método de pago'}
        </p>
        
        {/* DEBUG INFO PANEL */}
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <details style={{ 
            margin: '12px 0', 
            textAlign: 'left',
            background: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            padding: '8px'
          }}>
            <summary style={{ 
              cursor: 'pointer', 
              fontWeight: 'bold',
              fontSize: '12px',
              color: '#495057'
            }}>
              🐛 Debug Info (Click to expand)
            </summary>
            <pre style={{ 
              fontSize: '11px', 
              margin: '8px 0 0',
              overflow: 'auto',
              maxHeight: '200px',
              background: '#f8f9fa',
              padding: '8px',
              borderRadius: '4px'
            }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
        
        <button 
          onClick={createPreference} 
          style={{
            background: '#C41E3A',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: "'Poppins', sans-serif",
            transition: 'background 0.2s',
            marginRight: '8px'
          }}
          onMouseOver={(e) => e.target.style.background = '#a01731'}
          onMouseOut={(e) => e.target.style.background = '#C41E3A'}
        >
          Reintentar
        </button>
        
        {/* HEALTH CHECK BUTTON */}
        <button 
          onClick={async () => {
            try {
              const response = await fetch('/api/health');
              const data = await response.json();
              alert(`✅ API Health Check:\n${JSON.stringify(data, null, 2)}`);
            } catch (error) {
              alert(`❌ API Health Check Failed:\n${error.message}`);
            }
          }}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: "'Poppins', sans-serif",
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#218838'}
          onMouseOut={(e) => e.target.style.background = '#28a745'}
        >
          Verificar API
        </button>
      </div>
    );
  }

  return (
    <div style={{ margin: '16px 0' }}>
      <Wallet
        initialization={{ preferenceId }}
        onReady={handleReady}
        onSubmit={handlePayment}
        onError={handleError}
      />
    </div>
  );
};

export default MercadoPagoCheckout;
