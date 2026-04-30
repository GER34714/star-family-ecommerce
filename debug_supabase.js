// ═══════════════════════════════════════════════════════
// DEBUG DE SUPABASE - VERIFICAR CONEXIÓN Y PERSISTENCIA
// ═════════════════════════════════════════════════════

// Función para diagnosticar problemas de Supabase
const debugSupabase = async () => {
  console.log("🔍 INICIANDO DIAGNÓSTICO DE SUPABASE");
  
  try {
    // 1. Verificar configuración
    console.log("📋 1. VERIFICANDO CONFIGURACIÓN");
    const defaultUrl = process.env.REACT_APP_SUPABASE_URL || "";
    const defaultKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
    
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
    
    console.log("🔑 Configuración:", {
      url: url ? `${url.substring(0, 30)}...` : 'NO URL',
      hasKey: !!key,
      keyLength: key?.length || 0,
      fromLocalStorage: !!localStorage.getItem("roxy_supa")
    });
    
    if (!url || !key) {
      console.error("❌ CONFIGURACIÓN INCOMPLETA: No hay URL o KEY");
      return false;
    }
    
    // 2. Probar conexión
    console.log("🌐 2. PROBANDO CONEXIÓN");
    const { getSupabaseClient } = await import('./supabaseClient.js');
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      console.error("❌ No se pudo obtener el cliente de Supabase");
      return false;
    }
    
    console.log("✅ Cliente Supabase obtenido");
    
    // 3. Probar consulta simple
    console.log("📊 3. PROBANDO CONSULTA SIMPLE");
    try {
      const { data, error } = await supabase
        .from('products')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error("❌ Error en consulta simple:", error);
        return false;
      }
      
      console.log("✅ Consulta simple exitosa:", data);
    } catch (error) {
      console.error("❌ Error en consulta simple:", error);
      return false;
    }
    
    // 4. Probar consulta con JOIN
    console.log("🔗 4. PROBANDO CONSULTA CON JOIN");
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          categories (
            name,
            emoji,
            color
          )
        `)
        .limit(3);
      
      if (error) {
        console.error("❌ Error en consulta con JOIN:", error);
        return false;
      }
      
      console.log("✅ Consulta con JOIN exitosa:", data?.length, "productos");
    } catch (error) {
      console.error("❌ Error en consulta con JOIN:", error);
      return false;
    }
    
    // 5. Probar inserción/actualización
    console.log("💾 5. PROBANDO INSERCIÓN");
    try {
      const testProduct = {
        name: "TEST_" + Date.now(),
        description: "Producto de prueba",
        price: 99999,
        bulk_info: "Test bulk info",
        image_url: "https://example.com/test.jpg",
        active: true
      };
      
      const { data, error } = await supabase
        .from('products')
        .insert(testProduct)
        .select()
        .single();
      
      if (error) {
        console.error("❌ Error en inserción:", error);
        return false;
      }
      
      console.log("✅ Inserción exitosa:", data);
      
      // 6. Probar eliminación del producto de prueba
      console.log("🗑️ 6. ELIMINANDO PRODUCTO DE PRUEBA");
      try {
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', data.id);
        
        if (deleteError) {
          console.error("❌ Error en eliminación:", deleteError);
        } else {
          console.log("✅ Eliminación exitosa");
        }
      } catch (error) {
        console.error("❌ Error en eliminación:", error);
      }
      
    } catch (error) {
      console.error("❌ Error en prueba de inserción:", error);
      return false;
    }
    
    console.log("🎉 TODAS LAS PRUEBAS PASARON - SUPABASE FUNCIONA CORRECTAMENTE");
    return true;
    
  } catch (error) {
    console.error("❌ ERROR GENERAL EN DIAGNÓSTICO:", error);
    return false;
  }
};

// Función para verificar estado actual de productos
const checkProductsState = () => {
  console.log("📦 VERIFICANDO ESTADO DE PRODUCTOS");
  
  const localProducts = JSON.parse(localStorage.getItem("roxy_products") || "[]");
  console.log("📱 Productos en localStorage:", localProducts.length);
  
  if (localProducts.length > 0) {
    console.log("📋 Muestra de productos locales:", localProducts.slice(0, 3));
  }
  
  // Verificar si hay productos con IDs locales vs IDs de Supabase
  const localIds = localProducts.filter(p => p.id.startsWith('prod_') || p.id.startsWith('xl_'));
  const supabaseIds = localProducts.filter(p => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id));
  
  console.log("🔢 IDs locales (no sincronizados):", localIds.length);
  console.log("🔢 IDs de Supabase (sincronizados):", supabaseIds.length);
  
  return {
    total: localProducts.length,
    localIds: localIds.length,
    supabaseIds: supabaseIds.length
  };
};

// Función para forzar recarga completa desde Supabase
const forceReloadFromSupabase = async () => {
  console.log("🔄 FORZANDO RECARGA COMPLETA DESDE SUPABASE");
  
  try {
    // Limpiar todo el localStorage
    localStorage.removeItem("roxy_products");
    localStorage.removeItem("roxy_cart");
    localStorage.removeItem("roxy_price_history");
    localStorage.removeItem("roxy_restore_points");
    console.log("🧹 localStorage limpiado");
    
    // Recargar la página
    window.location.reload();
  } catch (error) {
    console.error("❌ Error forzando recarga:", error);
  }
};

// Exportar funciones para uso global
window.debugSupabase = debugSupabase;
window.checkProductsState = checkProductsState;
window.forceReloadFromSupabase = forceReloadFromSupabase;

console.log("🔧 Funciones de debug cargadas:");
console.log("- debugSupabase() - Diagnóstico completo de Supabase");
console.log("- checkProductsState() - Verificar estado de productos");
console.log("- forceReloadFromSupabase() - Forzar recarga completa");
