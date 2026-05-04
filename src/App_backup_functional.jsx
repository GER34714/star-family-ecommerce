// VERSIÓN FUNCIONAL SIMPLIFICADA - BASADA EN BACKUP DE 27/04/2026
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getSupabaseClient } from './supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════
// DATA & CONSTANTS
// ═══════════════════════════════════════════════════════

const CATS = ["Todos","Frescos","Completos","Panchos Armados","Hamburguesas","Pizzas y Empanadas","Medialunas y Chipas","Combos"];
const CAT_EMOJI = { "Frescos":"🌭","Completos":"🌭","Panchos Armados":"🌭","Hamburguesas":"🍔","Pizzas y Empanadas":"🍕","Medialunas y Chipas":"🥐","Combos":"📦" };
const CAT_COLOR = { "Frescos":"#E53E3E","Completos":"#DD6B20","Panchos Armados":"#D97706","Hamburguesas":"#7C3AED","Pizzas y Empanadas":"#2563EB","Medialunas y Chipas":"#059669","Combos":"#C41E3A","Todos":"#C41E3A" };

// ═══════════════════════════════════════════════════════
// CURRENCY FORMATTER
// ═══════════════════════════════════════════════════════

const fmt = (num) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num || 0);
};

// ═══════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════

const getStorageItem = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting localStorage item ${key}:`, error);
    return null;
  }
};

const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting localStorage item ${key}:`, error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════

