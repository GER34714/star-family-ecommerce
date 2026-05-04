// Script para forzar la carga de productos desde Supabase
const { createClient } = require('@supabase/supabase-js');

const url = 'https://bedccnjylrnkacaxtusv.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGNjbmp5bHJua2FjYXh0dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODI2MzAsImV4cCI6MjA5MjY1ODYzMH0.1OewVpVOBI-IgFMPejheKUpq8z-rwUeRMQjR4g16NoQ';

const supabase = createClient(url, key);

async function forceLoadProducts() {
  try {
    console.log('🔍 Forzando carga de productos desde Supabase...');
    
    // Obtener productos con categorías
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          name,
          emoji,
          color
        )
      `)
      .eq('active', true);
      
    if (prodError) {
      console.error('❌ Error obteniendo productos:', prodError);
      return;
    }
    
    console.log(`✅ ${products?.length || 0} productos encontrados`);
    
    // Mapear productos al formato correcto
    const mappedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: p.price,
      category: p.categories?.name || "Frescos",
      bulkInfo: p.bulk_info || "",
      image_url: p.image_url || "",
      retail_price: p.retail_price || 0,
      show_retail_price: p.show_retail_price || false,
      badges: p.badges || [],
      min_boxes: p.min_boxes || 1,
      is_banner: p.is_banner || false,
      banner_title: p.banner_title || "",
      active: p.active
    }));
    
    // Guardar en localStorage para backup
    const fs = require('fs');
    const backupData = {
      products: mappedProducts,
      timestamp: new Date().toISOString(),
      total: mappedProducts.length
    };
    
    fs.writeFileSync('./products_backup.json', JSON.stringify(backupData, null, 2));
    console.log('💾 Backup guardado en products_backup.json');
    
    // Mostrar muestra de productos
    console.log('📦 Muestra de productos:');
    mappedProducts.slice(0, 3).forEach((p, i) => {
      console.log(`${i+1}. ${p.name} - $${p.price} - ${p.category}`);
    });
    
    console.log(`\n✅ ${mappedProducts.length} productos listos para cargar en la app`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

forceLoadProducts();
