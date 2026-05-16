// Script para forzar recarga y verificar cambios en móvil
console.log('🔍 Verificando cambios en banners...');

// Verificar si el código JSX está actualizado
const bannerCards = document.querySelectorAll('.banner-card');
console.log('📱 Cards de banners encontradas:', bannerCards.length);

if (bannerCards.length > 0) {
  const firstCard = bannerCards[0];
  console.log('🎯 Estructura de la primera card:', firstCard.innerHTML.substring(0, 200) + '...');
  
  // Verificar si tiene el layout móvil
  const hasMobileLayout = firstCard.innerHTML.includes('window.innerWidth <= 768');
  console.log('📐 ¿Tiene layout móvil condicional?', hasMobileLayout);
  
  // Verificar si los botones están presentes
  const buttons = firstCard.querySelectorAll('button');
  console.log('🔘 Botones encontrados:', buttons.length);
  
  // Forzar recarga completa
  console.log('🔄 Forzando recarga completa...');
  setTimeout(() => {
    location.reload(true);
  }, 1000);
} else {
  console.log('❌ No se encontraron cards de banners');
  location.reload(true);
}
