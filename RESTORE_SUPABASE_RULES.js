// ═══════════════════════════════════════════════════════════════════════════════
// SCRIPT DE RESTAURACIÓN COMPLETA DE REGLAS DE SUPABASE
// Este script restaura todas las reglas, políticas y funciones desde un backup
// ═══════════════════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración
const supabaseUrl = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreSupabaseRules(backupFilePath) {
  console.log('🔄 Iniciando restauración de reglas de Supabase...');
  
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Archivo de backup no encontrado: ${backupFilePath}`);
  }

  try {
    // Leer backup
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    
    console.log(`📋 Restaurando backup del: ${backupData.timestamp}`);
    console.log(`🌐 Proyecto: ${backupData.project}`);
    
    const results = {
      restored: [],
      errors: [],
      warnings: []
    };

    // 1. Restaurar políticas RLS
    if (backupData.data.policies && backupData.data.policies.length > 0) {
      console.log('🔐 Restaurando políticas RLS...');
      
      for (const policy of backupData.data.policies) {
        try {
          // Eliminar política existente si existe
          await supabase.rpc('exec_sql', {
            sql: `DROP POLICY IF EXISTS "${policy.policyname}" ON ${policy.tablename};`
          });
          
          // Recrear política
          let policySQL = `CREATE POLICY "${policy.policyname}" ON ${policy.tablename} FOR ${policy.cmd}`;
          
          if (policy.qual) {
            policySQL += ` USING (${policy.qual})`;
          }
          
          if (policy.with_check) {
            policySQL += ` WITH CHECK (${policy.with_check})`;
          }
          
          policySQL += ';';
          
          const { error } = await supabase.rpc('exec_sql', { sql: policySQL });
          
          if (error) {
            results.errors.push({
              type: 'policy',
              name: policy.policyname,
              error: error.message
            });
          } else {
            results.restored.push({
              type: 'policy',
              name: policy.policyname,
              table: policy.tablename
            });
          }
        } catch (error) {
          results.errors.push({
            type: 'policy',
            name: policy.policyname,
            error: error.message
          });
        }
      }
    }

    // 2. Restaurar funciones personalizadas
    if (backupData.data.functions && backupData.data.functions.length > 0) {
      console.log('⚡ Restaurando funciones personalizadas...');
      
      for (const func of backupData.data.functions) {
        try {
          if (func.prosrc) {
            const { error } = await supabase.rpc('exec_sql', { sql: func.prosrc });
            
            if (error) {
              results.errors.push({
                type: 'function',
                name: func.proname,
                error: error.message
              });
            } else {
              results.restored.push({
                type: 'function',
                name: func.proname
              });
            }
          }
        } catch (error) {
          results.errors.push({
            type: 'function',
            name: func.proname,
            error: error.message
          });
        }
      }
    }

    // 3. Restaurar índices
    if (backupData.data.indexes && backupData.data.indexes.length > 0) {
      console.log('📊 Restaurando índices...');
      
      for (const index of backupData.data.indexes) {
        try {
          // Verificar si el índice ya existe
          const indexSQL = `CREATE INDEX IF NOT EXISTS ${index.indexname} ON ${index.tablename} (${index.indexdef});`;
          
          const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
          
          if (error) {
            results.errors.push({
              type: 'index',
              name: index.indexname,
              error: error.message
            });
          } else {
            results.restored.push({
              type: 'index',
              name: index.indexname,
              table: index.tablename
            });
          }
        } catch (error) {
          results.errors.push({
            type: 'index',
            name: index.indexname,
            error: error.message
          });
        }
      }
    }

    // 4. Restaurar triggers (más complejo, necesita la función asociada)
    if (backupData.data.triggers && backupData.data.triggers.length > 0) {
      console.log('🎯 Analizando triggers para restauración...');
      
      for (const trigger of backupData.data.triggers) {
        results.warnings.push({
          type: 'trigger',
          name: trigger.tgname,
          message: 'Los triggers necesitan ser restaurados manualmente con sus funciones asociadas'
        });
      }
    }

    // 5. Restaurar configuración de storage
    if (backupData.data.storage && backupData.data.storage.buckets) {
      console.log('📁 Restaurando configuración de storage...');
      
      for (const bucket of backupData.data.storage.buckets) {
        try {
          const { error } = await supabase.storage.createBucket(bucket.name, {
            public: bucket.public || false,
            allowedMimeTypes: bucket.allowed_mime_types,
            fileSizeLimit: bucket.file_size_limit
          });
          
          if (error && !error.message.includes('already exists')) {
            results.errors.push({
              type: 'storage',
              name: bucket.name,
              error: error.message
            });
          } else {
            results.restored.push({
              type: 'storage',
              name: bucket.name
            });
          }
        } catch (error) {
          results.warnings.push({
            type: 'storage',
            name: bucket.name,
            message: 'La configuración de storage puede necesitar ajustes manuales'
          });
        }
      }
    }

    // Generar reporte
    console.log('\n✅ Restauración completada');
    console.log('📊 Resumen de resultados:');
    console.log(`✅ Elementos restaurados: ${results.restored.length}`);
    console.log(`❌ Errores: ${results.errors.length}`);
    console.log(`⚠️  Advertencias: ${results.warnings.length}`);

    if (results.restored.length > 0) {
      console.log('\n✅ Elementos restaurados exitosamente:');
      results.restored.forEach(item => {
        console.log(`   ${item.type}: ${item.name}${item.table ? ` (${item.table})` : ''}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errores durante la restauración:');
      results.errors.forEach(error => {
        console.log(`   ${error.type}: ${error.name} - ${error.error}`);
      });
    }

    if (results.warnings.length > 0) {
      console.log('\n⚠️  Advertencias:');
      results.warnings.forEach(warning => {
        console.log(`   ${warning.type}: ${warning.name} - ${warning.message}`);
      });
    }

    return results;
    
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    throw error;
  }
}

