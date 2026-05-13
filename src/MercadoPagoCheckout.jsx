import React, { useState, useEffect } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// Inicializar Mercado Pago con la clave pública proporcionada
initMercadoPago('APP_USR-a2e4a0f8-def4-4280-b8ce-353ff2a793f5');

const MercadoPagoCheckout = ({ cartItems, total, onPaymentSuccess, onPaymentError }) => {
  const [preferenceId, setPreferenceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const createPreference = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const items = cartItems
        .filter(item => item && item.name && Number(item.price) > 0)
        .map(item => ({
          title: String(item.name).slice(0, 250),
          quantity: Number(item.qty || item.quantity || 1),
          unit_price: Math.round(Number(item.price) * 100) / 100,
          currency_id: 'ARS',
          description: String(item.description || `${item.name} - Star Family`).slice(0, 600)
        }));

      if (!items.length) {
        throw new Error('El carrito no tiene productos válidos para pagar');
      }

      // Crear preferencia con el access token proporcionado
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer APP_USR-7043807513085545-051112-7b1305ae5c53b7f50955585fcce7b325-153608124`
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
          external_reference: `order_${Date.now()}_${cartItems.length}_items`
        })
      });

      const data = await response.json();
      if (!response.ok || !data.id) {
        console.error('Error de Mercado Pago al crear preferencia:', data);
        throw new Error(data.message || data.error || 'No se pudo crear la preferencia de Mercado Pago');
      }

      setPreferenceId(data.id);
    } catch (error) {
      console.error('Error creating Mercado Pago preference:', error);
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
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#a01731'}
          onMouseOut={(e) => e.target.style.background = '#C41E3A'}
        >
          Reintentar
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
