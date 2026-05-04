import React, { useState, useEffect } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

const MercadoPagoButton = ({ cartItems, total, onPaymentSuccess, onPaymentError }) => {
  const [preferenceId, setPreferenceId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Inicializar Mercado Pago
  useEffect(() => {
    initMercadoPago(process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY);
  }, []);

  // Crear preferencia de pago
  const createPreference = async () => {
    setLoading(true);
    
    try {
      const items = cartItems.map(item => ({
        title: item.name,
        quantity: item.quantity,
        unit_price: Math.round(item.price * 100) / 100, // Convertir a centavos
        currency_id: 'ARS',
        picture_url: item.image_url || '',
        description: item.description || `Producto: ${item.name}`
      }));

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_MERCADO_PAGO_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          items,
          back_urls: {
            success: `${window.location.origin}/payment/success`,
            failure: `${window.location.origin}/payment/failure`,
            pending: `${window.location.origin}/payment/pending`
          },
          auto_return: 'approved',
          binary_mode: true,
          statement_descriptor: 'Star Family E-commerce',
          external_reference: `order_${Date.now()}`,
          notification_url: `${process.env.REACT_APP_API_URL}/webhooks/mercadopago`
        })
      });

      const data = await response.json();
      
      if (data.id) {
        setPreferenceId(data.id);
      } else {
        throw new Error('No se pudo crear la preferencia de pago');
      }
    } catch (error) {
      console.error('Error al crear preferencia de Mercado Pago:', error);
      onPaymentError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejar clic en el botón
  const handlePayment = () => {
    if (!cartItems || cartItems.length === 0) {
      onPaymentError?.('El carrito está vacío');
      return;
    }
    
    createPreference();
  };

  // Manejar eventos del wallet
  const handlePaymentSuccess = (data) => {
    console.log('Pago exitoso:', data);
    onPaymentSuccess?.(data);
  };

  const handlePaymentError = (error) => {
    console.error('Error en el pago:', error);
    onPaymentError?.(error);
  };

  const handlePaymentPending = (data) => {
    console.log('Pago pendiente:', data);
  };

  if (!process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY) {
    return (
      <div className="alert alert-warning">
        <strong>Mercado Pago no configurado:</strong> Faltan las variables de entorno.
      </div>
    );
  }

  return (
    <div className="mercadopago-container">
      {!preferenceId ? (
        <button
          onClick={handlePayment}
          disabled={loading || !cartItems || cartItems.length === 0}
          className="btn btn-primary btn-lg w-100"
          style={{
            backgroundColor: '#009EE3',
            borderColor: '#009EE3',
            fontSize: '1.1rem',
            fontWeight: '600',
            padding: '12px 24px',
            borderRadius: '8px'
          }}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Procesando...
            </>
          ) : (
            <>
              <i className="fab fa-mercadopago me-2" />
              Pagar con Mercado Pago
            </>
          )}
        </button>
      ) : (
        <Wallet
          initialization={{ preferenceId }}
          customization={{
            texts: {
              action: 'pay',
              valueProp: 'security_details'
            },
            visual: {
              buttonBackground: 'black',
              borderRadius: '8px',
              valuePropColor: 'grey'
            }
          }}
          onReady={() => console.log('Wallet de Mercado Pago listo')}
          onError={handlePaymentError}
          onSubmit={handlePaymentSuccess}
          onPending={handlePaymentPending}
        />
      )}
      
      {/* Información de seguridad */}
      <div className="mt-3 text-center">
        <small className="text-muted">
          <i className="fas fa-lock me-1" />
          Pago seguro con Mercado Pago
        </small>
      </div>
    </div>
  );
};

export default MercadoPagoButton;