async function restoreFromSQL(sqlFilePath) {
  console.log('🔄 Restaurando desde archivo SQL...');
  
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`Archivo SQL no encontrado: ${sqlFilePath}`);
  }

  try {
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir el SQL en sentencias individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    console.log(`📋 Ejecutando ${statements.length} sentencias SQL...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          console.error(`❌ Error en sentencia: ${statement.substring(0, 50)}...`);
          console.error(`   ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error ejecutando: ${statement.substring(0, 50)}...`);
        console.error(`   ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n✅ Restauración SQL completada');
    console.log(`✅ Sentencias exitosas: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    
    return { successCount, errorCount };
    
  } catch (error) {
    console.error('❌ Error durante la restauración SQL:', error);
    throw error;
  }
}

async function setupExecFunction() {
  console.log('🔧 Configurando función de ejecución SQL...');
  
  const execSQLFunction = `
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: execSQLFunction });
    if (error && !error.message.includes('already exists')) {
      console.log('⚠️  No se pudo crear función exec_sql:', error.message);
    }
  } catch (e) {
    // Intentar crearla directamente
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: execSQLFunction });
      if (error) {
        console.log('⚠️  Error al configurar función exec_sql:', error.message);
      }
    } catch (e2) {
      console.log('⚠️  No se pudo configurar la función de ejecución SQL');
    }
  }
}

// Función para listar backups disponibles
function listBackups() {
  const backupDir = __dirname;
  const files = fs.readdirSync(backupDir);
  
  const backups = files.filter(file => 
    file.startsWith('SUPABASE_COMPLETE_RULES_BACKUP_') && 
    file.endsWith('.json')
  );
  
  console.log('📁 Backups disponibles:');
  if (backups.length === 0) {
    console.log('   No se encontraron backups');
  } else {
    backups.forEach(backup => {
      const stats = fs.statSync(path.join(backupDir, backup));
      console.log(`   ${backup} (${stats.size} bytes, ${stats.mtime.toLocaleDateString()})`);
    });
  }
  
  return backups;
}

// Ejecutar restauración
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--list')) {
    listBackups();
    process.exit(0);
  }
  
  if (args.length === 0) {
    console.log('Uso:');
    console.log('  node RESTORE_SUPABASE_RULES.js <archivo_backup.json>');
    console.log('  node RESTORE_SUPABASE_RULES.js <archivo_backup.sql>');
    console.log('  node RESTORE_SUPABASE_RULES.js --list');
    process.exit(1);
  }
  
  const backupFile = args[0];
  const isSQL = backupFile.endsWith('.sql');
  
  (async () => {
    try {
      await setupExecFunction();
      
      if (isSQL) {
        await restoreFromSQL(backupFile);
      } else {
        await restoreSupabaseRules(backupFile);
      }
      
      console.log('\n🎉 Restauración completada');
    } catch (error) {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    }
  })();
}

module.exports = { 
  restoreSupabaseRules, 
  restoreFromSQL, 
  setupExecFunction, 
  listBackups 
};
