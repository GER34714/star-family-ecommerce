// ═════════════════════════════════════════════════════
// VERIFICAR PRODUCTOS CON CATEGORÍA HELADOS (ESQUEMA CORRECTO)
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

async function checkHeladosProducts() {
  try {
    console.log('🔍 Verificando categoría Helados y sus productos...');
    
    // 1. Obtener la categoría Helados
    const { data: heladosCategory, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('name', 'Helados')
      .single();
    
    if (categoryError) throw categoryError;
    
    console.log('✅ Categoría Helados encontrada:');
    console.log(`   - ID: ${heladosCategory.id}`);
    console.log(`   - Nombre: ${heladosCategory.name}`);
    console.log(`   - Emoji: ${heladosCategory.emoji}`);
    console.log(`   - Color: ${heladosCategory.color}`);
    
    // 2. Buscar productos con category_id = Helados.id
    console.log('\n🍦 Buscando productos con categoría Helados...');
    const { data: heladosProducts, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', heladosCategory.id);
    
    if (productsError) throw productsError;
    
    if (heladosProducts && heladosProducts.length > 0) {
      console.log(`✅ Encontrados ${heladosProducts.length} productos con categoría Helados:`);
      heladosProducts.forEach(product => {
        console.log(`   - ${product.name} (ID: ${product.id}) - $${product.price} - Activo: ${product.active}`);
      });
    } else {
      console.log('❌ No se encontraron productos con categoría Helados');
      
      // 3. Buscar productos que podrían ser helados por nombre
      console.log('\n🔍 Buscando productos que podrían ser helados (por nombre)...');
      const { data: potentialProducts, error: searchError } = await supabase
        .from('products')
        .select('*')
        .ilike('name', '%helado%');
      
      if (searchError) throw searchError;
      
      if (potentialProducts && potentialProducts.length > 0) {
        console.log(`🎯 Encontrados ${potentialProducts.length} productos potenciales para helados:`);
        potentialProducts.forEach(product => {
          console.log(`   - "${product.name}" (category_id: ${product.category_id})`);
        });
        
        // Actualizar estos productos a categoría Helados
        console.log('\n🔄 Actualizando productos a categoría Helados...');
        for (const product of potentialProducts) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ category_id: heladosCategory.id })
            .eq('id', product.id);
          
          if (updateError) {
            console.error(`❌ Error actualizando producto ${product.name}:`, updateError.message);
          } else {
            console.log(`✅ Producto "${product.name}" actualizado a categoría Helados`);
          }
        }
      } else {
        console.log('📭 No se encontraron productos potenciales para helados');
        
        // Crear un producto de ejemplo para helados
        console.log('\n➕ Creando producto de ejemplo para categoría Helados...');
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert({
            name: 'Helado de Crema Clásico',
            description: 'Delicioso helado de crema tradicional, sabor vainilla',
            category_id: heladosCategory.id,
            price: 15000.00,
            bulk_info: 'Caja x 12 unidades',
            image_url: 'https://example.com/helado-crema.jpg',
            active: true
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Error creando producto de ejemplo:', insertError.message);
        } else {
          console.log('✅ Producto de ejemplo creado:');
          console.log(`   - ${newProduct.name} - $${newProduct.price}`);
        }
      }
    }
    
    // 4. Verificar todas las categorías para el admin
    console.log('\n📋 Todas las categorías disponibles para el admin:');
    const { data: allCategories, error: allError } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (allError) throw allError;
    
    console.log(`Total de categorías: ${allCategories.length}`);
    allCategories.forEach(cat => {
      console.log(`   - ${cat.emoji} ${cat.name} (ID: ${cat.id})`);
    });
    
    console.log('\n🎉 Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkHeladosProducts();
