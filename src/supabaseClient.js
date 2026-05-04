// ═════════════════════════════════════════════════════
// SUPABASE CLIENT - SINGLETON PATTERN
// ═════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;
let configLogged = false; // Evitar logs repetidos

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
  
  // Logging solo una vez para diagnóstico
  if (!configLogged && !supabaseInstance) {
    console.log('🔍 Supabase Config:', {
      url: url ? `${url.substring(0, 30)}...` : 'NO URL',
      hasKey: !!key,
      keyLength: key?.length || 0,
      fromLocalStorage: !!localStorage.getItem("roxy_supa")
    });
    configLogged = true;
  }
  
  // Crear instancia solo si no existe y hay configuración válida
  if (!supabaseInstance && url && key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        db: {
          timeout: 10000, // 10 segundos timeout
        }
      });
      console.log('✅ Cliente Supabase creado (singleton)');
    } catch (error) {
      console.error('❌ Error creando cliente Supabase:', error);
      return null;
    }
  }
  
  return supabaseInstance;
};

// Función para resetear la instancia (útil para testing o cambio de configuración)
export const resetSupabaseClient = () => {
  supabaseInstance = null;
  console.log('🔄 Cliente Supabase reseteado');
};

export default getSupabaseClient;
