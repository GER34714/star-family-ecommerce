import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════
// DATA & CONSTANTS
// ═══════════════════════════════════════════════════════

const CATS = ["Todos","Frescos","Completos","Panchos Armados","Hamburguesas","Pizzas y Empanadas","Medialunas y Chipas","Combos"];
const CAT_EMOJI = { "Frescos":"🌭","Completos":"🌭","Panchos Armados":"🌭","Hamburguesas":"🍔","Pizzas y Empanadas":"🍕","Medialunas y Chipas":"🥐","Combos":"📦" };
const CAT_COLOR = { "Frescos":"#E53E3E","Completos":"#DD6B20","Panchos Armados":"#D97706","Hamburguesas":"#7C3AED","Pizzas y Empanadas":"#2563EB","Medialunas y Chipas":"#059669","Combos":"#C41E3A","Todos":"#C41E3A" };

const SEED_PRODUCTS = [
  // FRESCOS
  { id:"f1", category:"Frescos", name:"Salchichas Cortas x6", description:"Salchichas cocidas y ahumadas sin piel. La clásica de siempre.", price:19725, bulkInfo:"Bulto x 24 paquetes", image:"" },
  { id:"f2", category:"Frescos", name:"Salchichas Largas x6", description:"Salchichas largas cocidas y ahumadas sin piel.", price:19050, bulkInfo:"Bulto x 12 paquetes", image:"" },
  { id:"f3", category:"Frescos", name:"Salchichas Largas x18", description:"Salchichas largas cocidas y ahumadas sin piel.", price:19050, bulkInfo:"Bulto x 4 paquetes", image:"" },
  { id:"f4", category:"Frescos", name:"Salchichita 500g", description:"Salchichitas ideales para kioscos y eventos.", price:3437, bulkInfo:"Bulto x 6 paquetes de 500gr", image:"" },
  { id:"f5", category:"Frescos", name:"Premium Alemana x12", description:"Línea premium tipo alemana. Sabor superior.", price:35000, bulkInfo:"Bulto x 4 paquetes", image:"" },
  // COMPLETOS
  { id:"c1", category:"Completos", name:"Completo Cortas", description:"Kit completo con pan incluido. Listo para vender.", price:19725, bulkInfo:"144 Salchichas + 144 Panes", image:"" },
  { id:"c2", category:"Completos", name:"Completo Largas (x18)", description:"Salchichas largas con pan. Ideal para eventos y locales.", price:34800, bulkInfo:"72 Salchichas + 72 Panes", image:"" },
  { id:"c3", category:"Completos", name:"Completo Largas (x6)", description:"Formato alternativo con salchichas largas y pan.", price:34800, bulkInfo:"72 Salchichas (12paq x6) + 72 Panes", image:"" },
  // PANCHOS ARMADOS
  { id:"p1", category:"Panchos Armados", name:"30 Panchos Cortos", description:"Kit completo listo para armar. Panes + salchichas + aderezo.", price:11700, bulkInfo:"30 Panes + 30 Salchichas + 1 Aderezo", image:"" },
  { id:"p2", category:"Panchos Armados", name:"60 Panchos Cortos", description:"Kit completo listo para armar. Panes + salchichas + aderezo.", price:22200, bulkInfo:"60 Panes + 60 Salchichas + 1 Aderezo", image:"" },
  { id:"p3", category:"Panchos Armados", name:"36 Panchos Largos", description:"Kit completo listo para armar. Panes + salchichas + aderezo.", price:21600, bulkInfo:"36 Panes + 36 Salchichas + 1 Aderezo", image:"" },
  { id:"p4", category:"Panchos Armados", name:"72 Panchos Largos", description:"Kit completo listo para armar. Panes + salchichas + aderezo.", price:42000, bulkInfo:"72 Panes + 72 Salchichas + 1 Aderezo", image:"" },
  // HAMBURGUESAS
  { id:"h1", category:"Hamburguesas", name:"24 Hamburguesas Clásicas 69g", description:"24 panes + 24 medallones de carne + 1 aderezo.", price:22900, bulkInfo:"24 Panes + 24 Medallones + 1 Aderezo", image:"" },
  { id:"h2", category:"Hamburguesas", name:"60 Hamburguesas Clásicas 69g", description:"60 panes + 60 medallones de carne + 1 aderezo.", price:55400, bulkInfo:"60 Panes + 60 Medallones + 1 Aderezo", image:"" },
  { id:"h3", category:"Hamburguesas", name:"20 Hamburguesas Gigantes 110g", description:"20 panes + 20 medallones gigantes + 1 aderezo.", price:26800, bulkInfo:"20 Panes + 20 Medallones + 1 Aderezo", image:"" },
  { id:"h4", category:"Hamburguesas", name:"40 Hamburguesas Gigantes 110g", description:"40 panes + 40 medallones gigantes + 1 aderezo.", price:52400, bulkInfo:"40 Panes + 40 Medallones + 1 Aderezo", image:"" },
  // PIZZAS Y EMPANADAS
  { id:"pe1", category:"Pizzas y Empanadas", name:"Pizzas Mozzarella x11", description:"Pizza congelada con salsa de tomate y mozzarella. Lista para hornear.", price:48125, bulkInfo:"Caja x 11 unidades · $4.375 c/u", image:"" },
  { id:"pe2", category:"Pizzas y Empanadas", name:"Empanadas Premium x42", description:"Carne, pollo, jamón y queso, y verduras. Premium.", price:36540, bulkInfo:"Caja x 42 unidades · $870 c/u", image:"" },
  // MEDIALUNAS Y CHIPAS
  { id:"m1", category:"Medialunas y Chipas", name:"Chipa x4.5kg", description:"Chipas artesanales premium.", price:46875, bulkInfo:"Caja x 4.5 kg", image:"" },
  { id:"m2", category:"Medialunas y Chipas", name:"Medialunas Crudas x96", description:"Medialunas de manteca premium 55g c/u.", price:40800, bulkInfo:"Caja x 96 unidades (55g c/u)", image:"" },
  // COMBOS
  { id:"k1", category:"Combos", name:"Combo Pancho Largo", description:"1 salchicha larga + 1 pan + aderezos. El más vendido.", price:3200, bulkInfo:"Caja x 12 combos de 6 (72 panchos)", image:"" },
  { id:"k2", category:"Combos", name:"Combo Hamburguesa 69g", description:"1 medallón clásico + 1 pan + aderezos.", price:3500, bulkInfo:"Caja x 15 combos de 4", image:"" },
  { id:"k3", category:"Combos", name:"Combo Hamburguesa 110g", description:"1 medallón gigante + 1 pan + aderezos.", price:4950, bulkInfo:"Caja x 10 combos de 4", image:"" },
];

