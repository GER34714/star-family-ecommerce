// Script para migrar productos existentes a Supabase
const { createClient } = require('@supabase/supabase-js');

// Configuración desde variables de entorno
const supabaseUrl = 'https://bedccnjylrnkacaxtusv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGNjbmp5bHJua2FjYXh0dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODI2MzAsImV4cCI6MjA5MjY1ODYzMH0.1OewVpVOBI-IgFMPejheKUpq8z-rwUeRMQjR4g16NoQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Productos existentes desde el código
const SEED_PRODUCTS = [
  // FRESCOS
  { id:"f1", category:"Frescos", name:"Salchichas Cortas x6", description:"Salchichas cocidas y ahumadas sin piel. La clásica de siempre.", price:19725, bulkInfo:"Bulto x 24 paquetes", image:"" },
  { id:"f2", category:"Frescos", name:"Salchichas Largas x6", description:"Salchichas largas cocidas y ahumadas sin piel.", price:19050, bulkInfo:"Bulto x 12 paquetes", image:"" },
  { id:"f3", category:"Frescos", name:"Salchichas Largas x18", description:"Salchichas largas cocidas y ahumadas sin piel.", price:19050, bulkInfo:"Bulto x 4 paquetes", image:"" },
  { id:"f4", category:"Frescos", name:"Salchichita 500g", description:"Salchichitas ideales para kioscos y eventos.", price:3437, bulkInfo:"Bulto x 6 paquetes de 500gr", image:"" },
  { id:"f5", category:"Frescos", name:"Premium Alemana x12", description:"Línea premium tipo alemana. Sabor superior.", price:35000, bulkInfo:"Bulto x 4 paquetes", image:"" },
  // COMPLETOS
  { id:"c1", category:"Completos", name:"Completo Cortas", description:"Kit completo con pan incluido. Listo para vender.", price:19725, bulkInfo:"144 Salchichas + 144 Panes", image:"" },
  { id:"c2", category:"Completos", name:"Completo Largas (x18)", description:"Salchichas largas con pan. Ideal para eventos y locales.", price:34800, bulkInfo:"72 Salchichas + 72 Panes", image:"" },
  { id:"c3", category:"Completos", name:"Completo Largas (x6)", description:"Formato alternativo con salchichas largas y pan.", price:34800, bulkInfo:"72 Salchichas (12paq x6) + 72 Panes", image:"" },
  // PANCHOS ARMADOS
  { id:"p1", category:"Panchos Armados", name:"30 Panchos Cortos", description:"Kit completo listo para armar. Panes + salchichas + aderezo.", price:11700, bulkInfo:"30 Panes + 30 Salchichas + 1 Aderezo", image:"" },
  { id:"p2", category:"Panchos Armados", name:"60 Panchos Cortos", description:"Kit completo listo para armar. Panes + salchichas + aderezo.", price:22200, bulkInfo:"60 Panes + 60 Salchichas + 1 Aderezo", image:"" },
  { id:"p3", category:"Panchos Armados", name:"36 Panchos Largos", description:"Kit completo listo para armar. Panes + salchichas + aderezo.", price:21600, bulkInfo:"36 Panes + 36 Salchichas + 1 Aderezo", image:"" },
  { id:"p4", category:"Panchos Armados", name:"72 Panchos Largos", description:"Kit completo listo para armar. Panes + salchichas + aderezo.", price:42000, bulkInfo:"72 Panes + 72 Salchichas + 1 Aderezo", image:"" },
  // HAMBURGUESAS
  { id:"h1", category:"Hamburguesas", name:"24 Hamburguesas Clásicas 69g", description:"24 panes + 24 medallones de carne + 1 aderezo.", price:22900, bulkInfo:"24 Panes + 24 Medallones + 1 Aderezo", image:"" },
  { id:"h2", category:"Hamburguesas", name:"60 Hamburguesas Clásicas 69g", description:"60 panes + 60 medallones de carne + 1 aderezo.", price:55400, bulkInfo:"60 Panes + 60 Medallones + 1 Aderezo", image:"" },
  { id:"h3", category:"Hamburguesas", name:"20 Hamburguesas Gigantes 110g", description:"20 panes + 20 medallones gigantes + 1 aderezo.", price:26800, bulkInfo:"20 Panes + 20 Medallones + 1 Aderezo", image:"" },
  { id:"h4", category:"Hamburguesas", name:"40 Hamburguesas Gigantes 110g", description:"40 panes + 40 medallones gigantes + 1 aderezo.", price:52400, bulkInfo:"40 Panes + 40 Medallones + 1 Aderezo", image:"" },
  // PIZZAS Y EMPANADAS
  { id:"pe1", category:"Pizzas y Empanadas", name:"Pizzas Mozzarella x11", description:"Pizza congelada con salsa de tomate y mozzarella. Lista para hornear.", price:48125, bulkInfo:"Caja x 11 unidades · $4.375 c/u", image:"" },
  { id:"pe2", category:"Pizzas y Empanadas", name:"Empanadas Premium x42", description:"Carne, pollo, jamón y queso, y verduras. Premium.", price:36540, bulkInfo:"Caja x 42 unidades · $870 c/u", image:"" },
  // MEDIALUNAS Y CHIPAS
  { id:"m1", category:"Medialunas y Chipas", name:"Chipa x4.5kg", description:"Chipas artesanales premium.", price:46875, bulkInfo:"Caja x 4.5 kg", image:"" },
  { id:"m2", category:"Medialunas y Chipas", name:"Medialunas Crudas x96", description:"Medialunas de manteca premium 55g c/u.", price:40800, bulkInfo:"Caja x 96 unidades (55g c/u)", image:"" },
  // COMBOS
  { id:"k1", category:"Combos", name:"Combo Pancho Largo", description:"1 salchicha larga + 1 pan + aderezos. El más vendido.", price:3200, bulkInfo:"Caja x 12 combos de 6 (72 panchos)", image:"" },
  { id:"k2", category:"Combos", name:"Combo Hamburguesa 69g", description:"1 medallón clásico + 1 pan + aderezos.", price:3500, bulkInfo:"Caja x 15 combos de 4", image:"" },
  { id:"k3", category:"Combos", name:"Combo Hamburguesa 110g", description:"1 medallón gigante + 1 pan + aderezos.", price:4950, bulkInfo:"Caja x 10 combos de 4", image:"" },
];

