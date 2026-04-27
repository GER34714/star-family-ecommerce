// ═══════════════════════════════════════════════════
// SUPABASE CLIENT - SINGLETON PATTERN
// ═══════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export const getSupabaseClient = () => {
  // Variables de entorno por defecto para producción
  const defaultUrl = process.env.REACT_APP_SUPABASE_URL || "";
  const defaultKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
  
  // Obtener configuración desde localStorage (para configuración dinámica)
  let url = defaultUrl;
  let key = defaultKey;
  
  try {
    const supaConfig = localStorage.getItem("roxy_supa");
    if (supaConfig) {
      const config = JSON.parse(supaConfig);
      url = config.url || defaultUrl;
      key = config.key || defaultKey;
    }
  } catch (error) {
    console.warn('Error leyendo configuración de Supabase:', error);
  }
  
  // Crear instancia solo si no existe y hay configuración válida
  if (!supabaseInstance && url && key) {
    supabaseInstance = createClient(url, key);
    console.log('✅ Cliente Supabase creado (singleton)');
  }
  
  return supabaseInstance;
};

// Función para resetear la instancia (útil para testing o cambio de configuración)
export const resetSupabaseClient = () => {
  supabaseInstance = null;
  console.log('🔄 Cliente Supabase reseteado');
};

export default getSupabaseClient;