export default function StarFamilyApp() {
  // FLUJO DE DATOS: Inicialización segura con valores por defecto
  const [view, setView] = useState("shop");
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState("Todos");
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState(CATS.slice(1)); // Sin "Todos"
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [qty, setQty] = useState(1);
  const [adminTab, setAdminTab] = useState("list");
  const [form, setForm] = useState({ id:"", category:"Frescos", name:"", description:"", price:"", bulkInfo:"", image_url:"", retail_price:"", show_retail_price:false, badges:[], min_boxes:1, is_banner:false, banner_title:"" });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ═══════════════════════════════════════════════════════
  // CARGA DE PRODUCTOS DESDE SUPABASE
  // ═══════════════════════════════════════════════════════
  
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      console.log("🚀 Arrancando App...");

      try {
        // Cargar productos desde Supabase
        console.log("📦 Cargando productos desde Supabase...");
        const loaded = await loadProductsFromSupabase();
        
        // Si Supabase falla o devuelve vacío, intentar backup local
        if (!loaded || loaded.length === 0) {
          const local = getStorageItem("roxy_products");
          if (local && local.length > 0) {
            setProducts(local);
            console.log("📦 Usando backup de localStorage");
          }
        }

        // Cargar el resto de los estados persistentes
        const cartData = getStorageItem("roxy_cart");
        if (cartData) setCart(cartData);
        
      } catch (err) {
        console.error("❌ Error en la inicialización:", err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const loadProductsFromSupabase = async () => {
    try {
      console.log("🔍 loadProductsFromSupabase: INICIANDO...");
      
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error("❌ No se pudo obtener el cliente de Supabase");
        throw new Error("No se pudo obtener el cliente de Supabase");
      }
      console.log("✅ Cliente Supabase obtenido correctamente");
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            name,
            emoji,
            color
          )
        `)
        .eq('active', true);

      console.log("📊 Respuesta Supabase:", { data: data?.length, error });

      if (error) {
        console.error("❌ Error de Supabase:", error);
        throw error;
      }

      if (data) {
        console.log("✅ Datos recibidos:", data.length);
        
        // Mapear para convertir bulk_info a bulkInfo y obtener categoría
        const mapped = data.map(p => ({
          ...p,
          category: p.categories?.name || "Frescos",
          bulkInfo: p.bulk_info || "",
          retail_price: p.retail_price || 0,
          show_retail_price: p.show_retail_price || false,
          badges: p.badges || [],
          min_boxes: p.min_boxes || 1,
          is_banner: p.is_banner || false,
          banner_title: p.banner_title || "",
        }));
        
        console.log("🔄 Productos mapeados:", mapped.length);
        setProducts(mapped);
        setStorageItem("roxy_products", mapped);
        return mapped;
      }
    } catch (error) {
      console.error("❌ Error cargando productos:", error.message);
      return null;
    }
  };

  // ═══════════════════════════════════════════════════════
  // GUARDADO DE PRODUCTOS
  // ═══════════════════════════════════════════════════════

  const saveProducts = async (p) => { 
    setProducts(p); 
    setStorageItem("roxy_products", p); 
  };
  
  const saveCart = async (c) => { setCart(c); setStorageItem("roxy_cart", c); };

  // ═══════════════════════════════════════════════════════
  // FUNCIONES DE PRODUCTOS
  // ═══════════════════════════════════════════════════════

  const addToCart = (product, q = 1) => {
    const ex = cart.find(i => i.id === product.id);
    if (ex) {
      const updated = cart.map(i => i.id === product.id ? { ...i, qty: i.qty + q } : i);
      saveCart(updated);
    } else {
      saveCart([...cart, { ...product, qty: q }]);
    }
    showToast("🛒 Agregado al carrito");
    setQty(1);
  };

  const removeFromCart = (id) => {
    const updated = cart.filter(i => i.id !== id);
    saveCart(updated);
    showToast("🗑️ Quitado del carrito");
  };

  const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  // ═══════════════════════════════════════════════════════
  // FILTROS
  // ═══════════════════════════════════════════════════════

  const filtered = useMemo(() => {
    let f = cat === "Todos" ? products : products.filter(p => p.category === cat);
    return f;
  }, [products, cat]);

  // ═══════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #C41E3A 0%, #8B0000 100%)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", color:"white", fontFamily:"'Poppins',sans-serif" }}>
        <div style={{ fontSize:24, marginBottom:16 }}>⏳ Cargando Star Family...</div>
        <div style={{ fontSize:14, opacity:0.8 }}>Obteniendo productos desde Supabase</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #C41E3A 0%, #8B0000 100%)", fontFamily:"'Poppins',sans-serif", color:"white" }}>
      
      {/* HEADER */}
      <header style={{ background:"rgba(0,0,0,0.2)", padding:"16px 20px", backdropFilter:"blur(10px)" }}>
        <div style={{ maxWidth:"1200px", margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, background:"white", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:"bold", color:"#C41E3A" }}>
              🌭
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:700 }}>Star Family</div>
              <div style={{ fontSize:12, opacity:0.8 }}>Mayorista Premium</div>
            </div>
          </div>
          
          <button 
            onClick={() => setCartOpen(true)}
            style={{ background:"white", color:"#C41E3A", border:"none", borderRadius:12, padding:"12px 20px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}
          >
            🛒 Carrito ({cart.length})
          </button>
        </div>
      </header>

      {/* CATEGORIAS */}
      <div style={{ padding:"20px", maxWidth:"1200px", margin:"0 auto" }}>
        <div style={{ display:"flex", gap:12, overflowX:"auto", marginBottom:32 }}>
          {["Todos", ...categories].map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                padding:"12px 20px",
                border:"none",
                borderRadius:20,
                fontWeight:600,
                cursor:"pointer",
                background: cat === c ? "white" : "rgba(255,255,255,0.1)",
                color: cat === c ? "#C41E3A" : "white",
                whiteSpace:"nowrap",
                transition:"all 0.3s ease"
              }}
            >
              {CAT_EMOJI[c] || "📦"} {c}
            </button>
          ))}
        </div>

        {/* PRODUCTOS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:24 }}>
          {filtered.map(product => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ 
                background:"rgba(255,255,255,0.1)", 
                borderRadius:16, 
                overflow:"hidden",
                backdropFilter:"blur(10px)",
                border:"1px solid rgba(255,255,255,0.2)"
              }}
            >
              <div style={{ height:160, background:"rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  CAT_EMOJI[product.category] || "📦"
                )}
              </div>
              
              <div style={{ padding:20 }}>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{product.name}</div>
                <div style={{ fontSize:12, opacity:0.8, marginBottom:12 }}>{product.description}</div>
                
                <div style={{ fontSize:20, fontWeight:900, color:"#F5A623", marginBottom:16 }}>
                  {fmt(product.price || 0)}
                </div>
                
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ 
                      width:60, 
                      padding:"8px", 
                      borderRadius:8, 
                      border:"1px solid rgba(255,255,255,0.3)", 
                      background:"rgba(255,255,255,0.1)", 
                      color:"white",
                      textAlign:"center"
                    }}
                  />
                  <button
                    onClick={() => addToCart(product, qty)}
                    style={{ 
                      flex:1, 
                      background:"white", 
                      color:"#C41E3A", 
                      border:"none", 
                      borderRadius:8, 
                      padding:"10px", 
                      fontWeight:600, 
                      cursor:"pointer" 
                    }}
                  >
                    🛒 Agregar
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:60, opacity:0.6 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📦</div>
            <div style={{ fontSize:18 }}>No hay productos en esta categoría</div>
          </div>
        )}
      </div>

      {/* CARRITO */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            style={{ 
              position:"fixed", 
              top:0, 
              right:0, 
              width:400, 
              height:"100vh", 
              background:"white", 
              color:"#333", 
              zIndex:1000,
              boxShadow:"-4px 0 20px rgba(0,0,0,0.2)"
            }}
          >
            <div style={{ padding:20, borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:18, fontWeight:700 }}>🛒 Carrito</div>
              <button onClick={() => setCartOpen(false)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            
            <div style={{ padding:20, flex:1, overflowY:"auto" }}>
              {cart.map(item => (
                <div key={item.id} style={{ display:"flex", gap:12, marginBottom:16, paddingBottom:16, borderBottom:"1px solid #F3F4F6" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{item.name}</div>
                    <div style={{ fontSize:12, color:"#6B7280" }}>{item.qty} × {fmt(item.price)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:800, color:"#C41E3A", fontSize:15 }}>{fmt(item.price * item.qty)}</div>
                    <button onClick={() => removeFromCart(item.id)} style={{ background:"none", border:"none", color:"#9CA3AF", cursor:"pointer", fontSize:11 }}>✕ quitar</button>
                  </div>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div style={{ textAlign:"center", padding:40, opacity:0.6 }}>
                  <div style={{ fontSize:32 }}>🛒</div>
                  <div>El carrito está vacío</div>
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div style={{ padding:20, borderTop:"1px solid #E5E7EB" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                  <span style={{ fontWeight:700 }}>Total</span>
                  <span style={{ fontWeight:900, fontSize:20, color:"#10B981" }}>{fmt(total)}</span>
                </div>
                <button style={{ width:"100%", background:"#25D366", color:"white", border:"none", borderRadius:12, padding:14, fontSize:15, fontWeight:700, cursor:"pointer" }}>
                  📱 Enviar por WhatsApp
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position:"fixed",
              bottom:20,
              left:20,
              right:20,
              maxWidth:400,
              margin:"0 auto",
              padding:16,
              borderRadius:12,
              fontWeight:600,
              zIndex:2000,
              background: toast.type === "error" ? "#DC2626" : toast.type === "warning" ? "#F59E0B" : "#10B981",
              color:"white",
              textAlign:"center"
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
