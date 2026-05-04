const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bedccnjylrnkacaxtusv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGNjbmp5bHJua2FjYXh0dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODI2MzAsImV4cCI6MjA5MjY1ODYzMH0.1OewVpVOBI-IgFMPejheKUpq8z-rwUeRMQjR4g16NoQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupProfiles() {
  console.log("🚀 Configurando tabla profiles...");
  
  try {
    // 1. Verificar si la tabla profiles existe
    console.log("\n🔍 Verificando tabla profiles...");
    const { data: tables, error: tableError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST116') {
      console.log("❌ La tabla profiles no existe. Debes crearla manualmente:");
      console.log(`
-- Ejecuta este SQL en el dashboard de Supabase:
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  is_master BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Masters can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_master = true
    )
  );

-- Insertar trigger para actualización automática
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `);
      return;
    }
    
    // 2. Verificar usuarios existentes
    console.log("\n👥 Verificando usuarios existentes...");
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) throw error;
    
    console.log(`✅ Encontrados ${profiles.length} perfiles:`);
    profiles.forEach(p => {
      console.log(`  📧 ${p.email} | 👑 Master: ${p.is_master ? '✅ SI' : '❌ NO'} | 🎭 Role: ${p.role}`);
    });
    
    // 3. Verificar usuarios en auth.users
    console.log("\n🔍 Verificando usuarios de autenticación...");
    try {
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.log("⚠️ No se puede acceder a admin API (normal para anon key)");
        console.log("💡 Para verificar usuarios, ve al dashboard de Supabase → Authentication → Users");
      } else {
        console.log(`✅ Usuarios auth encontrados: ${users.length}`);
        users.forEach(user => {
          const profile = profiles.find(p => p.id === user.id);
          console.log(`  📧 ${user.email} | 🆔 ${user.id} | ✅ Confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'} | 📋 Profile: ${profile ? 'YES' : 'NO'}`);
        });
      }
    } catch (e) {
      console.log("⚠️ No se puede verificar usuarios auth con anon key");
    }
    
    // 4. Si no hay usuarios master, mostrar cómo crearlos
    const masters = profiles.filter(p => p.is_master);
    if (masters.length === 0) {
      console.log("\n❌ No hay usuarios master configurados");
      console.log("💡 Para crear un usuario master:");
      console.log("1. Crea el usuario en Authentication → Users del dashboard");
      console.log("2. Ejecuta: INSERT INTO profiles (id, email, is_master, role) VALUES ('user_id', 'email@example.com', true, 'master');");
      console.log("3. O usa la función RPC si está disponible: SELECT setup_master_user('email@example.com');");
    } else {
      console.log("\n✅ Usuarios master configurados:");
      masters.forEach(m => {
        console.log(`  👑 ${m.email} (${m.role})`);
      });
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

setupProfiles();
