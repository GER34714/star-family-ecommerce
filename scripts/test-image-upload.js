// Script para probar la subida de imágenes a Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración desde variables de entorno
const supabaseUrl = 'https://bedccnjylrnkacaxtusv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGNjbmp5bHJua2FjYXh0dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODI2MzAsImV4cCI6MjA5MjY1ODYzMH0.1OewVpVOBI-IgFMPejheKUpq8z-rwUeRMQjR4g16NoQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testImageUpload() {
  console.log('🧪 Probando subida de imágenes a Supabase Storage...');
  
  try {
    // 1. Crear una imagen de prueba (simple archivo de texto con extensión .jpg para simular)
    const testImageContent = 'This is a test image file for upload testing';
    const testFileName = `test-product-${Date.now()}.jpg`;
    const testFilePath = path.join(__dirname, testFileName);
    
    // Crear archivo de prueba
    fs.writeFileSync(testFilePath, testImageContent);
    console.log(`📁 Archivo de prueba creado: ${testFileName}`);
    
    // 2. Subir archivo a Supabase Storage
    console.log('\n📤 Subiendo archivo a Supabase...');
    const fileBuffer = fs.readFileSync(testFilePath);
    
    const { data, error } = await supabase.storage
      .from('products')
      .upload(`product-images/${testFileName}`, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      });
    
    if (error) {
      console.error('❌ Error en la subida:', error.message);
      return;
    }
    
    console.log('✅ Archivo subido exitosamente');
    console.log(`   - Path: ${data.path}`);
    
    // 3. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(data.path);
    
    console.log(`   - URL Pública: ${publicUrl}`);
    
    // 4. Verificar que el archivo es accesible públicamente
    console.log('\n🔍 Verificando acceso público...');
    try {
      const response = await fetch(publicUrl);
      if (response.ok) {
        console.log('✅ El archivo es accesible públicamente');
      } else {
        console.log('⚠️ El archivo puede no ser accesible públicamente');
      }
    } catch (fetchError) {
      console.log('⚠️ No se pudo verificar el acceso público:', fetchError.message);
    }
    
    // 5. Actualizar un producto con la imagen
    console.log('\n🔄 Actualizando un producto con la imagen...');
    const { data: updateData, error: updateError } = await supabase
      .from('products')
      .update({ image_url: publicUrl })
      .eq('id', 'f1')
      .select();
    
    if (updateError) {
      console.error('❌ Error actualizando producto:', updateError.message);
    } else {
      console.log('✅ Producto actualizado con la imagen');
      console.log(`   - Producto: ${updateData[0].name}`);
      console.log(`   - Imagen URL: ${updateData[0].image_url}`);
    }
    
    // 6. Limpiar archivo de prueba local
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Archivo de prueba local eliminado');
    
    // 7. Verificar productos con imágenes
    console.log('\n📊 Verificando productos con imágenes...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, image_url')
      .not('image_url', 'is', null);
    
    if (productsError) {
      console.error('❌ Error obteniendo productos con imágenes:', productsError.message);
    } else {
      console.log(`✅ ${products.length} productos tienen imágenes asignadas`);
      products.forEach(product => {
        console.log(`   - ${product.name}: ${product.image_url ? '✅ Tiene imagen' : '❌ Sin imagen'}`);
      });
    }
    
    console.log('\n🎉 Prueba de subida de imágenes completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error general en la prueba:', error.message);
  }
}

// Ejecutar prueba
testImageUpload().then(() => {
  console.log('\n🏁 Prueba finalizada');
}).catch(error => {
  console.error('❌ Error fatal en la prueba:', error);
});
