// Script para configurar Supabase Storage
const { createClient } = require('@supabase/supabase-js');

// Configuración desde variables de entorno
const supabaseUrl = 'https://bedccnjylrnkacaxtusv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGNjbmp5bHJua2FjYXh0dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODI2MzAsImV4cCI6MjA5MjY1ODYzMH0.1OewVpVOBI-IgFMPejheKUpq8z-rwUeRMQjR4g16NoQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  console.log('🔍 Verificando configuración de Supabase Storage...');
  
  try {
    // 1. Verificar si el bucket 'products' existe
    console.log('\n📦 Verificando bucket "products"...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listando buckets:', bucketsError);
      return;
    }
    
    const productsBucket = buckets.find(bucket => bucket.name === 'products');
    
    if (!productsBucket) {
      console.log('⚠️ Bucket "products" no encontrado. Debe crearlo manualmente en el dashboard de Supabase.');
      console.log('📝 Instrucciones:');
      console.log('1. Vaya a https://supabase.com/dashboard/project/bedccnjylrnkacaxtusv/storage');
      console.log('2. Haga clic en "Create bucket"');
      console.log('3. Nombre: "products"');
      console.log('4. Haga clic en "Save"');
    } else {
      console.log('✅ Bucket "products" encontrado');
      console.log(`   - ID: ${productsBucket.id}`);
      console.log(`   - Creado: ${productsBucket.created_at}`);
      console.log(`   - Público: ${productsBucket.public}`);
    }
    
    // 2. Verificar políticas del bucket
    console.log('\n🔒 Verificando políticas del bucket...');
    const { data: policies, error: policiesError } = await supabase
      .from('storage.policies')
      .select('*')
      .eq('bucket_id', 'products');
    
    if (policiesError) {
      console.error('❌ Error verificando políticas:', policiesError.message);
      console.log('ℹ️ Esto puede ser normal si no tiene permisos para ver políticas');
    } else {
      console.log(`✅ Encontradas ${policies.length} políticas para el bucket "products"`);
      policies.forEach(policy => {
        console.log(`   - ${policy.name}: ${policy.definition}`);
      });
    }
    
    // 3. Probar subida de un archivo de prueba
    console.log('\n🧪 Probando subida de archivo...');
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const fileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('products')
      .upload(`test/${fileName}`, testFile, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Error en subida de prueba:', uploadError.message);
      console.log('ℹ️ Esto puede indicar que las políticas no están configuradas correctamente');
    } else {
      console.log('✅ Subida de prueba exitosa');
      console.log(`   - Path: ${uploadData.path}`);
      
      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(uploadData.path);
      
      console.log(`   - URL Pública: ${publicUrl}`);
      
      // Limpiar archivo de prueba
      await supabase.storage.from('products').remove([uploadData.path]);
      console.log('🧹 Archivo de prueba eliminado');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// SQL para crear las políticas necesarias
console.log('📋 SQL para configurar políticas (ejecutar en el dashboard de Supabase):');
console.log(`
-- Permitir a todos ver las imágenes del bucket products
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

-- Permitir a usuarios autenticados subir imágenes
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'products' AND 
  auth.role() = 'authenticated'
);

-- Permitir a usuarios autenticados actualizar sus propias imágenes
CREATE POLICY "Allow authenticated users to update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'products' AND 
  auth.role() = 'authenticated'
);

-- Permitir a usuarios autenticados eliminar sus propias imágenes
CREATE POLICY "Allow authenticated users to delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'products' AND 
  auth.role() = 'authenticated'
);
`);

setupStorage().then(() => {
  console.log('\n🎉 Verificación completada');
}).catch(error => {
  console.error('❌ Error en la verificación:', error);
});
