#!/usr/bin/env node

// ═══════════════════════════════════════════════════════
// SCRIPT DE RESTAURACIÓN FINAL PERFECTA
// ═══════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

async function validateEnvironment() {
  console.log('🔍 Validando entorno de restauración...');
  
  // Verificar Node.js
  const nodeVersion = process.version;
  console.log(`✅ Node.js: ${nodeVersion}`);
  
  // Verificar npm
  try {
    execSync('npm --version', { stdio: 'pipe' });
    console.log('✅ npm disponible');
  } catch (error) {
    throw new Error('npm no está disponible');
  }
  
  return true;
}

async function restoreComplete() {
  try {
    console.log('🚀 Iniciando RESTAURACIÓN FINAL PERFECTA...');
    
    // Validar entorno
    await validateEnvironment();
    
    // Leer y validar datos
    console.log('📋 Leyendo datos de backup...');
    const backupData = JSON.parse(fs.readFileSync('./supabase_data_validated.json', 'utf8'));
    
    if (!backupData.validated) {
      throw new Error('Los datos de backup no están validados');
    }
    
    console.log(`✅ Backup validado: ${backupData.metadata.total_products} productos, ${backupData.metadata.total_categories} categorías`);
    
    // Conectar a Supabase
    console.log('☁️ Conectando a Supabase...');
    const supabase = createClient(backupData.supabase_config.url, backupData.supabase_config.key);
    
    // Test de conexión
    const { data, error } = await supabase.from('products').select('count').single();
    if (error && error.code !== 'PGRST116') {
      throw new Error('Error de conexión a Supabase: ' + error.message);
    }
    console.log('✅ Conexión a Supabase establecida');
    
    // Restaurar categorías primero
    console.log('📂 Restaurando categorías...');
    let categoriesRestored = 0;
    for (const category of backupData.categories) {
      const { error } = await supabase
        .from('categories')
        .upsert(category, { onConflict: 'id' });
      if (error) {
        console.warn(`⚠️ Error restaurando categoría ${category.id}: ${error.message}`);
      } else {
        categoriesRestored++;
      }
    }
    console.log(`✅ ${categoriesRestored}/${backupData.categories.length} categorías restauradas`);
    
    // Restaurar productos
    console.log('📦 Restaurando productos...');
    let productsRestored = 0;
    for (const product of backupData.products) {
      const { error } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'id' });
      if (error) {
        console.warn(`⚠️ Error restaurando producto ${product.id}: ${error.message}`);
      } else {
        productsRestored++;
      }
    }
    console.log(`✅ ${productsRestored}/${backupData.products.length} productos restaurados`);
    
    // Instalar dependencias
    console.log('📦 Instalando dependencias...');
    try {
      execSync('npm install', { stdio: 'inherit', timeout: 300000 });
      console.log('✅ Dependencias instaladas');
    } catch (error) {
      console.warn('⚠️ Error instalando dependencias, intenta manualmente: npm install');
    }
    
    // Verificación final
    console.log('🔍 Verificación final...');
    const { data: finalProducts } = await supabase.from('products').select('*');
    console.log(`✅ Verificación: ${finalProducts?.length || 0} productos en base de datos`);
    
    console.log('✅ ¡RESTAURACIÓN FINAL PERFECTA COMPLETADA!');
    console.log('🌐 Ejecuta "npm start" para iniciar la aplicación');
    console.log('🔗 URL: http://localhost:3000 (o el puerto que esté disponible)');
    
  } catch (error) {
    console.error('❌ Error en restauración:', error.message);
    process.exit(1);
  }
}

restoreComplete();
