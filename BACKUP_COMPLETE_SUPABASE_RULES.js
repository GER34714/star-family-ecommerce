// ═══════════════════════════════════════════════════════════════════════════════
// BACKUP COMPLETO DE REGLAS DE SUPABASE
// Este script crea un backup completo de todas las reglas, políticas y funciones
// ═══════════════════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración
const supabaseUrl = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupCompleteSupabaseRules() {
  console.log('🔄 Iniciando backup completo de reglas de Supabase...');
  
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    project: supabaseUrl,
    data: {
      tables: {},
      policies: {},
      functions: {},
      triggers: {},
      indexes: {},
      constraints: {},
      storage: {}
    }
  };

  try {
    // 1. Backup de tablas y su estructura
    console.log('📋 Backup de estructura de tablas...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info');
    
    if (!tablesError && tables) {
      backup.data.tables = tables;
    }

    // 2. Backup de políticas RLS
    console.log('🔐 Backup de políticas RLS...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*');
    
    if (!policiesError && policies) {
      backup.data.policies = policies;
    }

    // 3. Backup de funciones personalizadas
    console.log('⚡ Backup de funciones personalizadas...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_custom_functions');
    
    if (!functionsError && functions) {
      backup.data.functions = functions;
    }

    // 4. Backup de triggers
    console.log('🎯 Backup de triggers...');
    const { data: triggers, error: triggersError } = await supabase
      .from('pg_trigger')
      .select('*');
    
    if (!triggersError && triggers) {
      backup.data.triggers = triggers;
    }

    // 5. Backup de índices
    console.log('📊 Backup de índices...');
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('*');
    
    if (!indexesError && indexes) {
      backup.data.indexes = indexes;
    }

    // 6. Backup de constraints
    console.log('🔒 Backup de constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .from('pg_constraint')
      .select('*');
    
    if (!constraintsError && constraints) {
      backup.data.constraints = constraints;
    }

    // 7. Backup de configuración de storage (si es posible)
    console.log('📁 Backup de configuración de storage...');
    try {
      const { data: buckets, error: bucketsError } = await supabase
        .storage.listBuckets();
      
      if (!bucketsError && buckets) {
        backup.data.storage.buckets = buckets;
      }
    } catch (storageError) {
      console.log('⚠️  No se pudo acceder a la configuración de storage');
    }

    // Guardar backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `SUPABASE_COMPLETE_RULES_BACKUP_${timestamp}.json`;
    const backupPath = path.join(__dirname, backupFileName);
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    // También guardar versión SQL
    const sqlBackupFileName = `SUPABASE_COMPLETE_RULES_BACKUP_${timestamp}.sql`;
    const sqlBackupPath = path.join(__dirname, sqlBackupFileName);
    
    const sqlContent = generateSQLBackup(backup);
    fs.writeFileSync(sqlBackupPath, sqlContent);
    
    console.log('✅ Backup completado exitosamente:');
    console.log(`📄 JSON: ${backupFileName}`);
    console.log(`📄 SQL: ${sqlBackupFileName}`);
    console.log(`📊 Total tablas: ${Object.keys(backup.data.tables).length}`);
    console.log(`🔐 Total políticas: ${backup.data.policies.length || 0}`);
    console.log(`⚡ Total funciones: ${backup.data.functions.length || 0}`);
    console.log(`🎯 Total triggers: ${backup.data.triggers.length || 0}`);
    console.log(`📊 Total índices: ${backup.data.indexes.length || 0}`);
    console.log(`🔒 Total constraints: ${backup.data.constraints.length || 0}`);
    
    return { backupPath, sqlBackupPath, backup };
    
  } catch (error) {
    console.error('❌ Error durante el backup:', error);
    throw error;
  }
}

function generateSQLBackup(backup) {
  let sql = `-- ═══════════════════════════════════════════════════════════════════════════════
-- BACKUP COMPLETO DE REGLAS SUPABASE
-- Fecha: ${backup.timestamp}
-- Proyecto: ${backup.project}
-- ═══════════════════════════════════════════════════════════════════════════════

-- ADVERTENCIA: Este script contiene todas las reglas y configuraciones
-- Ejecutar con cuidado y solo si es necesario restaurar completamente

`;

  // Generar SQL para políticas
  if (backup.data.policies && backup.data.policies.length > 0) {
    sql += `-- ═══════════════════════════════════════════════════════════════════════════════
-- POLÍTICAS RLS
-- ═══════════════════════════════════════════════════════════════════════════════

`;
    backup.data.policies.forEach(policy => {
      sql += `-- Política: ${policy.policyname} para tabla: ${policy.tablename}
DROP POLICY IF EXISTS "${policy.policyname}" ON ${policy.tablename};
CREATE POLICY "${policy.policyname}" ON ${policy.tablename} FOR ${policy.cmd} 
  ${policy.qual ? `USING (${policy.qual})` : ''} 
  ${policy.with_check ? `WITH CHECK (${policy.with_check})` : ''};

`;
    });
  }

  // Generar SQL para funciones
  if (backup.data.functions && backup.data.functions.length > 0) {
    sql += `-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCIONES PERSONALIZADAS
-- ═══════════════════════════════════════════════════════════════════════════════

`;
    backup.data.functions.forEach(func => {
      sql += `-- Función: ${func.proname}
${func.prosrc || '-- Fuente no disponible'}

`;
    });
  }

  // Generar SQL para triggers
  if (backup.data.triggers && backup.data.triggers.length > 0) {
    sql += `-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

`;
    backup.data.triggers.forEach(trigger => {
      sql += `-- Trigger: ${trigger.tgname}
-- Nota: Los triggers necesitan ser recreados manualmente con su función asociada

`;
    });
  }

  sql += `-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DEL BACKUP
-- ═══════════════════════════════════════════════════════════════════════════════
`;

  return sql;
}

// Funciones auxiliares para obtener información del sistema
async function setupSupabaseFunctions() {
  console.log('🔧 Configurando funciones auxiliares en Supabase...');
  
  const functions = [
    // Función para obtener información de tablas
    `CREATE OR REPLACE FUNCTION get_table_info()
    RETURNS TABLE(
      table_name TEXT,
      column_name TEXT,
      data_type TEXT,
      is_nullable TEXT,
      column_default TEXT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position;
    END;
    $$ LANGUAGE plpgsql;`,

    // Función para obtener funciones personalizadas
    `CREATE OR REPLACE FUNCTION get_custom_functions()
    RETURNS TABLE(
      proname TEXT,
      prosrc TEXT,
      pronargs INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        p.proname,
        p.prosrc,
        p.pronargs
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname NOT LIKE 'pg_%';
    END;
    $$ LANGUAGE plpgsql;`
  ];

  for (const func of functions) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: func });
      if (error) {
        console.log('⚠️  Error al crear función auxiliar:', error.message);
      }
    } catch (e) {
      console.log('⚠️  No se pudo crear función auxiliar:', e.message);
    }
  }
}

// Ejecutar backup
if (require.main === module) {
  (async () => {
    try {
      await setupSupabaseFunctions();
      const result = await backupCompleteSupabaseRules();
      console.log('\n🎉 Backup completado exitosamente');
      console.log('📁 Archivos generados:');
      console.log(`   - ${result.backupPath}`);
      console.log(`   - ${result.sqlBackupPath}`);
    } catch (error) {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    }
  })();
}

module.exports = { backupCompleteSupabaseRules, setupSupabaseFunctions };
