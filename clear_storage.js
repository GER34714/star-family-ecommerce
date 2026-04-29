// ═══════════════════════════════════════════════════════
// LIMPIAR LOCALSTORAGE - BACKUP VIEJO
// ═══════════════════════════════════════════════════════

console.log("🧹 Limpiando localStorage...");

// Limpiar productos viejos
localStorage.removeItem("roxy_products");
console.log("✅ roxy_products eliminado");

// También limpiar otros datos si es necesario
localStorage.removeItem("roxy_cart");
console.log("✅ roxy_cart eliminado");

localStorage.removeItem("roxy_price_history");
console.log("✅ roxy_price_history eliminado");

localStorage.removeItem("roxy_restore_points");
console.log("✅ roxy_restore_points eliminado");

console.log("🔄 localStorage limpio. Recarga la página para cargar datos frescos de Supabase.");

// Recargar automáticamente
setTimeout(() => {
  if (confirm("¿Recargar página ahora para cargar datos desde Supabase?")) {
    window.location.reload();
  }
}, 1000);
