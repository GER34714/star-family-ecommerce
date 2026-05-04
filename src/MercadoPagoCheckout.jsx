import React, { useState, useEffect } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// Inicializar Mercado Pago con la clave pública desde las variables de entorno
initMercadoPago(process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY || 'TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

const MercadoPagoCheckout = ({ cartItems, total, onPaymentSuccess, onPaymentError }) => {
  const [preferenceId, setPreferenceId] = useState(null);
  const [loading, setLoading] = useState(false);

  const createPreference = async () => {
    setLoading(true);
    try {
      const items = cartItems.map(item => ({
        title: item.name,
        quantity: item.quantity,
        unit_price: parseFloat(item.price),
        currency_id: 'ARS'
      }));

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_MERCADO_PAGO_ACCESS_TOKEN || 'TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}`
        },
        body: JSON.stringify({
          items,
          back_urls: {
            success: window.location.href,
            failure: window.location.href,
            pending: window.location.href
          },
          auto_return: 'approved',
          binary_mode: true
        })
      });

      const data = await response.json();
      setPreferenceId(data.id);
    } catch (error) {
      console.error('Error creating Mercado Pago preference:', error);
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
    console.log('Payment successful:', response);
    onPaymentSuccess?.(response);
  };

  const handleError = (error) => {
    console.error('Payment error:', error);
    onPaymentError?.(error);
  };

  const handleReady = () => {
    console.log('Mercado Pago button ready');
  };

  if (loading) {
    return (
      <div className="mp-loading">
        <div className="loading-spinner"></div>
        <p>Cargando opciones de pago...</p>
      </div>
    );
  }

  if (!preferenceId) {
    return (
      <div className="mp-error">
        <p>No se pudo cargar el método de pago</p>
        <button onClick={createPreference} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mercadopago-checkout">
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
