const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bedccnjylrnkacaxtusv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGNjbmp5bHJua2FjYXh0dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODI2MzAsImV4cCI6MjA5MjY1ODYzMH0.1OewVpVOBI-IgFMPejheKUpq8z-rwUeRMQjR4g16NoQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🚀 Verificando Star Family...");
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    
    console.log("\n👥 USUARIOS EN TABLA PROFILES:");
    data.forEach(p => {
      console.log(`- ${p.email} | Master: ${p.is_master ? '✅ SI' : '❌ NO'} | Role: ${p.role}`);
    });
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}
run();