async function migrateProducts() {
  console.log('🚀 Iniciando migración de productos a Supabase...');
  
  try {
    // 1. Verificar si la tabla products existe
    console.log('\n📋 Verificando tabla products...');
    const { data: tables, error: tablesError } = await supabase
      .from('products')
      .select('count')
      .limit(1);
    
    if (tablesError && tablesError.code === 'PGRST116') {
      console.log('⚠️ La tabla "products" no existe. Debe crearla primero.');
      console.log('📝 SQL para crear la tabla:');
      console.log(`
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  bulk_info TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_name ON products(name);
      `);
      return;
    }
    
    // 2. Preparar productos para migrar
    console.log('\n📦 Preparando productos para migrar...');
    const productsToMigrate = SEED_PRODUCTS.map(p => ({
      id: p.id,
      category: p.category,
      name: p.name,
      description: p.description || '',
      price: p.price,
      bulk_info: p.bulkInfo || '',
      image_url: p.image || '',
      active: true
    }));
    
    console.log(`✅ ${productsToMigrate.length} productos preparados`);
    
    // 3. Migrar en batches
    console.log('\n🔄 Migrando productos a Supabase...');
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < productsToMigrate.length; i += batchSize) {
      const batch = productsToMigrate.slice(i, i + batchSize);
      console.log(`📦 Procesando batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productsToMigrate.length/batchSize)} (${batch.length} productos)...`);
      
      try {
        const { data, error } = await supabase
          .from('products')
          .upsert(batch, {
            onConflict: 'id',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`❌ Error en batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          errorCount += batch.length;
        } else {
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} migrado exitosamente`);
          successCount += batch.length;
        }
      } catch (batchError) {
        console.error(`❌ Error crítico en batch ${Math.floor(i/batchSize) + 1}:`, batchError.message);
        errorCount += batch.length;
      }
    }
    
    // 4. Verificar migración
    console.log('\n🔍 Verificando migración...');
    const { data: migratedProducts, error: verifyError } = await supabase
      .from('products')
      .select('*')
      .eq('active', true);
    
    if (verifyError) {
      console.error('❌ Error verificando migración:', verifyError.message);
    } else {
      console.log(`✅ Migración completada:`);
      console.log(`   - Éxitos: ${successCount} productos`);
      console.log(`   - Errores: ${errorCount} productos`);
      console.log(`   - Total en Supabase: ${migratedProducts.length} productos`);
    }
    
    // 5. Mostrar resumen
    console.log('\n📊 Resumen de migración:');
    console.log(`   - Productos originales: ${SEED_PRODUCTS.length}`);
    console.log(`   - Productos migrados: ${successCount}`);
    console.log(`   - Productos con error: ${errorCount}`);
    console.log(`   - Productos en Supabase: ${migratedProducts?.length || 0}`);
    
    if (successCount === SEED_PRODUCTS.length) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
    } else {
      console.log('\n⚠️ Migración completada con algunos errores. Revisa los logs.');
    }
    
  } catch (error) {
    console.error('❌ Error general en la migración:', error.message);
  }
}

// Ejecutar migración
migrateProducts().then(() => {
  console.log('\n🏁 Proceso de migración finalizado');
}).catch(error => {
  console.error('❌ Error fatal en la migración:', error);
});
