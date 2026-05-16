// Script para forzar recarga y limpiar caché
console.log('Forzando recarga completa...');

// Limpiar caché del navegador
if ('caches' in window) {
  caches.keys().then(function(names) {
    names.forEach(function(name) {
      caches.delete(name);
    });
  });
}

// Forzar recarga completa
window.location.reload(true);
