import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Actualizar el estado para que el siguiente renderizado muestre la UI alternativa
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Registrar el error en la consola para debugging
    console.error('ErrorBoundary atrapó un error:', error, errorInfo);
    
    // Guardar información del error para mostrarla
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Renderizado de fallback elegante
      return (
        <div style={{
          minHeight: '100vh',
          background: '#F4F4F5',
          fontFamily: "'Poppins', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            maxWidth: '500px',
            width: '100%'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ 
              margin: '0 0 16px', 
              color: '#111', 
              fontSize: '24px',
              fontWeight: '800'
            }}>
              Algo salió mal
            </h2>
            <p style={{ 
              margin: '0 0 24px', 
              color: '#6B7280', 
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              Star Family encontró un error inesperado. Por favor, recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#C41E3A',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#A01731'}
              onMouseOut={(e) => e.target.style.background = '#C41E3A'}
            >
              Recargar página
            </button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ 
                marginTop: '24px', 
                textAlign: 'left',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Detalles del error (desarrollo)
                </summary>
                <pre style={{ 
                  margin: 0,
                  fontSize: '12px',
                  color: '#DC2626',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    // Renderizar normalmente si no hay errores
    return this.props.children;
  }
}

export default ErrorBoundary;
