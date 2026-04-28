// ═════════════════════════════════════════════════════
// COMPONENTE DE RUTA PROTEGIDA PARA USUARIOS MAESTROS
// ═════════════════════════════════════════════════════

import React from 'react';
import { useMasterUser } from './useMasterUser';

export const MasterProtectedRoute = ({ children, fallback = null }) => {
  const { isMaster, loading, user } = useMasterUser();

  // Mientras carga, mostrar spinner o nada
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si no hay usuario autenticado
  if (!user) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Acceso Restringido
        </h3>
        <p className="text-gray-600 mb-4">
          Debes iniciar sesión para acceder a esta función
        </p>
      </div>
    );
  }

  // Si el usuario no es master
  if (!isMaster) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">🚫</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Acceso Denegado
        </h3>
        <p className="text-gray-600 mb-4">
          Esta función está disponible solo para usuarios maestros
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-yellow-800">
            <strong>Nota:</strong> Si crees que deberías tener acceso, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  // Usuario es master, permitir acceso
  return children;
};

// Hook para verificar permisos en componentes
export const useMasterPermission = () => {
  const { isMaster, loading, user } = useMasterUser();

  const checkPermission = () => {
    if (loading) return { allowed: false, reason: 'loading' };
    if (!user) return { allowed: false, reason: 'not_authenticated' };
    if (!isMaster) return { allowed: false, reason: 'not_master' };
    return { allowed: true, reason: 'authorized' };
  };

  return {
    isMaster,
    loading,
    user,
    checkPermission,
    canAccess: checkPermission().allowed,
    reason: checkPermission().reason
  };
};

// Componente para botón/menú protegido
export const MasterProtectedButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '',
  ...props 
}) => {
  const { isMaster, loading, user } = useMasterUser();

  const handleClick = (e) => {
    if (!user) {
      alert('Debes iniciar sesión para realizar esta acción');
      return;
    }
    
    if (!isMaster) {
      alert('No tienes permisos para realizar esta acción. Solo usuarios maestros pueden acceder.');
      return;
    }

    if (onClick) onClick(e);
  };

  const isDisabled = disabled || loading || (!user) || (!isMaster);

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={
        !user ? 'Debes iniciar sesión' :
        !isMaster ? 'Solo usuarios maestros pueden acceder' :
        props.title
      }
      {...props}
    >
      {children}
    </button>
  );
};

// Componente de enlace/menú protegido
export const MasterProtectedLink = ({ 
  children, 
  href, 
  className = '',
  onClick,
  ...props 
}) => {
  const { isMaster, loading, user } = useMasterUser();

  const handleClick = (e) => {
    if (!user) {
      e.preventDefault();
      alert('Debes iniciar sesión para acceder a esta sección');
      return;
    }
    
    if (!isMaster) {
      e.preventDefault();
      alert('No tienes permisos para acceder a esta sección. Solo usuarios maestros pueden acceder.');
      return;
    }

    if (onClick) onClick(e);
  };

  const isDisabled = loading || (!user) || (!isMaster);

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      {...props}
    >
      {children}
    </a>
  );
};

export default MasterProtectedRoute;
