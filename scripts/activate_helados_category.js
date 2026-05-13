// ═════════════════════════════════════════════════════
// ACTIVAR CATEGORÍA HELADOS Y VERIFICAR PRODUCTOS
// ═════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function activateHeladosAndCheckProducts() {
  try {
    console.log('🔧 Activando categoría Helados...');
    
    // 1. Activar la categoría Helados
    const { data: updatedCategory, error: updateError } = await supabase
      .from('categories')
      .update({ active: true })
      .eq('name', 'Helados')
      .select()
      .single();
    
    if (updateError) {
      console.log('⚠️ Error actualizando active field:', updateError.message);
      console.log('   Esto puede significar que la tabla categories no tiene el campo active');
    } else {
      console.log('✅ Categoría Helados activada:', updatedCategory);
    }
    
    // 2. Verificar todos los productos con categoría Helados
    console.log('\n🍦 Buscando productos con categoría "Helados"...');
    const { data: heladosProducts, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'Helados');
    
    if (productsError) throw productsError;
    
    if (heladosProducts && heladosProducts.length > 0) {
      console.log(`✅ Encontrados ${heladosProducts.length} productos con categoría Helados:`);
      heladosProducts.forEach(product => {
        console.log(`   - ${product.name} (ID: ${product.id}) - $${product.price} - Activo: ${product.active}`);
      });
    } else {
      console.log('❌ No se encontraron productos con categoría "Helados"');
      
      // 3. Buscar productos que podrían ser helados pero tienen otra categoría
      console.log('\n🔍 Buscando productos que podrían ser helados (por nombre)...');
      const { data: potentialProducts, error: searchError } = await supabase
        .from('products')
        .select('*')
        .ilike('name', '%helado%');
      
      if (searchError) throw searchError;
      
      if (potentialProducts && potentialProducts.length > 0) {
        console.log(`🎯 Encontrados ${potentialProducts.length} productos que podrían ser helados:`);
        potentialProducts.forEach(product => {
          console.log(`   - "${product.name}" (Categoría actual: "${product.category}")`);
        });
        
        // Actualizar estos productos a categoría Helados
        console.log('\n🔄 Actualizando productos a categoría Helados...');
        for (const product of potentialProducts) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ category: 'Helados' })
            .eq('id', product.id);
          
          if (updateError) {
            console.error(`❌ Error actualizando producto ${product.name}:`, updateError.message);
          } else {
            console.log(`✅ Producto "${product.name}" actualizado a categoría Helados`);
          }
        }
      } else {
        console.log('📭 No se encontraron productos potenciales para helados');
      }
    }
    
    // 4. Listar todas las categorías para confirmar
    console.log('\n📋 Todas las categorías en la base de datos:');
    const { data: allCategories, error: allError } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (allError) throw allError;
    
    allCategories.forEach(cat => {
      console.log(`   - ${cat.emoji} ${cat.name} (ID: ${cat.id})`);
    });
    
    console.log('\n🎉 Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

activateHeladosAndCheckProducts();