const fmt = (p) => `$${Number(p).toLocaleString("es-AR")}`;

// ═══════════════════════════════════════════════════════
// SUPABASE CONFIGURATION
// ═══════════════════════════════════════════════════════

const getSupabaseClient = () => {
  const url = process.env.REACT_APP_SUPABASE_URL || localStorage.getItem('supa_url') || '';
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY || localStorage.getItem('supa_key') || '';
  
  console.log('Configuración Supabase:', { url, key: key ? '***CONFIGURADO***' : 'NO CONFIGURADO' });
  
  if (!url || !key) return null;
  
  return createClient(url, key);
};

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════

export default function StarFamilyApp() {
  // FLUJO DE DATOS: Inicialización segura con valores por defecto
  const [view, setView] = useState("shop");
  const [products, setProducts] = useState((SEED_PRODUCTS && Array.isArray(SEED_PRODUCTS)) ? SEED_PRODUCTS : []);
  const [cat, setCat] = useState("Todos");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [qty, setQty] = useState(1);
  const [adminTab, setAdminTab] = useState("list");
  const [form, setForm] = useState({ id:"", category:"Frescos", name:"", description:"", price:"", bulkInfo:"", image:"" });
  const [editing, setEditing] = useState(false);
  const [supaUrl, setSupaUrl] = useState("");
  const [supaKey, setSupaKey] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();
  const [hideFloatingButtons, setHideFloatingButtons] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Jerarquía de roles con inicialización segura
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Verificar rol del usuario
  const isSuperAdmin = user?.email === "ciborg347@gmail.com";
  const isAdmin = user?.email === "starfamily347@gmail.com";
  const hasAdminAccess = isSuperAdmin || isAdmin;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Efecto para manejar la visibilidad de botones flotantes
  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector('footer');
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // Ocultar botones cuando el footer es visible
        setHideFloatingButtons(footerRect.top < windowHeight);
      }
    };

    // Ocultar botones cuando se abre el carrito o modal
    if (cartOpen || modal) {
      setHideFloatingButtons(true);
    } else {
      setHideFloatingButtons(false);
      handleScroll(); // Verificar posición del footer
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [cartOpen, modal]);

  // Funciones para manejo de imágenes
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        showToast('⚠️ Por favor selecciona un archivo de imagen', 'error');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('⚠️ La imagen no debe superar los 5MB', 'error');
        return;
      }
      
      setSelectedFile(file);
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToSupabase = async (file) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      showToast('⚠️ Configuración de Supabase requerida', 'error');
      return null;
    }

    try {
      setUploadingImage(true);
      
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `product-images/${fileName}`;
      
      // Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      showToast('✅ Imagen subida exitosamente', 'success');
      return publicUrl;
      
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      showToast('❌ Error al subir la imagen: ' + error.message, 'error');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImagePreview = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setForm(prev => ({...prev, image: ''})); // Limpiar URL del formulario también
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  // Funciones de autenticación
  const handleLogin = async () => {
    if (!email || !password) return showToast("⚠️ Email y contraseña son requeridos", "error");
    
    setAuthLoading(true);
    try {
      // Autenticación simple basada en email para demostración
      if (email === "ciborg347@gmail.com" && password === "superadmin123") {
        setUser({ email: "ciborg347@gmail.com", role: "SuperAdmin" });
        showToast("✅ SuperAdmin autenticado", "success");
      } else if (email === "starfamily347@gmail.com" && password === "admin123") {
        setUser({ email: "starfamily347@gmail.com", role: "Admin" });
        showToast("✅ Admin autenticado", "success");
      } else {
        showToast("❌ Credenciales incorrectas", "error");
      }
    } catch (error) {
      showToast("❌ Error en autenticación", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setEmail("");
    setPassword("");
    showToast("👋 Sesión cerrada", "success");
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const r = await window.storage.get("roxy_products"); if (r?.value) setProducts(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get("roxy_cart"); if (r?.value) setCart(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get("roxy_supa"); if (r?.value) { const d = JSON.parse(r.value); setSupaUrl(d.url||""); setSupaKey(d.key||""); } } catch {}
      finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveProducts = async (p) => { setProducts(p); try { await window.storage.set("roxy_products", JSON.stringify(p)); } catch {} };
  const saveCart = async (c) => { setCart(c); try { await window.storage.set("roxy_cart", JSON.stringify(c)); } catch {} };

  const addToCart = (product, q = 1) => {
    const ex = cart.find(i => i.id === product.id);
    saveCart(ex ? cart.map(i => i.id === product.id ? {...i, qty: i.qty + q} : i) : [...cart, {...product, qty: q}]);
    setModal(null);
    showToast(`✅ ${product.name} agregado al carrito`);
  };
  const removeFromCart = (id) => saveCart(cart.filter(i => i.id !== id));
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = cat === "Todos" ? (products || []) : (products || [])?.filter(p => p && typeof p === 'object' && p?.category && p?.category === cat);

  const syncSupabase = async () => {
    // Variables de entorno por defecto para producción
    const defaultUrl = process.env.REACT_APP_SUPABASE_URL || "";
    const defaultKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
    
    const url = supaUrl || defaultUrl;
    const key = supaKey || defaultKey;
    
    if (!url || !key) {
      console.log("Variables de entorno Supabase:", { url, key, defaultUrl, defaultKey });
      return showToast("⚠️ Configuración de Supabase requerida", "error");
    }
    
    setSyncing(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true);
      
      if (error) throw error;
      
      const mapped = (data || []).map(r => ({
        id: r.id || `prod_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        category: r.category || "Frescos",
        name: r.name || "Producto sin nombre",
        description: r.description || "",
        price: Number(r.price) || 0,
        bulkInfo: r.bulto || r.bulk_info || "",
        image: r.imagen || r.image_url || ""
      })).filter(r => r.name);
        
      if (mapped.length > 0) {
        saveProducts(mapped);
        showToast(`✅ ${mapped.length} productos cargados desde Supabase`);
      } else {
        showToast("⚠️ No se encontraron productos válidos en Supabase", "warning");
      }
    } catch(e) {
      console.error("Error en syncSupabase:", e);
      showToast("❌ Error al conectar con Supabase: " + e.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  const migrateProductsToSupabase = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      showToast('⚠️ Configuración de Supabase requerida', 'error');
      return;
    }

    try {
      setSyncing(true);
      showToast('🔄 Migrando productos a Supabase...');
      
      // Preparar productos para migrar
      const productsToMigrate = products.map(p => ({
        id: p.id,
        category: p.category,
        name: p.name,
        description: p.description || '',
        price: p.price,
        bulk_info: p.bulkInfo || '',
        image_url: p.image || '',
        active: true
      }));
      
      // Insertar en batches de 10 para evitar límites
      const batchSize = 10;
      for (let i = 0; i < productsToMigrate.length; i += batchSize) {
        const batch = productsToMigrate.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('products')
          .upsert(batch, {
            onConflict: 'id',
            ignoreDuplicates: false
          });
          
        if (error) {
          console.error(`Error en batch ${i/batchSize + 1}:`, error);
          throw error;
        }
      }
      
      showToast(`✅ ${productsToMigrate.length} productos migrados a Supabase`, 'success');
      
    } catch (error) {
      console.error('Error migrando productos:', error);
      showToast('❌ Error al migrar productos: ' + error.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        const imported = rows.map((r, i) => ({
          id: `xl_${Date.now()}_${i}`,
          category: r.categoria || r.category || "Frescos",
          name: r.nombre || r.name || "",
          description: r.descripcion || r.description || "",
          price: parseFloat(r.precio || r.price || 0),
          bulkInfo: r.bulto || r.bulk_info || "",
          image: r.imagen || r.image_url || ""
        })).filter(r => r.name);
        if (imported.length) { saveProducts([...products, ...imported]); showToast(`✅ ${imported.length} productos importados`); }
        else showToast("⚠️ No se encontraron productos", "error");
      } catch (err) { showToast("❌ Error al leer Excel: " + err.message, "error"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim() || !form.price) return showToast("⚠️ Nombre y precio son requeridos", "error");
    
    let imageUrl = form.image;
    
    // Si hay una imagen seleccionada, subirla a Supabase
    if (selectedFile) {
      const uploadedUrl = await uploadImageToSupabase(selectedFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        // Si falla la subida, continuar con la URL existente o vacía
        showToast("⚠️ Continuando sin subir la imagen", "warning");
      }
    }
    
    const p = { ...form, image: imageUrl, id: editing ? form.id : `prod_${Date.now()}`, price: parseFloat(form.price) };
    saveProducts(editing ? products.map(x => x.id === p.id ? p : x) : [...products, p]);
    
    // Limpiar estado de imagen
    clearImagePreview();
    setForm({ id:"", category:"Frescos", name:"", description:"", price:"", bulkInfo:"", image:"" });
    setEditing(false);
    setAdminTab("list");
    showToast(editing ? "✏️ Producto actualizado" : "➕ Producto agregado");
  };

  const startEdit = (p) => { 
    setForm({...p, price: p.price.toString()}); 
    setEditing(true); 
    setAdminTab("add");
    // Si el producto tiene una imagen, mostrarla como vista previa
    if (p.image) {
      setImagePreview(p.image);
    } else {
      setImagePreview(null);
    }
    // Limpiar solo el archivo seleccionado, no la vista previa
    setSelectedFile(null);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };
  const deleteProduct = (id) => { saveProducts(products.filter(p => p.id !== id)); showToast("🗑️ Producto eliminado"); };

  // Error Boundary y loading state
  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#F4F4F5", fontFamily:"'Poppins', sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:20 }}>🔄</div>
          <div style={{ fontSize:18, color:"#6B7280", fontWeight:500 }}>Cargando...</div>
        </div>
      </div>
    );
  }

  // Fallback si products es undefined o está vacío
  if (!products || !Array.isArray(products) || products.length === 0) {
    return (
      <div style={{ minHeight:"100vh", background:"#F4F4F5", fontFamily:"'Poppins', sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:20 }}>�</div>
          <div style={{ fontSize:18, color:"#6B7280", fontWeight:500 }}>No hay productos disponibles</div>
          <div style={{ fontSize:14, color:"#9CA3AF", marginTop:8 }}>Por favor, recarga la página o contacta al administrador</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F4F4F5", fontFamily:"'Poppins', sans-serif", position:"relative", maxWidth:"100%", overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", top:80, left:"50%", transform:"translateX(-50%)", zIndex:9999, background: toast.type==="error"?"#FEE2E2":"#DCFCE7", color: toast.type==="error"?"#991B1B":"#166534", padding:"10px 20px", borderRadius:12, fontWeight:600, fontSize:14, boxShadow:"0 4px 12px rgba(0,0,0,0.15)", whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <header style={{ background:"#111111", position:"sticky", top:0, zIndex:500, boxShadow:"0 2px 16px rgba(0,0,0,0.4)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 16px", height:62, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => { setView("shop"); setCat("Todos"); }}>
            <div style={{ borderRadius:"50%", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", border:"2.5px solid #F5A623", flexShrink:0, overflow:"hidden" }}>
              <img src="https://iili.io/B6XgSSI.jpg" alt="Star Family Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
            <div>
              <div style={{ color:"white", fontWeight:900, fontSize:18, letterSpacing:3, lineHeight:1, fontFamily:"'Bebas Neue', sans-serif" }}>STAR FAMILY</div>
              <div style={{ color:"#F5A623", fontSize:8, letterSpacing:4, fontWeight:700 }}>CALIDAD Y CONFIANZA</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={() => setView(view==="admin"?"shop":"admin")} className="btn-ghost" style={{ fontSize:12, padding:"7px 13px" }}>
              {view==="admin" ? "🛒 Tienda" : "⚙️ Admin"}
            </button>
            <button onClick={() => setCartOpen(true)} className="btn-red" style={{ position:"relative", display:"flex", alignItems:"center", gap:6, padding:"8px 16px" }}>
              🛒
              {cartCount > 0 && <span style={{ background:"#F5A623", color:"#111", borderRadius:"50%", width:20, height:20, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {view === "shop" ? (
        <>
          {/* HERO */}
          <div style={{ background:"linear-gradient(135deg,#9B1B2A 0%,#C41E3A 45%,#8B0000 100%)", padding:"28px 16px 32px" }}>
            <div style={{ maxWidth:600, margin:"0 auto", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"white", fontSize:36, letterSpacing:4, lineHeight:1 }}>CATÁLOGO MAYORISTA</div>
              <div style={{ color:"#FBD38D", fontSize:13, marginTop:6, fontWeight:500 }}>Precios por bulto · Distribución directa a comercios</div>
              <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:14, flexWrap:"wrap" }}>
                {["📍 Pilar & Escobar","🕙 10 a 21hs","📞 11 2495-3641"].map(t => (
                  <span key={t} style={{ background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)", color:"white", borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:500 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* CATEGORY BAR */}
          <div style={{ background:"white", borderBottom:"1px solid #E5E7EB", position:"sticky", top:62, zIndex:100 }}>
            <div className="cat-scroll">
              {CATS.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ background: cat===c ? CAT_COLOR[c]||"#C41E3A" : "transparent", color: cat===c ? "white" : "#555", border: cat===c ? "none" : "1.5px solid #E5E7EB", borderRadius:20, padding:"7px 16px", cursor:"pointer", fontSize:13, fontWeight:600, whiteSpace:"nowrap", flexShrink:0, fontFamily:"'Poppins',sans-serif", transition:"all 0.18s" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCT GRID */}
          <div style={{ maxWidth:1200, margin:"0 auto", padding:"20px 12px 48px" }}>
            {CATS.filter(c => c !== "Todos").map(c => {
              const prods = (filtered || [])?.filter(p => p && typeof p === 'object' && p?.category && p?.category === c);
              if ((cat !== "Todos" && cat !== c) || prods.length === 0) return null;
              return (
                <div key={c} style={{ marginBottom:32 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingLeft:4 }}>
                    <div style={{ background:CAT_COLOR[c], width:4, height:26, borderRadius:2 }} />
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"#111" }}>{c.toUpperCase()}</span>
                    <span style={{ background:"#F4F4F5", color:"#888", fontSize:11, borderRadius:12, padding:"2px 10px", fontWeight:600 }}>{prods.length}</span>
                  </div>
                  <div className="product-grid">
                    {prods?.filter(p => p && typeof p === 'object' && p.id).map((product) => (
                    <ProductCard key={product.id} p={product} onOpen={() => { setModal(product); setQty(1); }} onAdd={() => addToCart(product, 1)} />
                  ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>
                <div style={{ fontSize:56 }}>📦</div>
                <div style={{ fontSize:18, fontWeight:700, marginTop:12 }}>Sin productos en esta categoría</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <AdminPanel 
            products={products} 
            form={form} 
            setForm={setForm} 
            editing={editing} 
            setEditing={setEditing} 
            adminTab={adminTab} 
            setAdminTab={setAdminTab} 
            onSubmit={handleFormSubmit} 
            onEdit={startEdit} 
            onDelete={deleteProduct} 
            onExcel={handleExcel} 
            fileRef={fileRef}
            supaUrl={supaUrl} supaKey={supaKey}
            setSupaUrl={setSupaUrl} setSupaKey={setSupaKey}
            onSync={syncSupabase} syncing={syncing}
            onSaveSupa={async () => {
              try { await window.storage.set("roxy_supa", JSON.stringify({ url:supaUrl, key:supaKey })); showToast("✅ Configuración guardada"); } catch {}
            }}
            onReset={() => { saveProducts(SEED_PRODUCTS); showToast("✅ Productos restaurados"); }}
            onImageSelect={handleImageSelect}
            onClearImage={clearImagePreview}
            imagePreview={imagePreview}
            uploadingImage={uploadingImage}
            onMigrate={migrateProductsToSupabase}
          />
      )}

      {/* FOOTER */}
      <footer style={{ background:"#111111", color:"white", padding:"40px 16px 20px", marginTop:"auto" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))", gap:"40px" }}>
          {/* Logo y marca */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ borderRadius:"50%", width:50, height:50, display:"flex", alignItems:"center", justifyContent:"center", border:"2.5px solid #F5A623", overflow:"hidden" }}>
                <img src="https://iili.io/B6XgSSI.jpg" alt="Star Family Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div>
                <div style={{ color:"white", fontWeight:900, fontSize:20, letterSpacing:2, lineHeight:1, fontFamily:"'Bebas Neue', sans-serif" }}>STAR FAMILY</div>
                <div style={{ color:"#F5A623", fontSize:10, letterSpacing:3, fontWeight:700 }}>CALIDAD Y CONFIANZA</div>
              </div>
            </div>
            <div style={{ color:"#9CA3AF", fontSize:14, lineHeight:1.6 }}>
              Mayorista de productos de alta calidad para comercios y eventos.
            </div>
          </div>

          {/* Navegación */}
          <div>
            <h3 style={{ color:"white", fontSize:16, fontWeight:700, marginBottom:16, fontFamily:"'Poppins', sans-serif" }}>Navegación</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {CATS.map(c => (
                <button
                  key={c}
                  onClick={() => { setView("shop"); setCat(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background:"none", border:"none", color:"#9CA3AF", textAlign:"left", cursor:"pointer", fontSize:14, fontFamily:"'Poppins', sans-serif", transition:"color 0.2s", padding:0 }}
                  onMouseOver={(e) => e.target.style.color = "#F5A623"}
                  onMouseOut={(e) => e.target.style.color = "#9CA3AF"}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Redes sociales */}
          <div>
            <h3 style={{ color:"white", fontSize:16, fontWeight:700, marginBottom:16, fontFamily:"'Poppins', sans-serif" }}>Síguenos</h3>
            <a
              href="https://www.instagram.com/starfamily.oficial/?hl=es"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:8, color:"white", textDecoration:"none", transition:"transform 0.2s" }}
              onMouseOver={(e) => e.target.style.transform = "translateX(5px)"}
              onMouseOut={(e) => e.target.style.transform = "translateX(0)"}
            >
              <div style={{ width:44, height:44, background:"linear-gradient(45deg, #E4405F, #C13584)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                </svg>
              </div>
              <span style={{ fontSize:14, fontWeight:600, fontFamily:"'Poppins', sans-serif" }}>@starfamily.oficial</span>
            </a>
          </div>

          {/* Contacto */}
          <div>
            <h3 style={{ color:"white", fontSize:16, fontWeight:700, marginBottom:16, fontFamily:"'Poppins', sans-serif" }}>Contacto</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10, color:"#9CA3AF", fontSize:14, fontFamily:"'Poppins', sans-serif" }}>
              <a
                href="https://maps.google.com/?q=Las+Piedras+2864+Villa+Astolfi+Pilar"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:8, color:"#9CA3AF", textDecoration:"none", transition:"color 0.2s" }}
                onMouseOver={(e) => e.target.style.color = "#F5A623"}
                onMouseOut={(e) => e.target.style.color = "#9CA3AF"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <div>
                  <div style={{ fontWeight:600 }}>Sucursal Pilar</div>
                  <div style={{ fontSize:12 }}>Las Piedras 2864, Villa Astolfi</div>
                </div>
              </a>
              <a
                href="https://maps.google.com/?q=Av+Juan+Beliera+96+Maquinista+Savio+Escobar"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:8, color:"#9CA3AF", textDecoration:"none", transition:"color 0.2s" }}
                onMouseOver={(e) => e.target.style.color = "#F5A623"}
                onMouseOut={(e) => e.target.style.color = "#9CA3AF"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <div>
                  <div style={{ fontWeight:600 }}>Sucursal Escobar</div>
                  <div style={{ fontSize:12 }}>Av. Juan Beliera 96, Maquinista Savio</div>
                </div>
              </a>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                <div>🕙 10 a 21hs</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <a
                  href="tel:+5491124953641"
                  onClick={(e) => {
                    // Detectar si es desktop y copiar al portapapeles
                    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                      e.preventDefault();
                      navigator.clipboard.writeText('11 2495-3641').then(() => {
                        showToast('📞 Número copiado al portapapeles', 'success');
                      }).catch(() => {
                        // Fallback si clipboard no funciona
                        const textArea = document.createElement('textarea');
                        textArea.value = '11 2495-3641';
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        showToast('📞 Número copiado al portapapeles', 'success');
                      });
                    }
                  }}
                  style={{ color:"#9CA3AF", textDecoration:"none", transition:"color 0.2s", cursor:"pointer" }}
                  onMouseOver={(e) => e.target.style.color = "#F5A623"}
                  onMouseOut={(e) => e.target.style.color = "#9CA3AF"}
                  title={/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "Llamar" : "Copiar número"}
                >
                  📞 11 2495-3641
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Créditos y copyright */}
        <div style={{ maxWidth:1200, margin:"40px auto 0", paddingTop:20, borderTop:"1px solid #374151", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <div style={{ color:"#9CA3AF", fontSize:13, fontFamily:"'Poppins', sans-serif" }}>
            Creado y diseñado por <a 
              href="https://ciborg347oficial.onrender.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color:"#F5A623", textDecoration:"none", fontWeight:600 }}
              onMouseOver={(e) => e.target.style.textDecoration = "underline"}
              onMouseOut={(e) => e.target.style.textDecoration = "none"}
            >
              ciborg347
            </a>
          </div>
          <div style={{ color:"#6B7280", fontSize:12, fontFamily:"'Poppins', sans-serif" }}>
            © {new Date().getFullYear()} STAR FAMILY. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* BOTONES FLOTANTES */}
      {!hideFloatingButtons && (
        <div style={{ position:"fixed", bottom:20, right:20, display:"flex", flexDirection:"column", gap:12, zIndex:350 }}>
          <a
            href="https://www.instagram.com/starfamily.oficial/?hl=es"
            target="_blank"
            rel="noopener noreferrer"
            style={{ width:56, height:56, background:"linear-gradient(45deg, #E4405F, #C13584)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"white", textDecoration:"none", boxShadow:"0 4px 12px rgba(228, 64, 95, 0.4)", transition:"transform 0.2s, box-shadow 0.2s" }}
            onMouseOver={(e) => { e.target.style.transform = "scale(1.1)"; e.target.style.boxShadow = "0 6px 16px rgba(228, 64, 95, 0.5)"; }}
            onMouseOut={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 4px 12px rgba(228, 64, 95, 0.4)"; }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
            </svg>
          </a>
          <a
            href="https://wa.me/5491124953641"
            target="_blank"
            rel="noopener noreferrer"
            style={{ width:56, height:56, background:"#25D366", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"white", textDecoration:"none", boxShadow:"0 4px 12px rgba(37, 211, 102, 0.4)", transition:"transform 0.2s, box-shadow 0.2s" }}
            onMouseOver={(e) => { e.target.style.transform = "scale(1.1)"; e.target.style.boxShadow = "0 6px 16px rgba(37, 211, 102, 0.5)"; }}
            onMouseOut={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 4px 12px rgba(37, 211, 102, 0.4)"; }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </a>
        </div>
      )}

      {/* CART OVERLAY */}
      <div className={`overlay ${cartOpen?"show":""}`} onClick={() => setCartOpen(false)} />
      <div className={`cart-drawer ${cartOpen?"open":""}`}>
        <CartDrawer cart={cart} onRemove={removeFromCart} onClose={() => setCartOpen(false)} total={cartTotal} onClear={() => saveCart([])} />
      </div>

      {/* PRODUCT MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <ProductModal p={modal} qty={qty} setQty={setQty} onAdd={() => addToCart(modal, qty)} onClose={() => setModal(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PRODUCT CARD
// ═══════════════════════════════════════════════════════

function ProductCard({ p, onOpen, onAdd }) {
  // PARCHE DE SEGURIDAD TOTAL: Guarda inmediata
  if (!p) { 
    console.error("Se intentó renderizar un ProductCard sin datos"); 
    return null; 
  }
  
  // PARCHE DE SEGURIDAD TOTAL: Desestructuración con valores por defecto
  const { 
    category = 'Sin categoría', 
    name = 'Producto sin nombre', 
    price = 0, 
    image = '', 
    bulkInfo = '',
    description = ''
  } = p || {};
  
  // PARCHE DE SEGURIDAD TOTAL: Log de depuración
  console.log('Renderizando producto:', p?.id || 'ID NULO');
  
  const color = CAT_COLOR[category] || "#C41E3A";
  const emoji = CAT_EMOJI[category] || "🍖";
  
  return (
    <div className="product-card" onClick={onOpen}>
      {/* Image */}
      <div style={{ position:"relative", aspectRatio:"4/3", overflow:"hidden", background:`linear-gradient(135deg,${color}22,${color}44)` }}>
        {image
          ? <img src={image} alt={name || "Producto"} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.3s" }} onError={e => { e.target.style.display="none"; }} />
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:42 }}>{emoji}</div>
        }
        <div style={{ position:"absolute", top:8, left:8, background:color, color:"white", fontSize:9, fontWeight:800, borderRadius:6, padding:"3px 8px", letterSpacing:0.5 }}>{category?.toUpperCase() || ""}</div>
      </div>
      {/* Info */}
      <div style={{ padding:"10px 11px 12px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#111", lineHeight:1.3, marginBottom:3, minHeight:34, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{name || "Sin nombre"}</div>
        {bulkInfo && <div style={{ fontSize:10, color:"#9CA3AF", marginBottom:8, lineHeight:1.4, minHeight:24 }}>{bulkInfo}</div>}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:900, fontSize:17, color:"#C41E3A" }}>{fmt(price || 0)}</div>
          <button onClick={e => { e.stopPropagation(); onAdd(); }} className="btn-add-cart">+</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PRODUCT MODAL
// ═══════════════════════════════════════════════════════

function ProductModal({ p, qty, setQty, onAdd, onClose }) {
  // BLINDAJE: Validación inmediata
  if (!p) return null;
  
  const color = CAT_COLOR[p?.category] || "#C41E3A";
  const emoji = CAT_EMOJI[p?.category] || "🍖";
  return (
    <div>
      <div style={{ position:"relative", height:200, background:`linear-gradient(135deg,${color},${color}99)`, borderRadius:"14px 14px 0 0", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {p?.image
          ? <img src={p?.image} alt={p?.name || "Producto"} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => e.target.style.display="none"} />
          : <span style={{ fontSize:72 }}>{emoji}</span>
        }
        <button onClick={onClose} style={{ position:"absolute", top:12, right:12, background:"rgba(0,0,0,0.4)", color:"white", border:"none", borderRadius:8, width:36, height:36, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      </div>
      <div style={{ padding:"20px 22px 24px" }}>
        <div style={{ background:`${color}18`, color, fontSize:11, fontWeight:800, borderRadius:6, padding:"3px 10px", display:"inline-block", marginBottom:8, letterSpacing:0.5 }}>{p?.category?.toUpperCase() || ""}</div>
        <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#111", lineHeight:1.3 }}>{p?.name || "Sin nombre"}</h2>
        {p?.description && <p style={{ color:"#6B7280", fontSize:14, lineHeight:1.6, margin:"0 0 14px" }}>{p?.description}</p>}
        {p?.bulkInfo && (
          <div style={{ background:"#F9FAFB", borderRadius:10, padding:"10px 14px", marginBottom:16, border:"1px solid #E5E7EB" }}>
            <div style={{ fontSize:10, color:"#9CA3AF", fontWeight:700, letterSpacing:1, marginBottom:3 }}>PRESENTACIÓN</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#374151" }}>{p.bulkInfo}</div>
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10, color:"#9CA3AF", fontWeight:700, letterSpacing:1 }}>PRECIO</div>
            <div style={{ fontWeight:900, fontSize:30, color:"#C41E3A", lineHeight:1 }}>{fmt(p?.price || 0)}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, background:"#F4F4F5", borderRadius:12, padding:"6px 8px" }}>
            <button onClick={() => setQty(Math.max(1,qty-1))} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#374151", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:8 }}>−</button>
            <span style={{ fontWeight:800, fontSize:18, minWidth:28, textAlign:"center" }}>{qty}</span>
            <button onClick={() => setQty(qty+1)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#374151", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:8 }}>+</button>
          </div>
        </div>
        {qty > 1 && (
          <div style={{ background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:10, padding:"8px 14px", marginBottom:14, fontSize:13, fontWeight:600, color:"#92400E" }}>
            Total: {fmt((p?.price || 0) * qty)}
          </div>
        )}
        <button onClick={onAdd} className="btn-red" style={{ width:"100%", padding:14, fontSize:16, borderRadius:12, justifyContent:"center" }}>
          🛒 Agregar al carrito
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CART DRAWER
// ═══════════════════════════════════════════════════════

function CartDrawer({ cart, onRemove, onClose, total, onClear }) {
  const sendWA = () => {
    const lines = cart.map(i => `• ${i.qty}x ${i.name}: ${fmt(i.price * i.qty)}`).join("\n");
    const msg = encodeURIComponent(`Hola! Quisiera hacer un pedido 👋\n\n${lines}\n\n*TOTAL: ${fmt(total)}*\n\nEspero su confirmación, gracias!`);
    window.open(`https://wa.me/5491124953641?text=${msg}`, "_blank");
  };
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontWeight:800, fontSize:18 }}>🛒 Mi Pedido</div>
          <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{cart.length} producto{cart.length!==1?"s":""} seleccionados</div>
        </div>
        <button onClick={onClose} style={{ background:"#F4F4F5", border:"none", borderRadius:8, width:36, height:36, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 20px" }}>
        {cart.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 0", color:"#9CA3AF" }}>
            <div style={{ fontSize:52 }}>🛒</div>
            <div style={{ fontWeight:700, fontSize:16, marginTop:12 }}>Tu carrito está vacío</div>
            <div style={{ fontSize:13, marginTop:4 }}>Explorá el catálogo y agregá productos</div>
          </div>
        ) : cart.filter(Boolean).map(item => (
          <div key={item.id} style={{ display:"flex", gap:12, padding:"13px 0", borderBottom:"1px solid #F3F4F6", alignItems:"flex-start" }}>
            <div style={{ width:44, height:44, background:`${CAT_COLOR[item?.category]||"#C41E3A"}22`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
              {CAT_EMOJI[item?.category]||"🍖"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13, lineHeight:1.3 }}>{item?.name || "Sin nombre"}</div>
              <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{item?.qty || 0} × {fmt(item?.price || 0)}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontWeight:800, color:"#C41E3A", fontSize:15 }}>{fmt((item?.price || 0) * (item?.qty || 0))}</div>
              <button onClick={() => onRemove(item.id)} style={{ background:"none", border:"none", color:"#D1D5DB", cursor:"pointer", fontSize:11, marginTop:3, padding:0 }}>✕ quitar</button>
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div style={{ padding:"16px 20px", borderTop:"1px solid #F3F4F6", background:"white" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14, padding:"12px 14px", background:"#FEF2F2", borderRadius:12 }}>
            <span style={{ fontWeight:700 }}>Total del pedido</span>
            <span style={{ fontWeight:900, fontSize:20, color:"#C41E3A" }}>{fmt(total)}</span>
          </div>
          <button onClick={sendWA} style={{ width:"100%", background:"#25D366", color:"white", border:"none", borderRadius:12, padding:14, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:8, fontFamily:"'Poppins',sans-serif" }}>
            📱 Enviar por WhatsApp
          </button>
          <button onClick={onClear} style={{ width:"100%", background:"#F4F4F5", color:"#6B7280", border:"none", borderRadius:12, padding:10, fontSize:13, cursor:"pointer", fontFamily:"'Poppins',sans-serif" }}>
            Vaciar carrito
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════

function AdminPanel({ products, form, setForm, editing, setEditing, adminTab, setAdminTab, onSubmit, onEdit, onDelete, onExcel, fileRef, supaUrl, supaKey, setSupaUrl, setSupaKey, onSync, syncing, onSaveSupa, onReset, onImageSelect, onClearImage, imagePreview, uploadingImage, onMigrate }) {
  const input = { width:"100%", padding:"10px 13px", borderRadius:9, border:"1px solid #E5E7EB", fontSize:14, fontFamily:"'Poppins',sans-serif", marginTop:5, outline:"none" };
  const ADMIN_CATS = CATS.filter(c => c !== "Todos");

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"16px 12px 48px" }}>
      <div style={{ background:"#111", borderRadius:16, padding:"20px 24px", margin:"16px 0 20px" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"white", fontSize:26, letterSpacing:3 }}>⚙️ PANEL DE ADMINISTRACIÓN</div>
        <div style={{ color:"#9CA3AF", fontSize:13, marginTop:4 }}>{products.length} productos · Star Family Mayorista</div>
      </div>

      {/* TABS */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[["list","📋 Productos"],["add", editing?"✏️ Editar":"➕ Agregar"],["excel","📊 Excel"]].map(([t,label]) => (
          <button key={t} onClick={() => setAdminTab(t)} style={{ background:adminTab===t?"#C41E3A":"white", color:adminTab===t?"white":"#374151", border:adminTab===t?"none":"1px solid #E5E7EB", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Poppins',sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: LIST */}
      {adminTab === "list" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
            <span style={{ fontWeight:700 }}>{products.length} productos en catálogo</span>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { setEditing(false); setForm({ id:"", category:"Frescos", name:"", description:"", price:"", bulkInfo:"", image:"" }); setAdminTab("add"); }} className="btn-red" style={{ padding:"8px 14px", fontSize:13 }}>+ Nuevo</button>
              <button onClick={onReset} style={{ background:"white", border:"1px solid #E5E7EB", borderRadius:9, padding:"8px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>↺ Reset</button>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {products && products.length > 0 ? (
              products.filter(Boolean).map(p => (
              <div key={p.id} style={{ background:"white", borderRadius:12, padding:"12px 16px", display:"flex", gap:12, alignItems:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ width:46, height:46, borderRadius:10, background:`${CAT_COLOR[p?.category]||"#C41E3A"}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, overflow:"hidden" }}>
                  {p?.image ? <img src={p?.image} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" onError={e => { e.target.style.display="none"; }} /> : (CAT_EMOJI[p?.category]||"🍖")}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p?.name || "Sin nombre"}</div>
                  <div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>{p?.category} · <strong style={{ color:"#C41E3A" }}>{fmt(p?.price || 0)}</strong></div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={() => onEdit(p)} style={{ background:"#EFF6FF", border:"none", borderRadius:8, padding:"7px 11px", cursor:"pointer", fontSize:14 }}>✏️</button>
                  <button onClick={() => onDelete(p.id)} style={{ background:"#FEE2E2", border:"none", borderRadius:8, padding:"7px 11px", cursor:"pointer", fontSize:14 }}>🗑️</button>
                </div>
              </div>
            ))
            ) : (
              <div style={{ textAlign:"center", padding:40, color:"#6B7280" }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📦</div>
                <div style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Cargando productos de Star Family...</div>
                <div style={{ fontSize:14 }}>Por favor, espera mientras se cargan los productos</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ADD/EDIT */}
      {adminTab === "add" && (
        <div style={{ background:"white", borderRadius:16, padding:24, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin:"0 0 20px", fontWeight:800, fontSize:18 }}>{editing ? "✏️ Editar producto" : "➕ Nuevo producto"}</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>NOMBRE *</label>
              <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} style={input} placeholder="Ej: Salchichas Largas x6" />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>CATEGORÍA *</label>
              <select value={form.category} onChange={e => setForm({...form,category:e.target.value})} style={input}>
                {ADMIN_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>PRECIO *</label>
              <input type="number" value={form.price} onChange={e => setForm({...form,price:e.target.value})} style={input} placeholder="19725" />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>INFO DE BULTO / PRESENTACIÓN</label>
              <input value={form.bulkInfo} onChange={e => setForm({...form,bulkInfo:e.target.value})} style={input} placeholder="Ej: Bulto x 12 paquetes" />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>DESCRIPCIÓN</label>
              <textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} style={{...input,height:80,resize:"vertical"}} placeholder="Descripción del producto..." />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>IMAGEN DEL PRODUCTO</label>
              <div style={{ marginTop:5 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display:"none" }}
                  onChange={onImageSelect}
                />
                <div style={{ 
                  border:"2px dashed #E5E7EB", 
                  borderRadius:12, 
                  padding:20, 
                  textAlign:"center", 
                  cursor:"pointer", 
                  transition:"all 0.2s",
                  background:"#FAFAFA",
                  position:"relative"
                }}
                  onClick={() => fileRef.current?.click()}
                  onMouseOver={(e) => { e.target.style.borderColor="#C41E3A"; e.target.style.background="#FFF5F5"; }}
                  onMouseOut={(e) => { e.target.style.borderColor="#E5E7EB"; e.target.style.background="#FAFAFA"; }}
                >
                  {imagePreview ? (
                    <div style={{ position:"relative" }}>
                      <img 
                        src={imagePreview} 
                        alt="Vista previa" 
                        style={{ 
                          width: "100%", 
                          maxWidth:200, 
                          height:150, 
                          objectFit:"cover", 
                          borderRadius:8,
                          border:"1px solid #E5E7EB"
                        }} 
                      />
                      <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:4 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearImage();
                          }}
                          style={{
                            background:"rgba(220, 38, 38, 0.9)",
                            color:"white",
                            border:"none",
                            borderRadius:"50%",
                            width:24,
                            height:24,
                            cursor:"pointer",
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            fontSize:12,
                            fontWeight:"bold"
                          }}
                          title="Borrar imagen"
                        >
                          ×
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fileRef.current?.click();
                          }}
                          style={{
                            background:"rgba(59, 130, 246, 0.9)",
                            color:"white",
                            border:"none",
                            borderRadius:"50%",
                            width:24,
                            height:24,
                            cursor:"pointer",
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            fontSize:12,
                            fontWeight:"bold"
                          }}
                          title="Cambiar imagen"
                        >
                          📷
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                      <div style={{ fontWeight:600, color:"#374151", marginBottom:4 }}>
                        {uploadingImage ? "Subiendo imagen..." : "Hacé clic para subir imagen"}
                      </div>
                      <div style={{ fontSize:12, color:"#9CA3AF" }}>
                        Formatos: JPG, PNG, GIF (máx. 5MB)
                      </div>
                    </div>
                  )}
                </div>
                {uploadingImage && (
                  <div style={{ 
                    marginTop:10, 
                    textAlign:"center", 
                    color:"#C41E3A", 
                    fontSize:13, 
                    fontWeight:500 
                  }}>
                    ⏳ Subiendo imagen a Supabase...
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:24 }}>
            <button onClick={onSubmit} className="btn-red" style={{ flex:1, padding:14, fontSize:15, borderRadius:12, justifyContent:"center" }}>
              {editing ? "💾 Guardar cambios" : "✅ Agregar producto"}
            </button>
            <button onClick={() => { setAdminTab("list"); setEditing(false); }} style={{ background:"#F4F4F5", color:"#6B7280", border:"none", borderRadius:12, padding:"14px 20px", cursor:"pointer", fontSize:14, fontFamily:"'Poppins',sans-serif" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* TAB: EXCEL */}
      {adminTab === "excel" && (
        <div style={{ background:"white", borderRadius:16, padding:24 }}>
          <h3 style={{ margin:"0 0 6px", fontWeight:800 }}>📊 Importar desde Excel</h3>
          <p style={{ color:"#6B7280", fontSize:14, marginBottom:20 }}>Subí tu lista de precios en Excel y los productos se cargan automáticamente.</p>
          <div style={{ border:"2px dashed #E5E7EB", borderRadius:14, padding:36, textAlign:"center", cursor:"pointer", transition:"border-color 0.2s", background:"#FAFAFA" }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f && fileRef.current){ fileRef.current.files = e.dataTransfer.files; fileRef.current.dispatchEvent(new Event("change",{bubbles:true})); } }}>
            <div style={{ fontSize:52 }}>📁</div>
            <div style={{ fontWeight:700, fontSize:16, marginTop:10 }}>Hacé clic o arrastrá tu Excel acá</div>
            <div style={{ fontSize:13, color:"#9CA3AF", marginTop:4 }}>Formatos: .xlsx · .xls</div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={onExcel} />

          <div style={{ marginTop:20, background:"#F0FDF4", borderRadius:12, padding:16, border:"1px solid #BBF7D0" }}>
            <div style={{ fontWeight:700, color:"#166534", marginBottom:8, fontSize:14 }}>📋 Columnas requeridas</div>
            <div style={{ fontFamily:"monospace", fontSize:12, color:"#166534", lineHeight:1.9, background:"white", borderRadius:8, padding:"10px 14px", border:"1px solid #BBF7D0" }}>
              nombre | categoria | precio | bulto | descripcion | imagen<br/>
              <span style={{ color:"#9CA3AF" }}>
                Salchichas x6 | Frescos | 19050 | Bulto x12 | Desc... | https://...<br/>
                30 Panchos | Panchos Armados | 11700 | 30+30+1 | ... |
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:400; opacity:0; pointer-events:none; transition:opacity 0.25s; }
  .overlay.show { opacity:1; pointer-events:all; }

  .cart-drawer { position:fixed; top:0; right:0; width:380px; max-width:100vw; height:100vh; background:white; z-index:450; box-shadow:-6px 0 32px rgba(0,0,0,0.15); transform:translateX(100%); transition:transform 0.3s cubic-bezier(0.4,0,0.2,1); overflow-y:auto; }
  .cart-drawer.open { transform:translateX(0); }

  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:600; display:flex; align-items:center; justify-content:center; padding:16px; }
  .modal-box { background:white; border-radius:14px; max-width:460px; width:100%; max-height:90vh; overflow-y:auto; animation:pop-in 0.2s ease; }
  @keyframes pop-in { from { transform:scale(0.92); opacity:0; } to { transform:scale(1); opacity:1; } }

  .cat-scroll { display:flex; gap:8px; overflow-x:auto; padding:10px 14px; scrollbar-width:none; }
  .cat-scroll::-webkit-scrollbar { display:none; }

  .product-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
  @media(min-width:640px) { .product-grid { grid-template-columns:repeat(3,1fr); gap:14px; } }
  @media(min-width:1024px) { .product-grid { grid-template-columns:repeat(4,1fr); } }

  .product-card { background:white; border-radius:14px; overflow:hidden; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.07); transition:transform 0.2s, box-shadow 0.2s; }
  .product-card:hover { transform:translateY(-5px); box-shadow:0 10px 28px rgba(0,0,0,0.13); }
  .product-card:hover img { transform:scale(1.06); }

  .btn-red { display:inline-flex; align-items:center; background:#C41E3A; color:white; border:none; border-radius:10px; padding:9px 18px; cursor:pointer; font-size:14px; font-weight:700; font-family:'Poppins',sans-serif; transition:background 0.15s; }
  .btn-red:hover { background:#A01731; }
  .btn-ghost { display:inline-flex; align-items:center; background:transparent; color:#9CA3AF; border:1px solid #374151; border-radius:9px; padding:7px 14px; cursor:pointer; font-size:13px; font-weight:600; font-family:'Poppins',sans-serif; transition:all 0.15s; }
  .btn-ghost:hover { border-color:#9CA3AF; color:white; }

  .btn-add-cart { background:#C41E3A; color:white; border:none; border-radius:8px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:22px; font-weight:700; flex-shrink:0; transition:background 0.15s; line-height:1; }
  .btn-add-cart:hover { background:#A01731; }

  @media(max-width:480px) { .cart-drawer { width:100vw; } }
`;
