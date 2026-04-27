const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════
// SETUP PRICE HISTORY TABLE
// ═══════════════════════════════════════════════════════

async function setupPriceHistoryTable() {
  try {
    // Leer configuración desde variables de entorno o localStorage
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bedccnjylrnkacaxtusv.supabase.co';
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGNjbmp5bHJuYW1heHR1c3YiLCJpYXQiOjE3MTk0MjgxNjcsImV4cCI6MjAzNDkwNDE2N30.MgQmk7PzW4xJU2JiW1A_I5tDgJhQp8z4qJ5ZsK9JcY';

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Error: Se requieren variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY');
      process.exit(1);
    }

    console.log('🔧 Creando cliente de Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'create-price-history-table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Leyendo archivo SQL...');
    console.log('🔨 Ejecutando SQL para crear tabla price_history...');

    // Ejecutar el SQL usando rpc o SQL directo
    try {
      // Opción 1: Usar SQL directo si está disponible
      const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
      
      if (error) {
        console.log('⚠️ RPC no disponible, intentando método alternativo...');
        
        // Opción 2: Dividir el SQL en sentencias individuales
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            console.log(`🔨 Ejecutando: ${statement.substring(0, 50)}...`);
            
            // Intentar ejecutar como consulta directa
            try {
              const { error: stmtError } = await supabase
                .from('price_history')
                .select('*')
                .limit(1);
              
              // Si no hay error, la tabla ya existe
              if (!stmtError) {
                console.log('✅ Tabla price_history ya existe');
                break;
              }
            } catch (e) {
              // La tabla no existe, continuar con el siguiente paso
            }
          }
        }
        
        // Crear la tabla manualmente si el RPC no funciona
        console.log('🔨 Creando tabla price_history manualmente...');
        
        const { error: createError } = await supabase
          .from('price_history')
          .select('*')
          .limit(1);
          
        if (createError && createError.code === 'PGRST116') {
          console.log('❌ La tabla no existe. Por favor, ejecuta el SQL manualmente en el dashboard de Supabase:');
          console.log('\n📋 SQL a ejecutar en el dashboard de Supabase:');
          console.log('═══════════════════════════════════════════════════════');
          console.log(sqlContent);
          console.log('═══════════════════════════════════════════════════════');
          console.log('\n🌐 Dashboard: https://supabase.com/dashboard/project/bedccnjylrnkacaxtusv/sql');
        } else if (!createError) {
          console.log('✅ Tabla price_history ya existe');
        }
      } else {
        console.log('✅ SQL ejecutado exitosamente');
      }
    } catch (rpcError) {
      console.log('⚠️ Error con RPC, la tabla probablemente necesita ser creada manualmente');
      console.log('\n📋 Por favor, ejecuta el siguiente SQL en el dashboard de Supabase:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(sqlContent);
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n🌐 Dashboard: https://supabase.com/dashboard/project/bedccnjylrnkacaxtusv/sql');
    }

    // Verificar si la tabla existe
    console.log('\n🔍 Verificando si la tabla existe...');
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .limit(1);

      if (error) {
        console.log('❌ La tabla price_history aún no existe:', error.message);
        console.log('\n📋 Por favor, ejecuta el SQL manualmente en el dashboard de Supabase');
      } else {
        console.log('✅ Tabla price_history verificada y funcionando');
        console.log('📊 Listo para registrar historial de precios');
      }
    } catch (verifyError) {
      console.log('❌ Error verificando la tabla:', verifyError.message);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  }
}

// Ejecutar el script
setupPriceHistoryTable();
