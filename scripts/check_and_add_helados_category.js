// ═════════════════════════════════════════════════════
// VERIFICAR Y AGREGAR CATEGORÍA HELADOS
// ═════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cargar variables de entorno
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas');
  console.log('   Asegúrate de tener REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en tu .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndAddHeladosCategory() {
  try {
    console.log('🔍 Verificando categoría "helados"...');
    
    // 1. Verificar si la categoría ya existe
    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .ilike('name', '%helado%');
    
    if (fetchError) throw fetchError;
    
    console.log('📋 Categorías existentes con "helado":', existingCategories);
    
    if (existingCategories && existingCategories.length > 0) {
      console.log('✅ La categoría helados ya existe:');
      existingCategories.forEach(cat => {
        console.log(`   - ID: ${cat.id}, Nombre: "${cat.name}", Activa: ${cat.active}`);
      });
      return;
    }
    
    // 2. Si no existe, crearla
    console.log('📝 Creando categoría "helados"...');
    
    const { data: newCategory, error: insertError } = await supabase
      .from('categories')
      .insert({
        name: 'Helados',
        emoji: '🍦',
        color: '#00BCD4',
        active: true,
        description: 'Productos helados y postres fríos'
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    console.log('✅ Categoría "helados" creada exitosamente:');
    console.log(`   - ID: ${newCategory.id}`);
    console.log(`   - Nombre: "${newCategory.name}"`);
    console.log(`   - Emoji: ${newCategory.emoji}`);
    console.log(`   - Color: ${newCategory.color}`);
    console.log(`   - Activa: ${newCategory.active}`);
    
    // 3. Verificar todos los productos que podrían ser helados
    console.log('\n🔍 Buscando productos que podrían ser helados...');
    const { data: potentialHelados, error: searchError } = await supabase
      .from('products')
      .select('*')
      .ilike('name', '%helado%')
      .or('description.ilike.%helado%,category.ilike.%helado%');
    
    if (searchError) throw searchError;
    
    if (potentialHelados && potentialHelados.length > 0) {
      console.log(`🍦 Encontrados ${potentialHelados.length} productos que podrían ser helados:`);
      potentialHelados.forEach(product => {
        console.log(`   - ID: ${product.id}, Nombre: "${product.name}", Categoría actual: "${product.category}"`);
      });
      
      // Preguntar si quiere actualizar estos productos
      console.log('\n💡 Sugerencia: Podrías actualizar estos productos para que usen la nueva categoría "helados"');
    } else {
      console.log('📭 No se encontraron productos con "helado" en el nombre o descripción');
    }
    
    // 4. Listar todas las categorías ahora
    console.log('\n📋 Todas las categorías en la base de datos:');
    const { data: allCategories, error: allError } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (allError) throw allError;
    
    allCategories.forEach(cat => {
      const status = cat.active ? '✅' : '❌';
      console.log(`   ${status} ${cat.emoji} ${cat.name} (${cat.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar la función
checkAndAddHeladosCategory().then(() => {
  console.log('\n🎉 Verificación completada');
}).catch(error => {
  console.error('❌ Error en la ejecución:', error);
  process.exit(1);
});
