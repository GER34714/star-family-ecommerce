import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getSupabaseClient } from './supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════
// DATA & CONSTANTS
// ═══════════════════════════════════════════════════════

const CATS = ["Todos","Frescos","Completos","Panchos Armados","Hamburguesas","Pizzas y Empanadas","Medialunas y Chipas","Combos"];
const CAT_EMOJI = { "Frescos":"🌭","Completos":"🌭","Panchos Armados":"🌭","Hamburguesas":"🍔","Pizzas y Empanadas":"🍕","Medialunas y Chipas":"🥐","Combos":"📦" };
const CAT_COLOR = { "Frescos":"#E53E3E","Completos":"#DD6B20","Panchos Armados":"#D97706","Hamburguesas":"#7C3AED","Pizzas y Empanadas":"#2563EB","Medialunas y Chipas":"#059669","Combos":"#C41E3A","Todos":"#C41E3A" };

// ⚠️ ELIMINADO: SEED_PRODUCTS - La única fuente de datos es Supabase
// const SEED_PRODUCTS = [ ... ]; // Eliminado para evitar sobrescribir datos reales

const fmt = (p) => `$${Number(p).toLocaleString("es-AR")}`;

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

const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage item ${key}:`, error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════
// SUPABASE CONFIGURATION
// ═══════════════════════════════════════════════════════

// ⚠️ getSupabaseClient movido a ./supabaseClient.js (singleton pattern)
// Importado arriba para evitar múltiples instancias de GoTrueClient

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════

export default function StarFamilyApp() {
  // FLUJO DE DATOS: Inicialización segura con valores por defecto
  const [view, setView] = useState("shop");
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState("Todos");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [qty, setQty] = useState(1);
  const [adminTab, setAdminTab] = useState("list");
  const [form, setForm] = useState({ id:"", category:"Frescos", name:"", description:"", price:"", bulkInfo:"", image_url:"" });
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
  
  // Estados para el comportamiento inteligente de scroll
  const [scrollDirection, setScrollDirection] = useState('up');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollThreshold, setScrollThreshold] = useState(150);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showTimer, setShowTimer] = useState(null);
  
  // Estados para filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para PWA
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState('floating'); // 'floating' o 'footer'
  const [priceHistory, setPriceHistory] = useState([]);
  const [restorePoints, setRestorePoints] = useState([]);

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
    let debounceTimer;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Detectar dirección del scroll
      if (currentScrollY > lastScrollY) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
      
      // Marcar que está scrolleando
      setIsScrolling(true);
      
      // Limpiar timer existente
      if (showTimer) {
        clearTimeout(showTimer);
      }
      
      // Lógica de visibilidad con umbral - PRIORIDAD AL FOOTER Y CARRITO
      const footer = document.querySelector('footer');
      const cartDrawer = document.querySelector('.cart-drawer');
      let shouldHide = false;
      
      // 1. PRIORIDAD MÁXIMA: Si el footer es visible, ocultar siempre
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // Ocultar cuando el footer es visible (para no interferir con carrito)
        if (footerRect.top < windowHeight) {
          shouldHide = true;
        }
      }
      
      // 2. PRIORIDAD ALTA: Si el carrito está abierto, ocultar siempre
      if (cartDrawer && cartDrawer.classList.contains('open')) {
        shouldHide = true;
      }
      
      // 3. Si no hay prioridades, aplicar lógica de scroll
      if (!shouldHide) {
        // Ocultar por scroll hacia abajo después del umbral
        if (scrollDirection === 'down' && currentScrollY > scrollThreshold) {
          shouldHide = true;
        }
        
        // NO mostrar inmediatamente al scrollear hacia arriba - esperar a que deje de scrollear
        if (scrollDirection === 'up') {
          // Esperar a que deje de scrollear para mostrar
          // Esto se manejará en el debounce
        }
      }
      
      setHideFloatingButtons(shouldHide);
      setLastScrollY(currentScrollY);
    };
    
    const debounceScrollEnd = () => {
      setIsScrolling(false);
      
      // Si el scroll terminó y la dirección es hacia arriba, mostrar botones con retraso
      if (scrollDirection === 'up') {
        const footer = document.querySelector('footer');
        const cartDrawer = document.querySelector('.cart-drawer');
        
        // Verificar que no haya prioridades activas
        let hasPriority = false;
        if (footer) {
          const footerRect = footer.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          hasPriority = footerRect.top < windowHeight;
        }
        if (cartDrawer && cartDrawer.classList.contains('open')) {
          hasPriority = true;
        }
        
        if (!hasPriority) {
          // Mostrar botones después de 800ms de retraso
          const timer = setTimeout(() => {
            setHideFloatingButtons(false);
          }, 800);
          setShowTimer(timer);
        }
      }
    };

    // Ocultar botones cuando se abre el carrito o modal
    if (cartOpen || modal) {
      setHideFloatingButtons(true);
    } else {
      handleScroll(); // Verificar posición inicial
    }

    window.addEventListener('scroll', handleScroll);
    
    // Debounce para detectar fin del scroll
    let scrollEndTimer;
    const debouncedScrollEnd = () => {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(debounceScrollEnd, 150);
    };
    
    window.addEventListener('scroll', debouncedScrollEnd);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', debouncedScrollEnd);
      if (showTimer) {
        clearTimeout(showTimer);
      }
      if (scrollEndTimer) {
        clearTimeout(scrollEndTimer);
      }
    };
  }, [cartOpen, modal, scrollDirection, scrollThreshold, lastScrollY, showTimer]);

  // Efecto para manejar instalación PWA
  useEffect(() => {
    console.log('🔍 PWA: Iniciando diagnóstico PWA...');
    console.log('🔍 PWA - HTTPS:', window.location.protocol === 'https:' || window.location.hostname === 'localhost');
    console.log('🔍 PWA - Service Worker:', 'serviceWorker' in navigator);
    console.log('🔍 PWA - beforeinstallprompt:', 'onbeforeinstallprompt' in window);

    const handleBeforeInstallPrompt = (e) => {
      console.log('📱 PWA: Evento beforeinstallprompt detectado');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Mostrar popup temporal al detectar que es instalable
      setShowInstallPopup(true);
      setPopupPosition('floating');
      
      // Después de 8 segundos, mover al footer
      setTimeout(() => {
        setPopupPosition('footer');
      }, 8000);
      
      // Después de 15 segundos totales, ocultar completamente
      setTimeout(() => {
        setShowInstallPopup(false);
      }, 15000);
    };

    const handleAppInstalled = () => {
      console.log('📱 PWA: Aplicación instalada exitosamente');
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallPopup(false);
      showToast('✅ ¡Aplicación instalada exitosamente!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // FORZAR POPUP PARA TESTING EN LOCALHOST
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🧪 PWA: Forzando popup para testing en localhost...');
      
      // Simular evento after de 2 segundos para testing
      setTimeout(() => {
        console.log('🧪 PWA: Mostrando popup forzado para testing');
        setShowInstallPopup(true);
        setPopupPosition('floating');
        setIsInstallable(true);
        
        // Mismo temporizador que el real
        setTimeout(() => {
          setPopupPosition('footer');
        }, 8000);
        
        setTimeout(() => {
          setShowInstallPopup(false);
        }, 15000);
      }, 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Función para instalar PWA manualmente
  const installPWA = async () => {
    if (!deferredPrompt) {
      showToast('⚠️ La instalación no está disponible en este navegador');
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('📱 PWA: Usuario aceptó la instalación');
        showToast('📱 Instalando aplicación...');
      } else {
        console.log('📱 PWA: Usuario rechazó la instalación');
        showToast('❌ Instalación cancelada');
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('📱 PWA: Error en instalación:', error);
      showToast('❌ Error al instalar la aplicación');
    }
  };

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
        saveImagePreview(reader.result);
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

  const uploadImageFromUrlToSupabase = async (imageUrl, productName) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Configuración de Supabase no disponible, usando URL original');
      return imageUrl;
    }

    try {
      // Si ya es una URL de Supabase, no hacer nada
      if (imageUrl && imageUrl.includes('supabase')) {
        return imageUrl;
      }

      // Si no hay URL o es vacía, retornar null
      if (!imageUrl || imageUrl.trim() === '') {
        return null;
      }

      // Descargar la imagen desde la URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`No se pudo descargar la imagen: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Determinar la extensión del archivo
      const contentType = blob.type;
      let fileExt = 'jpg'; // default
      if (contentType.includes('png')) fileExt = 'png';
      else if (contentType.includes('gif')) fileExt = 'gif';
      else if (contentType.includes('webp')) fileExt = 'webp';
      else if (contentType.includes('jpeg')) fileExt = 'jpg';

      // Generar nombre de archivo basado en el producto
      const sanitizedName = productName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);
      
      const fileName = `${sanitizedName}-${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      console.log(`✅ Imagen de "${productName}" subida a Supabase: ${publicUrl}`);
      return publicUrl;
      
    } catch (error) {
      console.error(`Error subiendo imagen desde URL para "${productName}":`, error);
      // En caso de error, retornar la URL original
      return imageUrl;
    }
  };

  const clearImagePreview = () => {
    saveImagePreview(null);
    setSelectedFile(null);
    setForm(prev => ({...prev, image_url: ''})); // Limpiar URL del formulario también
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
      if (email === "admin@starfamily.com" && password === "admin123") {
        setUser({ email, role: "admin" });
        showToast("✅ Sesión iniciada como administrador", "success");
      } else {
        showToast("❌ Credenciales incorrectas", "error");
      }
    } catch (error) {
      showToast("❌ Error al iniciar sesión", "error");
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
      
      // Cargar configuración de Supabase primero
      let supabaseConfig = null;
      try { 
        const supaConfig = getStorageItem("roxy_supa"); 
        if (supaConfig) { 
          setSupaUrl(supaConfig.url||""); 
          setSupaKey(supaConfig.key||""); 
          supabaseConfig = supaConfig;
        } 
      } catch {}
      
      // LÓGICA ACTUALIZADA: Siempre usar Supabase como fuente principal de datos
      let productsLoaded = false;
      
      // 1. FORZAR CARGA DIRECTA DESDE SUPABASE (sin validaciones)
      console.log("🔍 FORZANDO CARGA DESDE SUPABASE...");
      
      try {
        productsLoaded = await loadProductsFromSupabase();
        console.log("🔍 RESULTADO loadProductsFromSupabase:", productsLoaded);
        
        if (productsLoaded) {
          console.log("☁️ Productos cargados desde Supabase (fuente de datos en tiempo real)");
          // Limpiar caché local para forzar siempre datos frescos
          localStorage.removeItem("roxy_products");
        } else {
          console.log("⚠️ Supabase no devolvió productos, mostrando error real...");
        }
      } catch (error) {
        console.error('Error cargando desde Supabase:', error);
        console.log("🔄 Error en Supabase, mostrando error real...");
      }
      
      // 2. Si Supabase falla, mostrar error real en lugar de lista vacía
      if (!productsLoaded) {
        console.error("🚨 ERROR REAL DE SUPABASE - No se pudieron cargar productos");
        console.error("🔍 Revisa los logs anteriores para ver el error específico");
        console.error("🔍 Posibles causas: URL incorrecta, API KEY inválida, tabla no existe, RLS bloqueando");
        
        // NO mostrar lista vacía - mostrar el error real
        setProducts([]); // Lista vacía pero con error claro en consola
        productsLoaded = true;
      }
      
      // Cargar otros datos desde almacenamiento local
      try { const cartData = getStorageItem("roxy_cart"); if (cartData) setCart(cartData); } catch {}
      try { const historyData = getStorageItem("roxy_price_history"); if (historyData) setPriceHistory(historyData); } catch {}
      try { const restoreData = getStorageItem("roxy_restore_points"); if (restoreData) setRestorePoints(restoreData); } catch {}
      try { const imageData = getStorageItem("roxy_image_preview"); if (imageData) setImagePreview(imageData); } catch {}
      
      // Cargar historial desde Supabase si hay configuración
      try {
        await loadPriceHistoryFromSupabase();
      } catch (error) {
        console.error('Error cargando historial desde Supabase:', error);
      }
      
      finally {
        setLoading(false);
        // Sincronizar carrito con productos cargados
        syncCartWithProducts(products);
      }
    })();
  }, []);

  const saveProducts = async (p, skipSupabaseSync = false, skipLocalStorage = false) => { 
    setProducts(p); 
    // Solo guardar en almacenamiento local si no se debe omitir
    if (!skipLocalStorage) {
      setStorageItem("roxy_products", p); 
    }
    // Sincronizar carrito automáticamente cuando cambian los productos
    syncCartWithProducts(p);
    
    // ⚠️ ELIMINADO: No sincronizar automáticamente con Supabase para evitar sobrescribir datos
    // La sincronización solo debe ocurrir explícitamente en handleFormSubmit
    // if (!skipSupabaseSync) {
    //   await syncProductsWithSupabase(p);
    // }
  };
  const saveCart = async (c) => { setCart(c); setStorageItem("roxy_cart", c); };
  const savePriceHistory = async (h) => { setPriceHistory(h); setStorageItem("roxy_price_history", h); };
  const saveRestorePoints = async (rp) => { setRestorePoints(rp); setStorageItem("roxy_restore_points", rp); };
  const saveImagePreview = async (preview) => { setImagePreview(preview); setStorageItem("roxy_image_preview", preview); };

  // Funciones para persistir en Supabase
  const saveProductToSupabase = async (product) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Configuración de Supabase no disponible');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .upsert({
          id: product.id,
          category: product.category,
          name: product.name,
          description: product.description || '',
          price: product.price,
          bulk_info: product.bulkInfo || '',
          image_url: product.image_url || '',
          active: true
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      console.log('✅ Producto guardado en Supabase:', product.name);
      return true;
    } catch (error) {
      console.error('Error guardando producto en Supabase:', error);
      return false;
    }
  };

  const savePriceHistoryToSupabase = async (historyEntry) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Configuración de Supabase no disponible');
      return false;
    }

    try {
      const entryData = {
        id: historyEntry.id,
        product_id: historyEntry.productId,
        product_name: historyEntry.productName,
        category: historyEntry.category,
        type: historyEntry.type,
        old_price: historyEntry.oldPrice,
        new_price: historyEntry.newPrice,
        difference: historyEntry.difference,
        percentage_change: historyEntry.percentageChange,
        user_email: historyEntry.user,
        timestamp: historyEntry.timestamp
      };

      // Agregar campos específicos para cambios masivos
      if (historyEntry.type === 'bulk') {
        entryData.adjustment_type = historyEntry.adjustmentType;
        entryData.adjustment_value = historyEntry.adjustmentValue;
        entryData.affected_categories = historyEntry.affectedCategories;
        entryData.changes_count = historyEntry.changesCount;
      }

      const { data, error } = await supabase
        .from('price_history')
        .insert(entryData);

      if (error) throw error;
      console.log('✅ Historial guardado en Supabase:', historyEntry.productName);
      return true;
    } catch (error) {
      console.error('Error guardando historial en Supabase:', error);
      return false;
    }
  };

  // ⚠️ ELIMINADO: syncProductsWithSupabase para evitar sobrescribir datos de Supabase
// La sincronización ahora solo ocurre individualmente en handleFormSubmit
// const syncProductsWithSupabase = async (productsToSync) => { ... };

  const loadPriceHistoryFromSupabase = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Configuración de Supabase no disponible, usando historial local');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        // Convertir datos al formato local
        const localHistory = data.map(entry => ({
          id: entry.id,
          timestamp: entry.timestamp,
          type: entry.type,
          productId: entry.product_id,
          productName: entry.product_name,
          category: entry.category,
          oldPrice: entry.old_price,
          newPrice: entry.new_price,
          difference: entry.difference,
          percentageChange: entry.percentage_change,
          user: entry.user_email,
          // Campos para cambios masivos
          adjustmentType: entry.adjustment_type,
          adjustmentValue: entry.adjustment_value,
          affectedCategories: entry.affected_categories,
          changesCount: entry.changes_count,
          changes: [] // Los cambios individuales no se guardan en Supabase por simplicidad
        }));

        // Actualizar historial local
        const mergedHistory = [...localHistory, ...priceHistory.filter(local => 
          !localHistory.some(supabase => supabase.id === local.id)
        )].slice(0, 100);

        await savePriceHistory(mergedHistory);
        console.log(`📊 Historial cargado desde Supabase: ${data.length} cambios`);
      }
    } catch (error) {
      console.error('Error cargando historial desde Supabase:', error);
    }
  };

  // Sistema de Backup y Restauración
  const createRestorePoint = async (reason = "Backup automático") => {
    const restorePoint = {
      id: `restore_${Date.now()}`,
      timestamp: new Date().toISOString(),
      reason: reason,
      products: JSON.parse(JSON.stringify(products)), // Deep copy
      priceHistory: JSON.parse(JSON.stringify(priceHistory)), // Deep copy
      user: user?.email || 'unknown'
    };

    const newRestorePoints = [restorePoint, ...restorePoints].slice(0, 10); // Mantener últimos 10 puntos
    saveRestorePoints(newRestorePoints);
    console.log('📍 Punto de restauración creado:', reason);
  };

  const restoreFromPoint = async (restorePointId) => {
    const restorePoint = restorePoints.find(rp => rp.id === restorePointId);
    if (!restorePoint) {
      showToast('❌ Punto de restauración no encontrado', 'error');
      return;
    }

    try {
      // Confirmación del usuario
      const confirmed = window.confirm(
        `¿Estás seguro que querés restaurar al estado anterior?\n\n` +
        `📅 Fecha: ${new Date(restorePoint.timestamp).toLocaleString('es-AR')}\n` +
        `📝 Razón: ${restorePoint.reason}\n` +
        `👤 Usuario: ${restorePoint.user}\n\n` +
        `⚠️ Esta acción reemplazará todos los datos actuales.`
      );

      if (!confirmed) return;

      // Restaurar productos
      await saveProducts(restorePoint.products);

      // Restaurar historial de precios
      await savePriceHistory(restorePoint.priceHistory);
      setPriceHistory(restorePoint.priceHistory);

      // Crear punto de restauración antes del cambio
      await createRestorePoint("Restauración desde punto anterior");

      showToast(`✅ Estado restaurado exitosamente (${restorePoint.reason})`, 'success');
      console.log('🔄 Estado restaurado desde:', restorePointId);

    } catch (error) {
      console.error('Error restaurando estado:', error);
      showToast('❌ Error al restaurar estado', 'error');
    }
  };

  const autoBackup = async () => {
    // Crear backup automático antes de cambios importantes
    await createRestorePoint("Backup antes de cambios importantes");
  };

  const syncCartWithProducts = (updatedProducts) => {
    // Actualizar carrito para reflejar cambios en productos
    const updatedCart = cart
      .map(cartItem => {
        const product = updatedProducts.find(p => p.id === cartItem.id);
        if (!product) {
          // Producto eliminado - remover del carrito
          return null;
        }
        // Producto actualizado - actualizar información
        return {
          ...cartItem,
          name: product.name,
          price: product.price,
          category: product.category,
          bulkInfo: product.bulkInfo,
          image_url: product.image_url
        };
      })
      .filter(Boolean); // Eliminar items nulos (productos eliminados)
    
    if (JSON.stringify(cart) !== JSON.stringify(updatedCart)) {
      saveCart(updatedCart);
      console.log('🔄 Carrito sincronizado con cambios de productos');
    }
  };

  const addToCart = (product, q = 1) => {
    const ex = cart.find(i => i.id === product.id);
    saveCart(ex ? cart.map(i => i.id === product.id ? {...i, qty: i.qty + q} : i) : [...cart, {...product, qty: q}]);
    setModal(null);
    showToast(`✅ ${product.name} agregado al carrito`);
  };
  const removeFromCart = (id) => saveCart(cart.filter(i => i.id !== id));
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = useMemo(() => {
  let result = products || [];
  
  // Filtrar por categoría
  if (cat !== "Todos") {
    result = result.filter(p => p && typeof p === 'object' && p?.category && p?.category === cat);
  }
  
  // Filtrar por término de búsqueda
  if (searchTerm.trim()) {
    result = result.filter(p => 
      p && typeof p === 'object' && (
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );
  }
  
  // Filtrar por rango de precios
  const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
  const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
  
  result = result.filter(p => 
    p && typeof p === 'object' && 
    p.price && 
    p.price >= minPrice && 
    p.price <= maxPrice
  );
  
  return result;
}, [products, cat, searchTerm, priceRange]);
  
  // DIAGNÓSTICO: Verificar estado de productos y filtered
  console.log("🔍 DIAGNÓSTICO DE RENDERIZADO:", {
    categoriaSeleccionada: cat,
    totalProducts: products?.length || 0,
    filteredLength: filtered?.length || 0,
    products: products,
    filtered: filtered
  });

  const loadProductsFromSupabase = async () => {
    console.log("🔍 loadProductsFromSupabase: INICIANDO...");
    
    // FORZAR CLIENTE SIN VALIDACIONES
    const supabase = getSupabaseClient();
    console.log("🔍 Cliente Supabase obtenido:", !!supabase);
    console.log("🔍 FORZANDO CONSULTA DIRECTA (sin validaciones de configuración)");
    
    // NO VALIDAR CONFIGURACIÓN - INTENTAR CONSULTA DIRECTA

    try {
      // Limpia caché local para forzar datos frescos
      localStorage.removeItem("roxy_products");
      
      console.log('🔍 DIAGNÓSTICO INMEDIATO - Consulta a tabla products');
      console.log('🔍 Cliente Supabase disponible:', !!supabase);
      
      // PRUEBA DE SELECT SIMPLE - MOSTRAR TODOS LOS PRODUCTOS (incluyendo inactivos)
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      // LOG COMPLETO DE RESPUESTA
      console.log("🔍 RESPUESTA COMPLETA DE SUPABASE:");
      console.log("📦 Data:", data);
      console.log("❌ Error:", error);
      console.log("🔍 Data length:", data?.length);
      console.log("🔍 Data type:", typeof data);
      console.log("🔍 Error details:", error ? { message: error.message, code: error.code, details: error.details } : 'No error');
      
      // DIAGNÓSTICO DETALLADO DEL ERROR
      if (error) {
        console.error("🚨 ERROR COMPLETO DE SUPABASE:");
        console.error("Objeto error completo:", JSON.stringify(error, null, 2));
        console.error("Código:", error.code);
        console.error("Mensaje:", error.message);
        console.error("Detalles:", error.details);
        console.error("Hint:", error.hint);
        
        // SOLUCIONES INMEDIATAS SEGÚN ERROR
        if (error.code === 'PGRST116') {
          console.error("🔧 SOLUCIÓN: La tabla 'products' no existe. Intenta con 'productos'");
        } else if (error.code === '42501') {
          console.error("🔧 SOLUCIÓN: Problema de permisos RLS. Ejecuta: ALTER TABLE products DISABLE ROW LEVEL SECURITY;");
        } else if (error.message?.includes('relation "products" does not exist')) {
          console.error("🔧 SOLUCIÓN: Cambiar .from('products') por .from('productos')");
        }
        
        throw error;
      }
      
      console.log('✅ DEBUG: Consulta exitosa. Registros encontrados:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🔍 DEBUG: Muestra de datos recibidos:', data.slice(0, 2));
      }
      
      // DEBUG: Verificar estructura y estado de datos de la BD
      if (data && data.length > 0) {
        console.log('🔍 DEBUG: Estructura de campos en primer registro:', Object.keys(data[0]));
        console.log('🔍 DEBUG: Campos importantes del primer producto:', {
          id: data[0].id,
          name: data[0].name,
          image_url: data[0].image_url,
          category: data[0].category,
          price: data[0].price,
          bulk_info: data[0].bulk_info,
          active: data[0].active
        });
        
        // Mostrar resumen de todos los productos con su estado active
        console.log('🔍 DEBUG: Resumen de todos los productos:');
        data.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.id} - ${product.name} - active: ${product.active} - image_url: ${product.image_url ? '✅' : '❌ VACÍO'}`);
        });
        
        // Contar productos activos vs inactivos
        const activeCount = data.filter(p => p.active === true).length;
        const inactiveCount = data.filter(p => p.active === false).length;
        const withImageCount = data.filter(p => p.image_url && p.image_url.trim() !== '').length;
        
        console.log('🔍 DEBUG: Estadísticas:', {
          total: data.length,
          activos: activeCount,
          inactivos: inactiveCount,
          con_imagen: withImageCount,
          sin_imagen: data.length - withImageCount
        });
      }
      
      const mapped = (data || []).map(r => {
        // DEBUG: Log individual mapping
        const mappedItem = {
          id: r.id, // Usar ID real de la base de datos, no generar uno nuevo
          category: r.category || "Frescos",
          name: r.name || "Producto sin nombre",
          description: r.description || "",
          price: Number(r.price) || 0,
          bulkInfo: r.bulk_info || "",
          image_url: r.image_url || ""
        };
        
        // DEBUG: Verificar campos críticos
        if (!r.id) console.warn('⚠️ DEBUG: Registro sin ID:', r);
        if (!r.name) console.warn('⚠️ DEBUG: Registro sin nombre:', r);
        
        return mappedItem;
      }).filter(r => r.name);
        
      if (mapped.length > 0) {
        // Guardar productos directamente sin usar caché local
        console.log(`🔍 ANTES DE setProducts: ${mapped.length} productos mapeados`);
        console.log("🔍 PRODUCTOS MAPEADOS:", mapped);
        
        setProducts(mapped);
        
        // Verificar inmediatamente después de setProducts
        setTimeout(() => {
          console.log("🔍 DESPUÉS DE setProducts - productos en estado:", products);
          console.log("🔍 Longitud del estado products:", products.length);
        }, 100);
        
        console.log(`☁️ ${mapped.length} productos cargados desde Supabase (datos en tiempo real)`);
        
        // Mostrar IDs reales para verificar
        const realIds = mapped.map(p => p.id).slice(0, 3);
        console.log(`🔍 IDs reales de productos: ${realIds.join(', ')}...`);
        
        // DEBUG TOTAL: Log directo de lectura de tabla
        console.log("Intentando leer tabla 'products'...", await supabase.from('products').select('*'));
      
      console.log("🔍 loadProductsFromSupabase: RETORNANDO true");
      return true;
      } else {
        console.log("⚠️ loadProductsFromSupabase: No se encontraron productos en Supabase");
        console.log("🔍 loadProductsFromSupabase: RETORNANDO false");
        return false;
      }
    } catch(e) {
      console.error("🔍 loadProductsFromSupabase: ERROR:", e);
      console.log("🔍 loadProductsFromSupabase: RETORNANDO false por error");
      return false;
    }
  };

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
        .select('*');
      
      if (error) throw error;
      
      const mapped = (data || []).map(r => ({
        id: r.id || `prod_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        category: r.category || "Frescos",
        name: r.name || "Producto sin nombre",
        description: r.description || "",
        price: Number(r.price) || 0,
        bulkInfo: r.bulto || r.bulk_info || "",
        image_url: r.image_url || ""
      })).filter(r => r.name);
        
      if (mapped.length > 0) {
        saveProducts(mapped);
        showToast(`✅ ${mapped.length} productos cargados desde Supabase`);
      } else {
        showToast("⚠️ No se encontraron productos válidos en Supabase", "warning");
      }
      
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
        
        // Mostrar mensaje de procesamiento
        showToast("🔄 Procesando Excel y subiendo imágenes a Supabase...", "success");
        
        // Crear mapa de productos existentes por nombre para búsqueda rápida
        const existingProductsMap = new Map();
        products.forEach(p => {
          if (p && p.name) {
            existingProductsMap.set(p.name.toLowerCase().trim(), p);
          }
        });
        
        let updatedCount = 0;
        let newCount = 0;
        let imageUpdatedCount = 0;
        let imageUploadedCount = 0;
        
        const processedProducts = [];
        
        // Procesar cada producto
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const productName = (r.nombre || r.name || "").trim();
          if (!productName) continue;
          
          const existingProduct = existingProductsMap.get(productName.toLowerCase());
          const newImageData = r.image_url || "";
          
          let finalImageUrl = newImageData;
          
          // Subir imagen a Supabase si existe y no es de Supabase
          if (newImageData && !newImageData.includes('supabase')) {
            showToast(`⬆️ Subiendo imagen de: ${productName}`, "success");
            const uploadedUrl = await uploadImageFromUrlToSupabase(newImageData, productName);
            
            // Si la subida fue exitosa (URL diferente), actualizar contador
            if (uploadedUrl && uploadedUrl !== newImageData) {
              finalImageUrl = uploadedUrl;
              imageUploadedCount++;
            }
          }
          
          if (existingProduct) {
            // Producto existe - actualizarlo
            updatedCount++;
            
            // Solo actualizar la imagen si el Excel tiene una nueva URL de imagen
            const shouldUpdateImage = newImageData && newImageData !== existingProduct.image_url;
            if (shouldUpdateImage) imageUpdatedCount++;
            
            processedProducts.push({
              ...existingProduct,
              category: r.categoria || r.category || existingProduct.category,
              name: productName,
              description: r.descripcion || r.description || existingProduct.description,
              price: parseFloat(r.precio || r.price || existingProduct.price),
              bulkInfo: r.bulto || r.bulk_info || existingProduct.bulkInfo,
              image_url: shouldUpdateImage ? finalImageUrl : existingProduct.image_url
            });
          } else {
            // Producto nuevo - crearlo
            newCount++;
            processedProducts.push({
              id: `xl_${Date.now()}_${i}`,
              category: r.categoria || r.category || "Frescos",
              name: productName,
              description: r.descripcion || r.description || "",
              price: parseFloat(r.precio || r.price || 0),
              bulkInfo: r.bulto || r.bulk_info || "",
              image_url: finalImageUrl
            });
          }
        }
        
        if (processedProducts.length > 0) {
          // Combinar productos actualizados y nuevos
          const updatedProducts = products.map(existing => {
            const updated = processedProducts.find(p => p.id === existing.id);
            return updated || existing;
          });
          
          // Agregar productos nuevos que no estaban en la lista original
          const newProducts = processedProducts.filter(p => !products.find(existing => existing.id === p.id));
          
          const finalProducts = [...updatedProducts, ...newProducts];
          saveProducts(finalProducts);
          
          // Mensaje detallado de resultados
          let message = `✅ Procesados ${processedProducts.length} productos:`;
          if (updatedCount > 0) message += ` ${updatedCount} actualizados`;
          if (newCount > 0) message += ` ${newCount} nuevos`;
          if (imageUploadedCount > 0) message += ` (${imageUploadedCount} imágenes subidas a Supabase)`;
          
          showToast(message);
        } else {
          showToast("⚠️ No se encontraron productos válidos en el Excel", "error");
        }
      } catch (err) { 
        showToast("❌ Error al leer Excel: " + err.message, "error"); 
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Funciones de administración de precios
  const updateSinglePrice = async (productId, newPrice) => {
    // Crear punto de restauración antes del cambio
    await createRestorePoint("Antes de actualizar precio individual");
    
    const product = products.find(p => p.id === productId);
    const oldPrice = product.price;
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, price: parseFloat(newPrice) } : p
    );
    
    // Registrar cambio en historial
    const historyEntry = {
      id: `hist_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'individual',
      productId: productId,
      productName: product.name,
      category: product.category,
      oldPrice: oldPrice,
      newPrice: parseFloat(newPrice),
      difference: parseFloat(newPrice) - oldPrice,
      percentageChange: ((parseFloat(newPrice) - oldPrice) / oldPrice * 100).toFixed(2),
      user: user?.email || 'unknown'
    };
    
    const newHistory = [historyEntry, ...priceHistory].slice(0, 100); // Mantener últimos 100 cambios
    
    // Guardar localmente
    savePriceHistory(newHistory);
    saveProducts(updatedProducts);
    
    // Sincronizar producto individual con Supabase
    const updatedProduct = updatedProducts.find(p => p.id === productId);
    if (updatedProduct) {
      await saveProductToSupabase(updatedProduct);
    }
    
    // Guardar historial en Supabase
    try {
      await savePriceHistoryToSupabase(historyEntry);
      showToast("✅ Precio actualizado e historial guardado", "success");
    } catch (error) {
      console.error('Error guardando historial en Supabase:', error);
      showToast("✅ Precio actualizado localmente", "success");
    }
  };

  const updateBulkPrices = async (adjustmentType, value, selectedCategories = []) => {
    // Crear punto de restauración antes del cambio masivo
    await createRestorePoint(`Antes de ajuste masivo (${adjustmentType} ${value})`);
    
    let updatedCount = 0;
    const changes = [];
    
    const updatedProducts = products.map(p => {
      // Si hay categorías seleccionadas, solo afectar a esas
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) {
        return p;
      }
      
      let newPrice = p.price;
      
      if (adjustmentType === 'percentage') {
        newPrice = p.price * (1 + parseFloat(value) / 100);
      } else if (adjustmentType === 'fixed') {
        newPrice = p.price + parseFloat(value);
      }
      
      // Redondear a 2 decimales
      newPrice = Math.round(newPrice * 100) / 100;
      
      if (newPrice !== p.price) {
        updatedCount++;
        changes.push({
          productId: p.id,
          productName: p.name,
          category: p.category,
          oldPrice: p.price,
          newPrice: newPrice,
          difference: newPrice - p.price,
          percentageChange: ((newPrice - p.price) / p.price * 100).toFixed(2)
        });
        return { ...p, price: newPrice };
      }
      return p;
    });
    
    // Registrar cambios en historial
    const historyEntry = {
      id: `hist_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'bulk',
      adjustmentType: adjustmentType,
      adjustmentValue: parseFloat(value),
      affectedCategories: selectedCategories.length > 0 ? selectedCategories : ['Todas'],
      changesCount: updatedCount,
      changes: changes,
      user: user?.email || 'unknown'
    };
    
    const newHistory = [historyEntry, ...priceHistory].slice(0, 100); // Mantener últimos 100 cambios
    
    // Guardar localmente
    savePriceHistory(newHistory);
    saveProducts(updatedProducts);
    
    // Sincronizar productos actualizados con Supabase
    const syncPromises = updatedProducts
      .filter(p => changes.some(c => c.productId === p.id))
      .map(p => saveProductToSupabase(p));
    
    try {
      await Promise.allSettled(syncPromises);
      console.log(`✅ ${updatedCount} productos sincronizados con Supabase`);
    } catch (error) {
      console.error('Error sincronizando productos con Supabase:', error);
    }
    
    // Guardar historial en Supabase
    try {
      await savePriceHistoryToSupabase(historyEntry);
      showToast(`✅ ${updatedCount} precios actualizados e historial guardado`, "success");
    } catch (error) {
      console.error('Error guardando historial en Supabase:', error);
      showToast(`✅ ${updatedCount} precios actualizados localmente`, "success");
    }
    
    return updatedCount;
  };

  const previewBulkPriceChanges = (adjustmentType, value, selectedCategories = []) => {
    return products.map(p => {
      // Si hay categorías seleccionadas, solo afectar a esas
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) {
        return { ...p, newPrice: p.price, changed: false };
      }
      
      let newPrice = p.price;
      
      if (adjustmentType === 'percentage') {
        newPrice = p.price * (1 + parseFloat(value) / 100);
      } else if (adjustmentType === 'fixed') {
        newPrice = p.price + parseFloat(value);
      }
      
      // Redondear a 2 decimales
      newPrice = Math.round(newPrice * 100) / 100;
      
      return { 
        ...p, 
        newPrice, 
        changed: newPrice !== p.price,
        difference: newPrice - p.price,
        percentageChange: ((newPrice - p.price) / p.price * 100).toFixed(2)
      };
    });
  };

  const migrateExistingImagesToSupabase = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      showToast('⚠️ Configuración de Supabase requerida', 'error');
      return;
    }

    try {
      showToast('🔄 Migrando imágenes existentes a Supabase...', 'success');
      
      let migratedCount = 0;
      let errorCount = 0;
      const updatedProducts = [];

      for (const product of products) {
        // Si no tiene imagen o ya es de Supabase, saltar
        if (!product.image_url || product.image_url.includes('supabase')) {
          updatedProducts.push(product);
          continue;
        }

        try {
          showToast(`⬆️ Migrando imagen de: ${product.name}`, 'success');
          const uploadedUrl = await uploadImageFromUrlToSupabase(product.image_url, product.name);
          
          if (uploadedUrl && uploadedUrl !== product.image_url) {
            updatedProducts.push({ ...product, image_url: uploadedUrl });
            migratedCount++;
          } else {
            updatedProducts.push(product);
          }
        } catch (error) {
          console.error(`Error migrando imagen de ${product.name}:`, error);
          updatedProducts.push(product);
          errorCount++;
        }
      }

      // Guardar productos actualizados
      saveProducts(updatedProducts);
      
      // Mensaje de resultados
      let message = `✅ Migración completada:`;
      if (migratedCount > 0) message += ` ${migratedCount} imágenes migradas`;
      if (errorCount > 0) message += ` ${errorCount} errores`;
      if (migratedCount === 0 && errorCount === 0) message += ` No se encontraron imágenes para migrar`;
      
      showToast(message);
      
    } catch (error) {
      console.error('Error en migración de imágenes:', error);
      showToast('❌ Error en migración: ' + error.message, 'error');
    }
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim() || !form.price) return showToast("⚠️ Nombre y precio son requeridos", "error");
    
    console.log('🔍 handleFormSubmit - Inicio:', {
      editing,
      formImage: form.image_url,
      selectedFile: selectedFile?.name,
      imagePreview
    });
    
    let imageUrl = form.image_url;
    
    // Si hay una imagen seleccionada (archivo local), subirla a Supabase
    if (selectedFile) {
      console.log('📤 Subiendo archivo local a Supabase...');
      const uploadedUrl = await uploadImageToSupabase(selectedFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
        console.log('✅ Archivo subido exitosamente:', uploadedUrl);
        showToast("✅ Imagen subida a Supabase", "success");
        // Actualizar vista previa con la URL real de Supabase
        saveImagePreview(uploadedUrl);
        
        // PERSISTENCIA EXPLÍCITA: Actualizar image_url en la base de datos inmediatamente
        if (editing) {
          const supabase = getSupabaseClient();
          if (supabase) {
            try {
              const { error } = await supabase
                .from('products')
                .update({ image_url: uploadedUrl })
                .eq('id', form.id);
              
              if (error) {
                console.error('Error actualizando image_url en DB:', error);
                showToast('⚠️ Error guardando URL en base de datos', 'error');
              } else {
                console.log('✅ image_url persistido en base de datos:', uploadedUrl);
              }
            } catch (error) {
              console.error('Error en persistencia de image_url:', error);
            }
          }
        }
      } else {
        // Si falla la subida, continuar con la URL existente o vacía
        console.log('⚠️ Falló la subida del archivo');
        showToast("⚠️ Continuando sin subir la imagen", "warning");
      }
    } 
    // Si es edición y hay una URL en el formulario que no es de Supabase, subirla
    else if (editing && form.image_url && !form.image_url.includes('supabase')) {
      console.log('🌐 Subiendo imagen desde URL externa:', form.image_url);
      showToast("⬆️ Subiendo imagen desde URL a Supabase...", "success");
      const uploadedUrl = await uploadImageFromUrlToSupabase(form.image_url, form.name);
      if (uploadedUrl && uploadedUrl !== form.image_url) {
        imageUrl = uploadedUrl;
        console.log('✅ Imagen externa subida exitosamente:', uploadedUrl);
        showToast("✅ Imagen externa subida a Supabase", "success");
        // Actualizar vista previa con la URL real de Supabase
        saveImagePreview(uploadedUrl);
        
        // PERSISTENCIA EXPLÍCITA: Actualizar image_url en la base de datos inmediatamente
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const { error } = await supabase
              .from('products')
              .update({ image_url: uploadedUrl })
              .eq('id', form.id);
            
            if (error) {
              console.error('Error actualizando image_url en DB:', error);
              showToast('⚠️ Error guardando URL en base de datos', 'error');
            } else {
              console.log('✅ image_url persistido en base de datos:', uploadedUrl);
            }
          } catch (error) {
            console.error('Error en persistencia de image_url:', error);
          }
        }
      } else {
        console.log('ℹ️ La imagen externa no se pudo subir o ya es de Supabase');
      }
    }
    
    const p = { ...form, image_url: imageUrl, id: editing ? form.id : `prod_${Date.now()}`, price: parseFloat(form.price) };
    
    console.log('📦 Producto a guardar:', {
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      isEditing: editing
    });
    
    if (editing) {
      // Actualizar producto existente
      const updatedProducts = products.map(x => x.id === p.id ? p : x);
      // Guardar localmente SIN sincronizar para evitar duplicados
      await saveProducts(updatedProducts, true, false); // Omitir sincronización automática
      // Sincronizar individualmente con Supabase
      await saveProductToSupabase(p);
      console.log('✏️ Producto actualizado en la lista y en Supabase');
      showToast("✏️ Producto actualizado", "success");
    } else {
      // Agregar nuevo producto
      await saveProducts([...products, p], true, false); // Omitir sincronización automática
      // Sincronizar individualmente con Supabase
      await saveProductToSupabase(p);
      console.log('➕ Producto agregado a la lista y en Supabase');
      showToast("➕ Producto agregado", "success");
    }
    
    // Limpiar estado de imagen
    clearImagePreview();
    setForm({ id:"", category:"Frescos", name:"", description:"", price:"", bulkInfo:"", image_url:"" });
    setEditing(false);
    setAdminTab("list");
    
    // FORZAR RECARGA DESDE SUPABASE: Limpiar caché y recargar datos frescos
    localStorage.removeItem("roxy_products");
    setTimeout(async () => {
      try {
        await loadProductsFromSupabase();
        console.log('🔄 Datos recargados desde Supabase después de guardar');
      } catch (error) {
        console.error('Error en recarga post-guardado:', error);
      }
    }, 500);
    
    console.log('🧹 handleFormSubmit - Limpieza y recarga completadas');
  };

  const startEdit = (p) => { 
    setForm({...p, price: p.price.toString()}); 
    setEditing(true); 
    setAdminTab("add");
    // Si el producto tiene una imagen, mostrarla como vista previa
    if (p.image_url) {
      saveImagePreview(p.image_url);
    } else {
      saveImagePreview(null);
    }
    // Limpiar solo el archivo seleccionado, no la vista previa
    setSelectedFile(null);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };
  const deleteProduct = async (id) => { 
    const updatedProducts = products.filter(p => p.id !== id);
    await saveProducts(updatedProducts);
    // Eliminar de Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('products')
          .update({ active: false })
          .eq('id', id);
        if (error) throw error;
        console.log('🗑️ Producto eliminado de Supabase');
        
        // FORZAR RECARGA DESDE SUPABASE después de eliminar
        localStorage.removeItem("roxy_products");
        setTimeout(async () => {
          try {
            await loadProductsFromSupabase();
            console.log('🔄 Datos recargados desde Supabase después de eliminar');
          } catch (error) {
            console.error('Error en recarga post-eliminación:', error);
          }
        }, 500);
      } catch (error) {
        console.error('Error eliminando producto de Supabase:', error);
        showToast('⚠️ Error eliminando de Supabase', 'error');
      }
    }
    showToast("🗑️ Producto eliminado"); 
  };

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

          {/* SEARCH AND FILTERS BAR */}
          <div style={{ background:"white", borderBottom:"1px solid #E5E7EB", padding:"16px", position:"sticky", top:106, zIndex:95 }}>
            <div style={{ maxWidth:1200, margin:"0 auto" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                {/* Search Input */}
                <div style={{ flex:1, minWidth:250, position:"relative" }}>
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width:"100%",
                      padding:"12px 16px 12px 44px",
                      border:"1px solid #E5E7EB",
                      borderRadius:12,
                      fontSize:14,
                      fontFamily:"'Poppins',sans-serif",
                      outline:"none",
                      transition:"all 0.2s",
                      background:"#F9FAFB"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#C41E3A";
                      e.target.style.background = "white";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E5E7EB";
                      e.target.style.background = "#F9FAFB";
                    }}
                  />
                  <div style={{ position:"absolute", left:16, top:14, fontSize:18, opacity:0.5 }}>🔍</div>
                </div>

                {/* Filters Toggle Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    padding:"12px 20px",
                    background:showFilters ? "#C41E3A" : "white",
                    color:showFilters ? "white" : "#374151",
                    border:"1px solid #E5E7EB",
                    borderRadius:12,
                    fontSize:14,
                    fontWeight:600,
                    fontFamily:"'Poppins',sans-serif",
                    cursor:"pointer",
                    display:"flex",
                    alignItems:"center",
                    gap:8,
                    transition:"all 0.2s"
                  }}
                >
                  <span>🎛️</span>
                  Filtros
                  {(searchTerm || priceRange.min || priceRange.max) && (
                    <span style={{
                      background:"rgba(196, 30, 58, 0.2)",
                      color:"#C41E3A",
                      padding:"2px 6px",
                      borderRadius:10,
                      fontSize:11
                    }}>
                      Activo
                    </span>
                  )}
                </motion.button>

                {/* Clear Filters Button */}
                {(searchTerm || priceRange.min || priceRange.max) && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSearchTerm('');
                      setPriceRange({ min: '', max: '' });
                    }}
                    style={{
                      padding:"12px 20px",
                      background:"#F3F4F6",
                      color:"#6B7280",
                      border:"1px solid #E5E7EB",
                      borderRadius:12,
                      fontSize:14,
                      fontWeight:600,
                      fontFamily:"'Poppins',sans-serif",
                      cursor:"pointer",
                      transition:"all 0.2s"
                    }}
                  >
                    🗑️ Limpiar
                  </motion.button>
                )}
              </div>

              {/* Expandable Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow:"hidden", marginTop:16 }}
                  >
                    <div style={{ 
                      display:"flex", 
                      gap:16, 
                      alignItems:"center",
                      padding:"16px",
                      background:"#F9FAFB",
                      borderRadius:12,
                      border:"1px solid #E5E7EB"
                    }}>
                      <div style={{ fontSize:14, fontWeight:600, color:"#374151", fontFamily:"'Poppins',sans-serif" }}>
                        💰 Rango de precios:
                      </div>
                      <input
                        type="number"
                        placeholder="Mínimo"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        style={{
                          width:120,
                          padding:"8px 12px",
                          border:"1px solid #E5E7EB",
                          borderRadius:8,
                          fontSize:14,
                          fontFamily:"'Poppins',sans-serif",
                          outline:"none"
                        }}
                      />
                      <span style={{ color:"#6B7280" }}>—</span>
                      <input
                        type="number"
                        placeholder="Máximo"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        style={{
                          width:120,
                          padding:"8px 12px",
                          border:"1px solid #E5E7EB",
                          borderRadius:8,
                          fontSize:14,
                          fontFamily:"'Poppins',sans-serif",
                          outline:"none"
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Summary */}
              {(searchTerm || priceRange.min || priceRange.max) && (
                <div style={{ 
                  marginTop:12, 
                  fontSize:13, 
                  color:"#6B7280",
                  fontFamily:"'Poppins',sans-serif"
                }}>
                  {filtered.length} productos encontrados
                  {searchTerm && ` • "${searchTerm}"`}
                  {(priceRange.min || priceRange.max) && 
                    ` • $${priceRange.min || '0'} - $${priceRange.max || '∞'}`
                  }
                </div>
              )}
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
              try { setStorageItem("roxy_supa", { url:supaUrl, key:supaKey }); showToast("✅ Configuración guardada"); } catch {}
            }}
            onReset={async () => {
              setLoading(true);
              try {
                // Limpiar completamente almacenamiento local
                try {
                  removeStorageItem("roxy_products");
                  removeStorageItem("roxy_cart");
                  removeStorageItem("roxy_price_history");
                  removeStorageItem("roxy_restore_points");
                  removeStorageItem("roxy_image_preview");
                  console.log("🧹 Almacenamiento local limpiado");
                } catch (error) {
                  console.error("Error limpiando almacenamiento local:", error);
                }
                
                // Limpiar Supabase si hay configuración
                const supabase = getSupabaseClient();
                if (supabase) {
                  try {
                    // Eliminar todos los productos de Supabase
                    const { error: deleteError } = await supabase
                      .from('products')
                      .delete()
                      .neq('id', 'impossible_id'); // Eliminar todos
                    
                    if (deleteError) {
                      console.warn("⚠️ No se pudieron eliminar productos de Supabase:", deleteError);
                    } else {
                      console.log("🧹 Productos eliminados de Supabase");
                    }
                  } catch (error) {
                    console.warn("⚠️ Error limpiando Supabase:", error);
                  }
                }
                
                // Resetear estado a productos iniciales
                setProducts([]);
                setCart([]);
                setPriceHistory([]);
                setRestorePoints([]);
                setImagePreview(null);
                
                // Reset completo: limpiar productos y mostrar lista vacía
                setProducts([]);
                
                showToast("🔄 Sistema reiniciado completamente - Productos cargados desde cero");
                console.log("✅ Reset completo finalizado");
              } catch (error) {
                console.error("Error en reset completo:", error);
                showToast("❌ Error al reiniciar sistema", "error");
              } finally {
                setLoading(false);
              }
            }} 
            onImageSelect={handleImageSelect}
            onClearImage={clearImagePreview}
            imagePreview={imagePreview}
            uploadingImage={uploadingImage}
            onMigrate={migrateExistingImagesToSupabase}
            onUpdateSinglePrice={updateSinglePrice}
            onUpdateBulkPrices={updateBulkPrices}
            onPreviewBulkPriceChanges={previewBulkPriceChanges}
            priceHistory={priceHistory}
            onMigrateImages={migrateExistingImagesToSupabase}
            restorePoints={restorePoints}
            onCreateRestorePoint={createRestorePoint}
            onRestoreFromPoint={restoreFromPoint}
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
            &copy; {new Date().getFullYear()} STAR FAMILY. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* POPUP TEMPORAL DE INSTALACIÓN PWA */}
      <AnimatePresence>
        {showInstallPopup && (
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: 0.8,
              y: popupPosition === 'floating' ? 100 : 50
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8,
              y: popupPosition === 'floating' ? 100 : 50,
              transition: { duration: 0.3 }
            }}
            style={{
              position: popupPosition === 'floating' ? 'fixed' : 'relative',
              ...(popupPosition === 'floating' ? {
                bottom: 100,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 500
              } : {
                width: '100%',
                maxWidth: 1200,
                margin: '0 auto'
              })
            }}
          >
            <motion.div
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 8px 25px rgba(196, 30, 58, 0.4)"
              }}
              style={{
                background:"linear-gradient(135deg, #C41E3A, #A01731)",
                color:"white",
                borderRadius:16,
                padding:"16px 24px",
                display:"flex",
                alignItems:"center",
                gap:16,
                boxShadow:"0 6px 20px rgba(196, 30, 58, 0.3)",
                backdropFilter:"blur(10px)",
                border:"1px solid rgba(255, 255, 255, 0.2)",
                cursor:"pointer",
                maxWidth: popupPosition === 'floating' ? 350 : 'none',
                margin: popupPosition === 'footer' ? '20px 0' : 0
              }}
              onClick={installPWA}
            >
              <div style={{ 
                fontSize:32, 
                flexShrink:0,
                animation: 'bounce 2s infinite'
              }}>
                📱
              </div>
              <div style={{ flex:1 }}>
                <div style={{ 
                  fontSize:16, 
                  fontWeight:700, 
                  marginBottom:4,
                  fontFamily:"'Poppins',sans-serif"
                }}>
                  ¡Instala Star Family!
                </div>
                <div style={{ 
                  fontSize:13, 
                  opacity:0.9,
                  fontFamily:"'Poppins',sans-serif"
                }}>
                  Compra más rápido desde tu celular
                </div>
              </div>
              <div style={{ 
                fontSize:20, 
                opacity:0.7,
                flexShrink:0
              }}>
                ✨
              </div>
            </motion.div>
            
            {/* Botón de cerrar */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setShowInstallPopup(false);
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                position: popupPosition === 'floating' ? 'absolute' : 'relative',
                ...(popupPosition === 'floating' ? {
                  top: -8,
                  right: -8
                } : {
                  position: 'absolute',
                  top: 8,
                  right: 8
                }),
                background:"rgba(255, 255, 255, 0.2)",
                border:"none",
                borderRadius:20,
                width:32,
                height:32,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                cursor:"pointer",
                fontSize:16,
                color:"white",
                backdropFilter:"blur(10px)"
              }}
            >
              ✕
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÓN FLOTANTE DE WHATSAPP CON EFECTO DE VIBRACIÓN */}
      <AnimatePresence>
        {!hideFloatingButtons && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              mass: 0.8
            }}
            style={{ 
              position:"fixed", 
              bottom:20, 
              right:20, 
              zIndex:400 
            }}
          >
            {/* WhatsApp Button con efecto de vibración */}
            <motion.a
              href="https://wa.me/5491124953641"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ 
                scale: 1.1,
                boxShadow: "0 6px 20px rgba(37, 211, 102, 0.6), 0 0 30px rgba(37, 211, 102, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              animate={{
                boxShadow: [
                  "0 4px 12px rgba(37, 211, 102, 0.4), 0 0 20px rgba(37, 211, 102, 0.2)",
                  "0 4px 16px rgba(37, 211, 102, 0.5), 0 0 25px rgba(37, 211, 102, 0.3)",
                  "0 4px 12px rgba(37, 211, 102, 0.4), 0 0 20px rgba(37, 211, 102, 0.2)"
                ]
              }}
              transition={{
                boxShadow: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              style={{ 
                width:56, 
                height:56, 
                background:"#25D366", 
                borderRadius:"50%", 
                display:"flex", 
                alignItems:"center", 
                justifyContent:"center", 
                color:"white", 
                textDecoration:"none", 
                boxShadow:"0 4px 12px rgba(37, 211, 102, 0.4), 0 0 20px rgba(37, 211, 102, 0.2)",
                border: "1px solid rgba(37, 211, 102, 0.3)",
                backdropFilter: "blur(10px)"
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>

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
    image_url = '', 
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
        {image_url && image_url.trim() !== ''
          ? <img src={image_url} alt={name || "Producto"} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.3s" }} onError={e => { e.target.src = "https://via.placeholder.com/300x300/f5a623/ffffff?text=Star+Family"; }} />
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
        {p?.image_url
          ? <img src={p?.image_url} alt={p?.name || "Producto"} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { e.target.src = "https://via.placeholder.com/300x200/f5a623/ffffff?text=Star+Family"; }} />
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
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14, padding:"12px 14px", background:"#1F2937", borderRadius:12 }}>
            <span style={{ fontWeight:700, color:"white" }}>Total del pedido</span>
            <span style={{ fontWeight:900, fontSize:20, color:"#10B981" }}>{fmt(total)}</span>
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
// PRICE MANAGEMENT COMPONENT
// ═══════════════════════════════════════════════════════

function PriceManagement({ products, onUpdateSinglePrice, onUpdateBulkPrices, onPreviewBulkPriceChanges, priceHistory }) {
  const [priceMode, setPriceMode] = useState("individual"); // individual | bulk
  const [bulkType, setBulkType] = useState("percentage"); // percentage | fixed
  const [bulkValue, setBulkValue] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [tempPrice, setTempPrice] = useState("");

  const input = { width:"100%", padding:"10px 13px", borderRadius:9, border:"1px solid #E5E7EB", fontSize:14, fontFamily:"'Poppins',sans-serif", marginTop:5, outline:"none" };

  const handleBulkPreview = () => {
    if (!bulkValue || isNaN(bulkValue)) return;
    const preview = onPreviewBulkPriceChanges(bulkType, bulkValue, selectedCategories);
    setPreviewData(preview);
  };

  const handleBulkApply = () => {
    if (!bulkValue || isNaN(bulkValue)) return;
    if (!window.confirm(`¿Estás seguro que querés aplicar este ajuste a todos los productos${selectedCategories.length > 0 ? " de las categorías seleccionadas" : ""}?`)) return;
    
    const updatedCount = onUpdateBulkPrices(bulkType, bulkValue, selectedCategories);
    setPreviewData(null);
    setBulkValue("");
  };

  const handleSinglePriceUpdate = (productId, newPrice) => {
    if (!newPrice || isNaN(newPrice) || parseFloat(newPrice) <= 0) return;
    onUpdateSinglePrice(productId, newPrice);
    setEditingPrice(null);
    setTempPrice("");
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const changedProducts = previewData?.filter(p => p.changed) || [];
  const totalProducts = previewData?.length || 0;

  return (
    <div style={{ background:"white", borderRadius:16, padding:24 }}>
      <h3 style={{ margin:"0 0 6px", fontWeight:800 }}>💰 Administración de Precios</h3>
      <p style={{ color:"#6B7280", fontSize:14, marginBottom:20 }}>Modificá precios de forma individual o masiva.</p>

      {/* MODE SELECTOR */}
      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        <button 
          onClick={() => setPriceMode("individual")}
          style={{ 
            flex:1,
            padding:12,
            borderRadius:10,
            border: priceMode === "individual" ? "2px solid #C41E3A" : "1px solid #E5E7EB",
            background: priceMode === "individual" ? "#C41E3A" : "white",
            color: priceMode === "individual" ? "white" : "#374151",
            fontWeight:600,
            cursor:"pointer",
            fontSize:14
          }}
        >
          🎯 Individual
        </button>
        <button 
          onClick={() => setPriceMode("bulk")}
          style={{ 
            flex:1,
            padding:12,
            borderRadius:10,
            border: priceMode === "bulk" ? "2px solid #C41E3A" : "1px solid #E5E7EB",
            background: priceMode === "bulk" ? "#C41E3A" : "white",
            color: priceMode === "bulk" ? "white" : "#374151",
            fontWeight:600,
            cursor:"pointer",
            fontSize:14
          }}
        >
          📊 Masivo
        </button>
      </div>

      {/* INDIVIDUAL MODE */}
      {priceMode === "individual" && (
        <div>
          <div style={{ marginBottom:16, fontWeight:600, color:"#374151" }}>
            Modificación Individual de Precios
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:400, overflowY:"auto" }}>
            {products.map(p => (
              <div key={p.id} style={{ 
                display:"flex", 
                alignItems:"center", 
                gap:12, 
                padding:12, 
                border:"1px solid #E5E7EB", 
                borderRadius:10,
                background:"#FAFAFA"
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>
                    {p.category}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {editingPrice === p.id ? (
                    <>
                      <input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        placeholder={p.price}
                        style={{ width:100, padding:"6px 10px", border:"1px solid #C41E3A", borderRadius:6, fontSize:14 }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSinglePriceUpdate(p.id, tempPrice)}
                        style={{ background:"#C41E3A", color:"white", border:"none", borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:12 }}
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => { setEditingPrice(null); setTempPrice(""); }}
                        style={{ background:"#6B7280", color:"white", border:"none", borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:12 }}
                      >
                        ❌
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight:700, color:"#C41E3A", minWidth:80, textAlign:"right" }}>
                        ${p.price.toLocaleString("es-AR")}
                      </div>
                      <button
                        onClick={() => { setEditingPrice(p.id); setTempPrice(p.price.toString()); }}
                        style={{ background:"#EFF6FF", border:"none", borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:12 }}
                      >
                        ✏️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BULK MODE */}
      {priceMode === "bulk" && (
        <div>
          <div style={{ marginBottom:16, fontWeight:600, color:"#374151" }}>
            Ajuste Masivo de Precios
          </div>

          {/* CATEGORY FILTER */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:"#374151" }}>
              Categorías (opcional - dejá vacío para afectar a todos)
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {CATS.filter(c => c !== "Todos").map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  style={{
                    padding:"6px 12px",
                    borderRadius:8,
                    border: selectedCategories.includes(category) ? "2px solid #C41E3A" : "1px solid #E5E7EB",
                    background: selectedCategories.includes(category) ? "#C41E3A" : "white",
                    color: selectedCategories.includes(category) ? "white" : "#374151",
                    fontSize:12,
                    fontWeight:600,
                    cursor:"pointer"
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* ADJUSTMENT TYPE */}
          <div style={{ display:"flex", gap:10, marginBottom:20 }}>
            <button
              onClick={() => setBulkType("percentage")}
              style={{
                flex:1,
                padding:10,
                borderRadius:8,
                border: bulkType === "percentage" ? "2px solid #C41E3A" : "1px solid #E5E7EB",
                background: bulkType === "percentage" ? "#C41E3A" : "white",
                color: bulkType === "percentage" ? "white" : "#374151",
                fontWeight:600,
                cursor:"pointer",
                fontSize:13
              }}
            >
              📈 Porcentaje
            </button>
            <button
              onClick={() => setBulkType("fixed")}
              style={{
                flex:1,
                padding:10,
                borderRadius:8,
                border: bulkType === "fixed" ? "2px solid #C41E3A" : "1px solid #E5E7EB",
                background: bulkType === "fixed" ? "#C41E3A" : "white",
                color: bulkType === "fixed" ? "white" : "#374151",
                fontWeight:600,
                cursor:"pointer",
                fontSize:13
              }}
            >
              💰 Valor Fijo
            </button>
          </div>

          {/* VALUE INPUT */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:"#374151" }}>
              {bulkType === "percentage" ? "Porcentaje de ajuste (%)" : "Valor de ajuste ($)"}
            </div>
            <input
              type="number"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder={bulkType === "percentage" ? "Ej: 10 para 10% o -5 para -5%" : "Ej: 100 para agregar $100 o -50 para restar $50"}
              style={input}
            />
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display:"flex", gap:10 }}>
            <button
              onClick={handleBulkPreview}
              disabled={!bulkValue || isNaN(bulkValue)}
              style={{
                flex:1,
                padding:12,
                borderRadius:10,
                border:"1px solid #2563EB",
                background:"#2563EB",
                color:"white",
                fontWeight:600,
                cursor: (!bulkValue || isNaN(bulkValue)) ? "not-allowed" : "pointer",
                fontSize:14,
                opacity: (!bulkValue || isNaN(bulkValue)) ? 0.5 : 1
              }}
            >
              👁️ Vista Previa
            </button>
            <button
              onClick={handleBulkApply}
              disabled={!bulkValue || isNaN(bulkValue)}
              style={{
                flex:1,
                padding:12,
                borderRadius:10,
                border:"1px solid #C41E3A",
                background:"#C41E3A",
                color:"white",
                fontWeight:600,
                cursor: (!bulkValue || isNaN(bulkValue)) ? "not-allowed" : "pointer",
                fontSize:14,
                opacity: (!bulkValue || isNaN(bulkValue)) ? 0.5 : 1
              }}
            >
              ⚡ Aplicar Cambios
            </button>
          </div>

          {/* PREVIEW RESULTS */}
          {previewData && (
            <div style={{ marginTop:24, padding:16, background:"#F0FDF4", borderRadius:12, border:"1px solid #BBF7D0" }}>
              <div style={{ fontWeight:700, color:"#166534", marginBottom:12 }}>
                📊 Vista Previa de Cambios
              </div>
              <div style={{ fontSize:13, color:"#166534", marginBottom:8 }}>
                • {changedProducts.length} de {totalProducts} productos serán modificados
              </div>
              <div style={{ fontSize:13, color:"#166534", marginBottom:16 }}>
                • {selectedCategories.length > 0 ? `Categorías seleccionadas: ${selectedCategories.join(", ")}` : "Todas las categorías"}
              </div>
              
              {/* SAMPLE OF CHANGES */}
              <div style={{ maxHeight:200, overflowY:"auto" }}>
                {changedProducts.slice(0, 5).map(p => (
                  <div key={p.id} style={{ 
                    display:"flex", 
                    justifyContent:"space-between", 
                    alignItems:"center", 
                    padding:"8px 12px", 
                    background:"white", 
                    borderRadius:8, 
                    marginBottom:6,
                    fontSize:12
                  }}>
                    <div>
                      <div style={{ fontWeight:600 }}>{p.name}</div>
                      <div style={{ color:"#9CA3AF" }}>{p.category}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ textDecoration:"line-through", color:"#9CA3AF" }}>
                        ${p.price.toLocaleString("es-AR")}
                      </div>
                      <div style={{ fontWeight:700, color:"#C41E3A" }}>
                        ${p.newPrice.toLocaleString("es-AR")}
                      </div>
                      <div style={{ fontSize:11, color: p.difference > 0 ? "#059669" : "#DC2626" }}>
                        {p.difference > 0 ? "+" : ""}{p.percentageChange}%
                      </div>
                    </div>
                  </div>
                ))}
                {changedProducts.length > 5 && (
                  <div style={{ textAlign:"center", color:"#9CA3AF", fontSize:11, marginTop:8 }}>
                    ... y {changedProducts.length - 5} productos más
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PRICE HISTORY COMPONENT
// ═══════════════════════════════════════════════════════

function PriceHistory({ priceHistory }) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatPrice = (price) => {
    return `$${Number(price).toLocaleString('es-AR')}`;
  };

  return (
    <div style={{ background:"white", borderRadius:16, padding:24 }}>
      <h3 style={{ margin:"0 0 6px", fontWeight:800 }}>📜 Historial de Cambios de Precios</h3>
      <p style={{ color:"#6B7280", fontSize:14, marginBottom:20 }}>
        Registro completo de todos los cambios de precios con fecha y hora.
      </p>

      {priceHistory.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#9CA3AF" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>No hay cambios registrados</div>
          <div style={{ fontSize:13 }}>Los cambios de precios aparecerán aquí cuando los realices</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12, maxHeight:500, overflowY:"auto" }}>
          {priceHistory.map((entry) => (
            <div key={entry.id} style={{ 
              background:"#FAFAFA", 
              borderRadius:12, 
              padding:16, 
              border:"1px solid #E5E7EB" 
            }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ 
                      background: entry.type === 'individual' ? "#EFF6FF" : "#F0FDF4", 
                      color: entry.type === 'individual' ? "#1E40AF" : "#166534",
                      padding:"4px 8px", 
                      borderRadius:6, 
                      fontSize:11, 
                      fontWeight:600 
                    }}>
                      {entry.type === 'individual' ? '🎯 Individual' : '📊 Masivo'}
                    </span>
                    <span style={{ fontSize:13, color:"#6B7280", fontWeight:500 }}>
                      {entry.user}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:"#9CA3AF", fontFamily:"monospace" }}>
                    {formatDate(entry.timestamp)}
                  </div>
                </div>
                {entry.type === 'bulk' && (
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:"#6B7280" }}>
                      {entry.adjustmentType === 'percentage' ? 'Porcentaje' : 'Valor fijo'}
                    </div>
                    <div style={{ fontSize:12, fontWeight:600, color: entry.adjustmentValue > 0 ? "#059669" : "#DC2626" }}>
                      {entry.adjustmentType === 'percentage' 
                        ? `${entry.adjustmentValue > 0 ? '+' : ''}${entry.adjustmentValue}%`
                        : `${entry.adjustmentValue > 0 ? '+' : ''}${formatPrice(entry.adjustmentValue)}`
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              {entry.type === 'individual' ? (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:2 }}>{entry.productName}</div>
                    <div style={{ fontSize:12, color:"#9CA3AF" }}>{entry.category}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ textDecoration:"line-through", color:"#9CA3AF", fontSize:12 }}>
                      {formatPrice(entry.oldPrice)}
                    </div>
                    <div style={{ fontWeight:700, color:"#C41E3A", fontSize:14 }}>
                      {formatPrice(entry.newPrice)}
                    </div>
                    <div style={{ fontSize:11, color: entry.difference > 0 ? "#059669" : "#DC2626" }}>
                      {entry.difference > 0 ? '+' : ''}{entry.percentageChange}%
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:12, color:"#6B7280", marginBottom:8 }}>
                    <strong>{entry.changesCount}</strong> productos afectados
                    {entry.affectedCategories.length > 0 && (
                      <span> · Categorías: {entry.affectedCategories.join(', ')}</span>
                    )}
                  </div>
                  
                  {/* Show first 3 changes as examples */}
                  {entry.changes.slice(0, 3).map((change, idx) => (
                    <div key={idx} style={{ 
                      display:"flex", 
                      justifyContent:"space-between", 
                      alignItems:"center", 
                      padding:"6px 8px", 
                      background:"white", 
                      borderRadius:6, 
                      marginBottom:4,
                      fontSize:11
                    }}>
                      <div>
                        <span style={{ fontWeight:500 }}>{change.productName}</span>
                        <span style={{ color:"#9CA3AF", marginLeft:6 }}>{change.category}</span>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <span style={{ textDecoration:"line-through", color:"#9CA3AF", marginRight:6 }}>
                          {formatPrice(change.oldPrice)}
                        </span>
                        <span style={{ fontWeight:600, color:"#C41E3A" }}>
                          {formatPrice(change.newPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {entry.changes.length > 3 && (
                    <div style={{ textAlign:"center", color:"#9CA3AF", fontSize:11, marginTop:4 }}>
                      ... y {entry.changes.length - 3} productos más
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {priceHistory.length > 0 && (
        <div style={{ marginTop:16, padding:12, background:"#FEF3C7", borderRadius:8, border:"1px solid #FDE68A" }}>
          <div style={{ fontSize:12, color:"#92400E", textAlign:"center" }}>
            📊 Mostrando los últimos {priceHistory.length} cambios · El historial se guarda permanentemente en Supabase
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RESTORE POINTS COMPONENT
// ═══════════════════════════════════════════════════════

function RestorePoints({ restorePoints, onCreateRestorePoint, onRestoreFromPoint }) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const handleCreateRestorePoint = async () => {
    const reason = prompt("¿Por qué querés crear este punto de restauración?", "Backup manual");
    if (reason) {
      await onCreateRestorePoint(reason);
      showToast("✅ Punto de restauración creado", "success");
    }
  };

  return (
    <div style={{ background:"white", borderRadius:16, padding:24 }}>
      <h3 style={{ margin:"0 0 6px", fontWeight:800 }}>🔄 Puntos de Restauración</h3>
      <p style={{ color:"#6B7280", fontSize:14, marginBottom:20 }}>
        Sistema de backup automático y manual para recuperar estados anteriores.
      </p>

      {/* Botón para crear punto de restauración manual */}
      <div style={{ marginBottom:24 }}>
        <button
          onClick={handleCreateRestorePoint}
          style={{
            width:"100%",
            padding:12,
            borderRadius:8,
            border:"1px solid #059669",
            background:"#059669",
            color:"white",
            fontWeight:600,
            cursor:"pointer",
            fontSize:14,
            transition:"background 0.2s"
          }}
          onMouseOver={(e) => e.target.style.background = "#047857"}
          onMouseOut={(e) => e.target.style.background = "#059669"}
        >
          📍 Crear punto de restauración manual
        </button>
        <div style={{ fontSize:11, color:"#059669", marginTop:8, textAlign:"center" }}>
          Crea un backup instantáneo del estado actual
        </div>
      </div>

      {/* Lista de puntos de restauración */}
      {restorePoints.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#9CA3AF" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>No hay puntos de restauración</div>
          <div style={{ fontSize:13 }}>Los puntos de restauración se crearán automáticamente cuando hagas cambios importantes</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12, maxHeight:500, overflowY:"auto" }}>
          {restorePoints.map((point, index) => (
            <div key={point.id} style={{ 
              background:"#FAFAFA", 
              borderRadius:12, 
              padding:16, 
              border:"1px solid #E5E7EB",
              position:"relative"
            }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    {index === 0 && (
                      <span style={{ 
                        background:"#DCFCE7", 
                        color:"#166534",
                        padding:"4px 8px", 
                        borderRadius:6, 
                        fontSize:11, 
                        fontWeight:600 
                      }}>
                        📍 Más reciente
                      </span>
                    )}
                    <span style={{ fontSize:13, color:"#6B7280", fontWeight:500 }}>
                      {point.user}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:"#9CA3AF", fontFamily:"monospace" }}>
                    {formatDate(point.timestamp)}
                  </div>
                </div>
                <button
                  onClick={() => onRestoreFromPoint(point.id)}
                  style={{
                    padding:"6px 12px",
                    borderRadius:6,
                    border:"1px solid #DC2626",
                    background:"#DC2626",
                    color:"white",
                    fontWeight:600,
                    cursor:"pointer",
                    fontSize:12,
                    transition:"background 0.2s"
                  }}
                  onMouseOver={(e) => e.target.style.background = "#B91C1C"}
                  onMouseOut={(e) => e.target.style.background = "#DC2626"}
                >
                  🔄 Restaurar
                </button>
              </div>

              {/* Content */}
              <div>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:8, color:"#374151" }}>
                  {point.reason}
                </div>
                <div style={{ fontSize:12, color:"#6B7280", lineHeight:1.6 }}>
                  <div>📦 Productos: {point.products?.length || 0}</div>
                  <div>📊 Historial: {point.priceHistory?.length || 0} cambios</div>
                </div>
              </div>

              {/* Indicador visual */}
              {index === 0 && (
                <div style={{
                  position:"absolute",
                  top:8,
                  right:8,
                  width:8,
                  height:8,
                  borderRadius:"50%",
                  background:"#059669",
                  animation: "pulse 2s infinite"
                }} />
              )}
            </div>
          ))}
        </div>
      )}

      {restorePoints.length > 0 && (
        <div style={{ marginTop:16, padding:12, background:"#FEF3C7", borderRadius:8, border:"1px solid #FDE68A" }}>
          <div style={{ fontSize:12, color:"#92400E", textAlign:"center" }}>
            📊 {restorePoints.length} puntos de restauración disponibles · Los backups automáticos se crean antes de cambios importantes
          </div>
        </div>
      )}

      {/* Estilos para animación */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════

function AdminPanel({ products, form, setForm, editing, setEditing, adminTab, setAdminTab, onSubmit, onEdit, onDelete, onExcel, fileRef, supaUrl, supaKey, setSupaUrl, setSupaKey, onSync, syncing, onSaveSupa, onReset, onImageSelect, onClearImage, imagePreview, uploadingImage, onMigrate, onUpdateSinglePrice, onUpdateBulkPrices, onPreviewBulkPriceChanges, priceHistory, onMigrateImages, onSyncProducts, restorePoints, onCreateRestorePoint, onRestoreFromPoint }) {
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
        {[["list","📋 Productos"],["add", editing?"✏️ Editar":"➕ Agregar"],["prices","💰 Precios"],["history","📜 Historial"],["restore","🔄 Restauración"],["excel","📊 Excel"]].map(([t,label]) => (
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
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {products && products.length > 0 ? (
              products.filter(Boolean).map(p => (
              <div key={p.id} style={{ background:"white", borderRadius:12, padding:"12px 16px", display:"flex", gap:12, alignItems:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ width:46, height:46, borderRadius:10, background:`${CAT_COLOR[p?.category]||"#C41E3A"}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, overflow:"hidden" }}>
                  {p?.image_url ? <img src={p?.image_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" onError={e => { e.target.src = "https://via.placeholder.com/46x46/f5a623/ffffff?text=SF"; }} /> : (CAT_EMOJI[p?.category]||"🍖")}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p?.name || "Sin nombre"}</div>
                  <div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>{p?.category} · <strong style={{ color:"#C41E3A" }}>{fmt(p?.price || 0)}</strong></div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={() => onEdit(p)} style={{ background:"#EFF6FF", border:"none", borderRadius:8, padding:"7px 11px", cursor:"pointer", fontSize:14 }}>✏️</button>
                  <button onClick={() => {
                    if (window.confirm(`¿Estás seguro que querés borrar "${p?.name || 'este producto'}"?\n\nEsta acción no se puede deshacer.`)) {
                      onDelete(p.id);
                    }
                  }} style={{ background:"#FEE2E2", border:"none", borderRadius:8, padding:"7px 11px", cursor:"pointer", fontSize:14 }}>🗑️</button>
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
              <input 
                type="url" 
                value={form.image_url} 
                onChange={e => {
                  setForm({...form, image_url: e.target.value});
                  if (e.target.value.trim()) {
                    saveImagePreview(e.target.value);
                  } else {
                    saveImagePreview(null);
                  }
                }} 
                style={{...input, marginBottom:10}} 
                placeholder="https://ejemplo.com/imagen.jpg (opcional)" 
              />
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
          
          {/* BOTÓN TEMPORAL DE PRUEBA */}
          <div style={{ marginTop:20, padding:15, background:"#F0F9FF", borderRadius:8, border:"1px solid #3B82F6" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#1E40AF", marginBottom:8 }}>🧪 PRUEBA DE INSERCIÓN</div>
            <button 
              onClick={() => {
                // Llenar formulario con datos de prueba
                setForm({
                  id: "",
                  category: "Frescos",
                  name: "Producto de Prueba " + Date.now(),
                  description: "Este es un producto de prueba para verificar upload y persistencia",
                  price: "10000",
                  bulkInfo: "Test bulk info",
                  image_url: ""
                });
                setEditing(false);
              }}
              style={{ 
                background:"#3B82F6", 
                color:"white", 
                border:"none", 
                borderRadius:6, 
                padding:"8px 12px", 
                cursor:"pointer", 
                fontSize:12,
                width:"100%"
              }}
            >
              🧪 Llenar con datos de prueba
            </button>
            <div style={{ fontSize:10, color:"#64748B", marginTop:5 }}>
              Completa el formulario y agrega una imagen para probar el flujo completo
            </div>
          </div>
        </div>
      )}

      {/* TAB: PRICES */}
      {adminTab === "prices" && (
        <PriceManagement 
          products={products}
          onUpdateSinglePrice={onUpdateSinglePrice}
          onUpdateBulkPrices={onUpdateBulkPrices}
          onPreviewBulkPriceChanges={onPreviewBulkPriceChanges}
          priceHistory={priceHistory}
        />
      )}

      {/* TAB: HISTORY */}
      {adminTab === "history" && (
        <PriceHistory priceHistory={priceHistory} />
      )}

      {/* TAB: RESTORE */}
      {adminTab === "restore" && (
        <RestorePoints 
          restorePoints={restorePoints}
          onCreateRestorePoint={onCreateRestorePoint}
          onRestoreFromPoint={onRestoreFromPoint}
        />
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
