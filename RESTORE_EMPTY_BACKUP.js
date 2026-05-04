// ═══════════════════════════════════════════════════════
// SCRIPT PARA RESTAURAR BACKUP VACÍO FUNCIONAL
// ═══════════════════════════════════════════════════════

// Ejecutar en la consola del navegador para restaurar estado vacío

const restoreEmptyBackup = () => {
  console.log("🔄 Restaurando backup vacío...");
  
  // Limpiar localStorage completamente
  localStorage.removeItem('roxy_products');
  localStorage.removeItem('roxy_cart');
  localStorage.removeItem('roxy_price_history');
  localStorage.removeItem('roxy_restore_points');
  localStorage.removeItem('roxy_image_preview');
  localStorage.removeItem('roxy_supa');
  
  // Resetear estados a valores vacíos
  const emptyState = {
    products: [],
    cart: [],
    cat: "Todos",
    view: "shop",
    modal: null,
    editing: false,
    form: { 
      id: "", 
      category: "Frescos", 
      name: "", 
      description: "", 
      price: "", 
      bulkInfo: "", 
      image_url: "" 
    },
    priceHistory: [],
    restorePoints: [],
    imagePreview: null,
    searchTerm: '',
    priceRange: { min: '', max: '' },
    showFilters: false
  };
  
  // Guardar estado vacío en localStorage
  Object.keys(emptyState).forEach(key => {
    localStorage.setItem(`roxy_${key}`, JSON.stringify(emptyState[key]));
  });
  
  console.log("✅ Backup vacío restaurado");
  console.log("📦 Productos:", emptyState.products.length);
  console.log("🛒 Carrito:", emptyState.cart.length);
  console.log("📊 Historial:", emptyState.priceHistory.length);
  console.log("🔄 Puntos de restauración:", emptyState.restorePoints.length);
  
  // Recargar página para aplicar cambios
  if (confirm("¿Recargar página para aplicar cambios?")) {
    window.location.reload();
  }
};

// Función para verificar estado actual
const checkCurrentState = () => {
  const state = {
    products: JSON.parse(localStorage.getItem('roxy_products') || '[]'),
    cart: JSON.parse(localStorage.getItem('roxy_cart') || '[]'),
    priceHistory: JSON.parse(localStorage.getItem('roxy_price_history') || '[]'),
    restorePoints: JSON.parse(localStorage.getItem('roxy_restore_points') || '[]')
  };
  
  console.log("📊 Estado actual:");
  console.log("📦 Productos:", state.products.length);
  console.log("🛒 Carrito:", state.cart.length);
  console.log("📊 Historial:", state.priceHistory.length);
  console.log("🔄 Puntos:", state.restorePoints.length);
  
  return state;
};

// Función para crear punto de restauración vacío
const createEmptyRestorePoint = () => {
  const restorePoint = {
    id: `empty_backup_${Date.now()}`,
    timestamp: new Date().toISOString(),
    reason: "Backup vacío funcional",
    products: [],
    priceHistory: [],
    user: 'system'
  };
  
  const currentPoints = JSON.parse(localStorage.getItem('roxy_restore_points') || '[]');
  const newPoints = [restorePoint, ...currentPoints].slice(0, 10);
  
  localStorage.setItem('roxy_restore_points', JSON.stringify(newPoints));
  console.log("✅ Punto de restauración vacío creado");
  
  return restorePoint;
};

// Exportar funciones para uso global
window.restoreEmptyBackup = restoreEmptyBackup;
window.checkCurrentState = checkCurrentState;
window.createEmptyRestorePoint = createEmptyRestorePoint;

console.log("🔧 Funciones de backup cargadas:");
console.log("- restoreEmptyBackup() - Restaura estado vacío");
console.log("- checkCurrentState() - Verifica estado actual");
console.log("- createEmptyRestorePoint() - Crea punto de restauración vacío");
