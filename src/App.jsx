import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSupabaseClient } from './supabaseClient';
import { useMasterUser } from './useMasterUser';
import { AnimatePresence, motion } from 'framer-motion';
import BannerSection from './BannerSection';
import MercadoPagoCheckout from './MercadoPagoCheckout';
import { 
  toTitleCase, 
  suggestCategory, 
  isValidCategory, 
  categoryExists, 
  createCategory, 
  getAvailableCategories, 
  addCategoryToSupabase,
  deleteCategoryFromSupabase,
  hideCategoryFromShop 
} from './categoryManager';

// ═══════════════════════════════════════════════════════
// DATA & CONSTANTS
// ═══════════════════════════════════════════════════════

const CATS = ["Todos","Frescos","Completos","Panchos Armados","Hamburguesas","Pizzas y Empanadas","Medialunas y Chipas","Combos"];
const ADMIN_CATS = CATS.filter(c => c !== "Todos");
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
  const [form, setForm] = useState({ id:"", category:"", name:"", description:"", price:"", bulkInfo:"", image_url:"", custom_badge:"" });
  const [editing, setEditing] = useState(false);
  
  // Estados para manejo mejorado de categorías
  const [availableCategories, setAvailableCategories] = useState([]);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Estados para configuración de pago
  const [paymentSettings, setPaymentSettings] = useState({
    id: null,
    account_name: '',
    bank_name: '',
    cbu: '',
    alias: '',
    titular: '',
    banco: '',
    mp_enabled: false,
    transfer_enabled: false,
    extra_message: 'Una vez pagado, enviá el comprobante por mensaje 📩',
    is_active: true
  });
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  
  // Estados para banners
  const [banners, setBanners] = useState([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    id: '',
    title: '',
    description: '',
    image_url: '',
    link: '',
    active: true
  });
  const [editingBanner, setEditingBanner] = useState(false);
  const [bannerImagePreview, setBannerImagePreview] = useState(null);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  
  // Estados para Mercado Pago
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  
  const [supaUrl, setSupaUrl] = useState("");
  const [supaKey, setSupaKey] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Estados para filtros del panel admin
  const [adminFilters, setAdminFilters] = useState({
    searchTerm: '',
    category: '',
    status: 'all'
  });
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Función para manejar suspensión/activación de productos
  const toggleProductSuspension = async (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newSuspendedState = !product.suspended;
    const action = newSuspendedState ? 'suspender' : 'activar';
    
    // Confirmación del usuario
    const confirmed = window.confirm(
      `¿Estás seguro que querés ${action} el producto "${product.name}"?\n\n` +
      `${newSuspendedState ? '⚠️ El producto no será visible en la tienda pública' : '✅ El producto volverá a estar disponible en la tienda'}`
    );
    
    if (!confirmed) return;
    
    try {
      const supabase = getSupabaseClient();
      
      // Actualizar en Supabase
      if (supabase) {
        const { error } = await supabase
          .from('products')
          .update({ suspended: newSuspendedState })
          .eq('id', productId);
        
        if (error) throw error;
      }
      
      // Actualizar estado local
      const updatedProducts = products.map(p => 
        p.id === productId ? { ...p, suspended: newSuspendedState } : p
      );
      await saveProducts(updatedProducts);
      
      showToast(
        newSuspendedState 
          ? `⏸️ Producto "${product.name}" suspendido`
          : `✅ Producto "${product.name}" activado`,
        'success'
      );
    } catch (error) {
      console.error('Error al cambiar estado de suspensión:', error);
      showToast('❌ Error al cambiar estado del producto', 'error');
    }
  };

  // Función para filtrar productos del panel admin
  const filterAdminProducts = (products, filters) => {
    return products.filter(product => {
      if (!product) return false;
      
      // Filtro por nombre
      if (filters.searchTerm && !product.name?.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro por categoría
      if (filters.category && product.category !== filters.category) {
        return false;
      }
      
      // Filtro por estado (activo/inactivo/suspendido)
      if (filters.status === 'active' && (product.suspended || !product.active)) {
        return false;
      }
      if (filters.status === 'inactive' && (!product.suspended && product.active)) {
        return false;
      }
      if (filters.status === 'suspended' && !product.suspended) {
        return false;
      }
      
      return true;
    });
  };

  // Efecto para cargar categorías y configuración de pago
  useEffect(() => {
    loadAvailableCategories();
    loadPaymentSettingsSafe(); // Cargar solo si está vacío
  }, []);

  // Efecto para actualizar productos filtrados
  useEffect(() => {
    const filtered = filterAdminProducts(products, adminFilters);
    setFilteredProducts(filtered);
  }, [products, adminFilters]);

  // Event listeners para filtros del panel admin
  useEffect(() => {
    // Inicializar variables globales
    window.adminSearchTerm = '';
    window.adminCategoryFilter = '';
    window.adminStatusFilter = 'all';
    
    const handleSearch = (e) => {
      setAdminFilters(prev => ({ ...prev, searchTerm: e.detail.searchTerm }));
    };
    
    const handleCategoryFilter = (e) => {
      setAdminFilters(prev => ({ ...prev, category: e.detail.category }));
    };
    
    const handleStatusFilter = (e) => {
      setAdminFilters(prev => ({ ...prev, status: e.detail.status }));
    };
    
    const handleClearFilters = () => {
      setAdminFilters({ searchTerm: '', category: '', status: 'all' });
      window.adminSearchTerm = '';
      window.adminCategoryFilter = '';
      window.adminStatusFilter = 'all';
    };
    
    // Agregar event listeners
    window.addEventListener('adminSearch', handleSearch);
    window.addEventListener('adminCategoryFilter', handleCategoryFilter);
    window.addEventListener('adminStatusFilter', handleStatusFilter);
    window.addEventListener('adminClearFilters', handleClearFilters);
    
    // Cleanup
    return () => {
      window.removeEventListener('adminSearch', handleSearch);
      window.removeEventListener('adminCategoryFilter', handleCategoryFilter);
      window.removeEventListener('adminStatusFilter', handleStatusFilter);
      window.removeEventListener('adminClearFilters', handleClearFilters);
    };
  }, []);
  
  // Cache de categorías para no consultar en cada guardado
  const categoryCacheRef = useRef({});

  // Obtener category_id desde el nombre de categoría
  const getCategoryId = async (supabase, categoryName) => {
    if (categoryCacheRef.current[categoryName]) {
      return categoryCacheRef.current[categoryName];
    }
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();
      if (error || !data) {
        console.warn('⚠️ Categoría no encontrada en Supabase:', categoryName);
        return null;
      }
      categoryCacheRef.current[categoryName] = data.id;
      return data.id;
    } catch (err) {
      console.error('Error buscando categoría:', err);
      return null;
    }
  };

  // Cargar configuración de pago desde Supabase (solo si está vacío)
  const loadPaymentSettingsSafe = useCallback(async () => {
    // Si ya hay datos cargados, no recargar
    if (paymentSettings && paymentSettings.id !== null) {
      console.log('🔥 PaymentSettings ya cargados, omitiendo...');
      return;
    }
    
    try {
      setLoadingPaymentSettings(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Cliente de Supabase no disponible');
        return;
      }
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();
      if (error) {
        console.error('Error cargando configuración de pago:', error);
        return;
      }
      if (data) {
        setPaymentSettings({
          id: data.id,
          account_name: data.account_name || data.titular || '',
          bank_name: data.bank_name || data.banco || '',
          cbu: data.cbu || '',
          alias: data.alias || '',
          titular: data.titular || data.account_name || '',
          banco: data.banco || data.bank_name || '',
          mp_enabled: data.mp_enabled !== undefined ? data.mp_enabled : false,
          transfer_enabled: data.transfer_enabled !== undefined ? data.transfer_enabled : false,
          extra_message: data.extra_message || 'Una vez pagado, enviá el comprobante por mensaje 📩'
        });
      }
    } catch (error) {
      console.error('Error cargando configuración de pago:', error);
    } finally {
      setLoadingPaymentSettings(false);
    }
  }, [paymentSettings]); // Dependency para verificar si hay datos

  // Cargar configuración de pago desde Supabase
  const loadPaymentSettings = useCallback(async () => {
    try {
      setLoadingPaymentSettings(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Cliente de Supabase no disponible');
        return;
      }
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();
      if (error) {
        console.error('Error cargando configuración de pago:', error);
        return;
      }
      if (data) {
        setPaymentSettings({
          id: data.id,
          account_name: data.account_name || data.titular || '',
          bank_name: data.bank_name || data.banco || '',
          cbu: data.cbu || '',
          alias: data.alias || '',
          titular: data.titular || data.account_name || '',
          banco: data.banco || data.bank_name || '',
          mp_enabled: data.mp_enabled !== undefined ? data.mp_enabled : false,
          transfer_enabled: data.transfer_enabled !== undefined ? data.transfer_enabled : false,
          extra_message: data.extra_message || 'Una vez pagado, enviá el comprobante por mensaje 📩'
        });
      }
    } catch (error) {
      console.error('Error cargando configuración de pago:', error);
    } finally {
      setLoadingPaymentSettings(false);
    }
  }, []); // Empty dependency array to prevent recreation

  const savePaymentSettings = async () => {
  try {
    console.log('Guardando...', paymentSettings);
    const supabase = getSupabaseClient();
    if (!supabase) {
      alert('❌ Error: Cliente de Supabase no disponible');
      return;
    }
    const { error } = await supabase
      .from('payment_settings')
      .update({
        account_name: paymentSettings.account_name,
        bank_name: paymentSettings.bank_name,
        cbu: paymentSettings.cbu,
        alias: paymentSettings.alias,
        titular: paymentSettings.titular,
        banco: paymentSettings.banco,
        mp_enabled: paymentSettings.mp_enabled,
        transfer_enabled: paymentSettings.transfer_enabled,
        extra_message: paymentSettings.extra_message
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // actualiza la única fila existente

    if (error) throw error;
    alert('✅ Guardado correctamente');
  } catch (error) {
    console.error('Error guardando:', error.message);
    alert('❌ Error: ' + error.message);
  }
};

  // Función para copiar al portapapeles
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`¡Copiaste el ${type}! ✅`, 'success');
      
      // Si es CBU o Alias, marcar que se copiaron datos bancarios
      if (type === 'CBU' || type === 'Alias') {
        setHasCopiedBankData(true);
      }
      
      // Auto-ocultar el toast después de 3 segundos
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast(`¡Copiaste el ${type}! ✅`, 'success');
      
      // Si es CBU o Alias, marcar que se copiaron datos bancarios
      if (type === 'CBU' || type === 'Alias') {
        setHasCopiedBankData(true);
      }
      
      // Auto-ocultar el toast después de 3 segundos
      setTimeout(() => {
        setToast(null);
      }, 3000);
    }
  };

  // Cargar categorías disponibles desde Supabase
  const loadAvailableCategories = async () => {
    setLoadingCategories(true);
    try {
      const supabase = getSupabaseClient();
      const categories = await getAvailableCategories(supabase);
      setAvailableCategories(categories);
      
      // Si no hay categoría seleccionada y hay categorías disponibles, seleccionar la primera
      if (!form.category && categories.length > 0) {
        setForm(prev => ({ ...prev, category: categories[0] }));
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      showToast('⚠️ Error cargando categorías', 'error');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Analizar nombre de producto y sugerir categoría automáticamente
  const handleProductNameChange = (productName) => {
    setForm(prev => ({ ...prev, name: productName }));
    
    // Analizar el nombre para sugerir categoría
    const suggestion = suggestCategory(productName);
    setSuggestedCategory(suggestion);
    
    // Si hay una sugerencia y no hay categoría seleccionada, aplicarla automáticamente
    if (suggestion && !form.category) {
      setForm(prev => ({ ...prev, category: suggestion }));
      setCategoryError(''); // Limpiar error
    }
  };

  // Validar categoría seleccionada
  const validateCategory = (category) => {
    if (!category || category.trim() === '') {
      setCategoryError('Por favor, asigne una categoría para continuar');
      return false;
    }
    
    if (!isValidCategory(category, availableCategories)) {
      setCategoryError('La categoría seleccionada no es válida');
      return false;
    }
    
    setCategoryError('');
    return true;
  };

  // Manejar cambio de categoría
  const handleCategoryChange = (category) => {
    setForm(prev => ({ ...prev, category }));
    validateCategory(category);
    setSuggestedCategory(null); // Limpiar sugerencia cuando el usuario selecciona manualmente
  };

  // Agregar nueva categoría
  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      setCategoryError('Por favor ingrese un nombre para la nueva categoría');
      return;
    }
    
    // Verificar si ya existe
    if (categoryExists(newCategoryName, availableCategories)) {
      setCategoryError('Esta categoría ya existe');
      return;
    }
    
    try {
      const supabase = getSupabaseClient();
      const categoryId = await addCategoryToSupabase(supabase, newCategoryName);
      
      if (categoryId) {
        const normalizedCategory = toTitleCase(newCategoryName.trim());
        
        // Recargar categorías desde Supabase para asegurar sincronización
        await loadAvailableCategories();
        
        setForm(prev => ({ ...prev, category: normalizedCategory }));
        setNewCategoryName('');
        setShowNewCategoryInput(false);
        setCategoryError('');
        showToast(`✅ Categoría "${normalizedCategory}" agregada exitosamente`, 'success');
      } else {
        setCategoryError('Error al crear la categoría');
      }
    } catch (error) {
      console.error('Error agregando categoría:', error);
      setCategoryError('Error al crear la categoría');
    }
  };

  // Cancelar agregación de categoría
  const cancelNewCategory = () => {
    setNewCategoryName('');
    setShowNewCategoryInput(false);
    setCategoryError('');
  };

  // Ocultar categoría de la tienda (si no tiene productos)
  const handleHideCategory = async (categoryName) => {
    if (!categoryName) return;
    
    try {
      const supabase = getSupabaseClient();
      const success = await hideCategoryFromShop(supabase, categoryName);
      
      if (success) {
        // Recargar categorías para reflejar el cambio
        await loadAvailableCategories();
        
        // Si la categoría estaba seleccionada en la tienda, cambiar a "Todos"
        if (cat === categoryName) {
          setCat('Todos');
        }
        
        // Si la categoría estaba seleccionada en admin, limpiar selección
        if (form.category === categoryName) {
          setForm(prev => ({ ...prev, category: '' }));
          setCategoryError('Por favor, seleccione una categoría');
        }
        
        showToast(`👁️ Categoría "${categoryName}" oculta en la tienda`, 'success');
      } else {
        showToast('❌ Error al ocultar la categoría', 'error');
      }
    } catch (error) {
      console.error('Error ocultando categoría:', error);
      showToast('❌ Error al ocultar la categoría', 'error');
    }
  };

  // Eliminar categoría completamente (desde admin)
  const handleDeleteCategory = async (categoryName) => {
    if (!categoryName) return;
    
    // Confirmación del usuario
    const confirmed = window.confirm(
      `¿Estás seguro que querés ELIMINAR COMPLETAMENTE la categoría "${categoryName}"?\n\n` +
      `⚠️ Esta acción eliminará la categoría permanentemente de la base de datos.`
    );
    
    if (!confirmed) return;
    
    try {
      const supabase = getSupabaseClient();
      const success = await deleteCategoryFromSupabase(supabase, categoryName);
      
      if (success) {
        // Recargar categorías para reflejar el cambio
        await loadAvailableCategories();
        
        // Si la categoría estaba seleccionada en la tienda, cambiar a "Todos"
        if (cat === categoryName) {
          setCat('Todos');
        }
        
        // Si la categoría estaba seleccionada en admin, limpiar selección
        if (form.category === categoryName) {
          setForm(prev => ({ ...prev, category: '' }));
          setCategoryError('Por favor, seleccione una categoría');
        }
        
        showToast(`🗑️ Categoría "${categoryName}" eliminada permanentemente`, 'success');
      } else {
        showToast('⚠️ No se puede eliminar la categoría: está siendo usada por productos', 'error');
      }
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      showToast('❌ Error al eliminar la categoría', 'error');
    }
  };
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
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);
  const [priceHistoryError, setPriceHistoryError] = useState(null);
  const [restorePoints, setRestorePoints] = useState([]);
  const [loadingRestorePoints, setLoadingRestorePoints] = useState(false);
  const [restorePointsError, setRestorePointsError] = useState(null);

  // Usar hook de usuarios maestros
  const { 
    user, 
    isMaster, 
    loading: authLoading, 
    signIn, 
    signOut 
  } = useMasterUser();

  // Estados para formulario de login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localAuthLoading, setLocalAuthLoading] = useState(false);

  // Verificar acceso administrativo
  const hasAdminAccess = true;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Memos para cálculos dinámicos
  const filtered = useMemo(() => {
    console.log("🔍 Debug - products.length:", products.length);
    console.log("🔍 Debug - products sample:", products.slice(0, 3));
    console.log("🔍 Debug - cat:", cat);
    console.log("🔍 Debug - searchTerm:", searchTerm);
    console.log("🔍 Debug - priceRange:", priceRange);
    
    let filtered = products.filter(p => 
      p && typeof p === 'object' && p.id && (
        cat === "Todos" || p.category === cat
      ) && !p.suspended // Filtrar productos suspendidos en tienda pública
    );
    
    console.log("🔍 Debug - filtered after basic filter:", filtered.length);
    console.log("🔍 Debug - suspended products:", products.filter(p => p.suspended).length);

    // Aplicar filtros de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log("🔍 Debug - filtered after search:", filtered.length);
    }

    // Aplicar filtros de precio
    if (priceRange.min) {
      filtered = filtered.filter(p => p.price >= parseFloat(priceRange.min));
      console.log("🔍 Debug - filtered after min price:", filtered.length);
    }
    if (priceRange.max) {
      filtered = filtered.filter(p => p.price <= parseFloat(priceRange.max));
      console.log("🔍 Debug - filtered after max price:", filtered.length);
    }

    console.log("🔍 Debug - final filtered result:", filtered.length);
    return filtered;
  }, [products, cat, searchTerm, priceRange]);

  const totalPages = useMemo(() => Math.ceil(filtered.length / itemsPerPage), [filtered.length, itemsPerPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage, itemsPerPage]);

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

  // Funciones de autenticación con Supabase
  const handleLogin = async () => {
    if (!email || !password) return showToast("⚠️ Email y contraseña son requeridos", "error");
    
    setLocalAuthLoading(true);
    try {
      await signIn(email, password);
      
      if (isMaster) {
        showToast("✅ Sesión iniciada como usuario maestro", "success");
      } else {
        showToast("✅ Sesión iniciada correctamente", "success");
      }
      
      // Limpiar formulario
      setEmail("");
      setPassword("");
      
    } catch (error) {
      console.error("Error en login:", error);
      if (error.message?.includes("Invalid login credentials")) {
        showToast("❌ Email o contraseña incorrectos", "error");
      } else if (error.message?.includes("Email not confirmed")) {
        showToast("❌ Por favor confirma tu email antes de iniciar sesión", "error");
      } else {
        showToast("❌ Error al iniciar sesión: " + error.message, "error");
      }
    } finally {
      setLocalAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setEmail("");
      setPassword("");
      showToast("👋 Sesión cerrada", "success");
    } catch (error) {
      console.error("Error en logout:", error);
      showToast("❌ Error al cerrar sesión", "error");
    }
  };

  // ═══════════════════════════════════════════════════════
  // FUNCIONES PARA MANEJO DE BANNERS
  // ═══════════════════════════════════════════════════════

  // Cargar banners desde Supabase
  const loadBannersFromSupabase = async () => {
    setLoadingBanners(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('Cliente de Supabase no disponible para banners');
        return;
      }

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        // Manejo graceful de errores de banners - sin logs ni warnings
        if (error.code === 'PGRST116' || error.code === '42501') {
          // Tabla no existe o permisos denegados - setear array vacío silenciosamente
          setBanners([]);
        } else {
          // Otros errores - también setear array vacío silenciosamente
          setBanners([]);
        }
        return;
      }

      if (data) {
        setBanners(data);
        console.log(`✅ ${data.length} banners cargados desde Supabase`);
      }
    } catch (error) {
      // Manejo graceful de errores inesperados - sin logs
      setBanners([]);
    } finally {
      setLoadingBanners(false);
    }
  };

  // Subir imagen de banner a Supabase Storage
  const uploadBannerImageToSupabase = async (file) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      showToast('⚠️ Configuración de Supabase requerida', 'error');
      return null;
    }

    try {
      setUploadingBannerImage(true);
      
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `banners/${fileName}`;
      
      // Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from('banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      showToast('✅ Imagen de banner subida exitosamente', 'success');
      return publicUrl;
      
    } catch (error) {
      console.error('Error subiendo imagen de banner:', error);
      showToast('❌ Error al subir la imagen: ' + error.message, 'error');
      return null;
    } finally {
      setUploadingBannerImage(false);
    }
  };

  // Guardar banner en Supabase
  const saveBannerToSupabase = async (banner) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      showToast('⚠️ Configuración de Supabase requerida', 'error');
      return null;
    }

    try {
      if (editingBanner) {
        // Actualizar banner existente
        const { data, error } = await supabase
          .from('banners')
          .update({
            title: banner.title,
            description: banner.description,
            image_url: banner.image_url,
            link: banner.link,
            active: banner.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', banner.id)
          .select()
          .single();

        if (error) throw error;
        return data.id;
      } else {
        // Crear nuevo banner
        const { data, error } = await supabase
          .from('banners')
          .insert({
            title: banner.title,
            description: banner.description,
            image_url: banner.image_url,
            link: banner.link,
            active: banner.active,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return data.id;
      }
    } catch (error) {
      console.error('Error guardando banner:', error);
      showToast('❌ Error guardando banner: ' + error.message, 'error');
      return null;
    }
  };

  // Eliminar banner
  const deleteBanner = async (id) => {
    if (!confirm('¿Estás seguro que querés eliminar este banner?')) return;
    
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        showToast('⚠️ Configuración de Supabase requerida', 'error');
        return;
      }

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Actualizar estado local
      const updatedBanners = banners.filter(b => b.id !== id);
      setBanners(updatedBanners);
      
      showToast('🗑️ Banner eliminado', 'success');
    } catch (error) {
      console.error('Error eliminando banner:', error);
      showToast('❌ Error eliminando banner', 'error');
    }
  };

  // Manejar selección de imagen de banner
  const handleBannerImageSelect = async (e) => {
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
      
      // Subir imagen a Supabase
      const uploadedUrl = await uploadBannerImageToSupabase(file);
      if (uploadedUrl) {
        setBannerForm(prev => ({ ...prev, image_url: uploadedUrl }));
        setBannerImagePreview(uploadedUrl);
      }
    }
  };

  // Limpiar vista previa de banner
  const clearBannerImagePreview = () => {
    setBannerImagePreview(null);
    setBannerForm(prev => ({ ...prev, image_url: '' }));
  };

  // Guardar formulario de banner
  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    
    if (!bannerForm.image_url) {
      showToast('⚠️ Por favor agregá una imagen para el banner', 'error');
      return;
    }

    try {
      const bannerId = await saveBannerToSupabase(bannerForm);
      
      if (bannerId) {
        if (editingBanner) {
          // Actualizar banner en la lista
          const updatedBanners = banners.map(b => 
            b.id === bannerForm.id ? { ...bannerForm, id: bannerId } : b
          );
          setBanners(updatedBanners);
          showToast('✏️ Banner actualizado', 'success');
        } else {
          // Agregar nuevo banner a la lista
          const newBanner = { ...bannerForm, id: bannerId };
          setBanners(prev => [...prev, newBanner]);
          showToast('🎉 Banner agregado', 'success');
        }

        // Resetear formulario
        setBannerForm({
          id: '',
          title: '',
          description: '',
          image_url: '',
          link: '',
          active: true
        });
        setEditingBanner(false);
        setBannerImagePreview(null);
      }
    } catch (error) {
      console.error('Error guardando banner:', error);
      showToast('❌ Error guardando banner', 'error');
    }
  };

  // Editar banner
  const startEditBanner = (banner) => {
    setBannerForm({
      id: banner.id,
      title: banner.title || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      link: banner.link || '',
      active: banner.active
    });
    setEditingBanner(true);
    setBannerImagePreview(banner.image_url || null);
  };

  // ═══════════════════════════════════════════════════════
  // FUNCIONES PARA MERCADO PAGO
  // ═══════════════════════════════════════════════════════

  // Manejar éxito del pago
  const handleMercadoPagoSuccess = (response) => {
    console.log('✅ Pago exitoso:', response);
    setPaymentProcessing(false);
    setPaymentCompleted(true);
    showToast('🎉 ¡Pago realizado con éxito! Te contactaremos pronto.', 'success');
    
    // Limpiar carrito después de un pago exitoso
    setTimeout(() => {
      saveCart([]);
      setCartOpen(false);
      setPaymentCompleted(false);
    }, 3000);
  };

  // Manejar error del pago
  const handleMercadoPagoError = (error) => {
    console.error('❌ Error en el pago:', error);
    setPaymentProcessing(false);
    showToast('❌ Hubo un error al procesar el pago. Por favor, intenta nuevamente.', 'error');
  };

  // Iniciar proceso de pago
  const handleMercadoPagoStart = () => {
    if (cart.length === 0) {
      showToast('⚠️ El carrito está vacío', 'error');
      return;
    }
    setPaymentProcessing(true);
  };

  useEffect(() => {
  const initApp = async () => {
    setLoading(true);
    console.log("🚀 Arrancando App...");

    try {
      // Cargar categorías disponibles primero
      await loadAvailableCategories();
      
      // Intentar carga de Supabase
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
      
      const supaConfig = getStorageItem("roxy_supa");
      if (supaConfig) {
        setSupaUrl(supaConfig.url || "");
        setSupaKey(supaConfig.key || "");
      }
      
      // Cargar puntos de restauración desde Supabase
      await loadRestorePointsFromSupabase();
      
      // Cargar historial de precios desde Supabase
      await loadPriceHistoryFromSupabase();
      
      // Cargar banners desde Supabase
      await loadBannersFromSupabase();
      
    } catch (err) {
      console.error("❌ Error en la inicialización:", err);
    } finally {
      setLoading(false);
    }
  };

  initApp();
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
  const savePriceHistory = async (h) => { setPriceHistory(h); }; // Removed localStorage usage
  const saveRestorePoints = async (rp) => { 
    // Ya no usamos localStorage para restore points, van a Supabase
    setRestorePoints(rp); 
  };
  const saveImagePreview = async (preview) => { setImagePreview(preview); setStorageItem("roxy_image_preview", preview); };

  // Funciones para persistir en Supabase
  const saveProductToSupabase = async (product) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Configuración de Supabase no disponible');
      return false;
    }

    try {
      // ✅ FIX PRINCIPAL: Resolver category_id desde el nombre de categoría
      const categoryId = await getCategoryId(supabase, product.category);

      // Construir objeto a guardar según el esquema real de Supabase
      const productData = {
        name: product.name,
        description: product.description || '',
        price: product.price,
        bulk_info: product.bulkInfo || '',
        image_url: product.image_url || '',
        custom_badge: product.custom_badge || '',
        active: true,
        suspended: false,
      };

      // Solo incluir category_id si fue encontrado
      if (categoryId) {
        productData.category_id = categoryId;
      }

      let result;

      // Si el ID parece un UUID real de Supabase (36 chars con guiones), hacer upsert
      // Si es un ID local generado por la app (prod_XXX, xl_XXX), hacer insert
      const isSupabaseId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);

      if (isSupabaseId) {
        // UPDATE: producto ya existe en Supabase
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
          .select()
          .single();
      } else {
        // INSERT: producto nuevo, dejar que Supabase genere el UUID
        result = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      console.log('✅ Producto guardado en Supabase:', product.name, result.data);

      // ✅ Si era un producto nuevo, devolver el nuevo ID de Supabase
      // para que el estado local quede sincronizado
      if (!isSupabaseId && result.data?.id) {
        return result.data.id; // nuevo UUID de Supabase
      }

      return true;
    } catch (error) {
      console.error('Error guardando producto en Supabase:', error.message, error);
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
        product_id: historyEntry.productId,
        product_name: historyEntry.productName,
        old_price: historyEntry.oldPrice,
        new_price: historyEntry.newPrice,
        changed_by: historyEntry.user || user?.email || 'unknown'
      };

      const { data, error } = await supabase
        .from('price_history')
        .insert(entryData);

      if (error) throw error;
      console.log('✅ Historial guardado en Supabase:', historyEntry.productName);
      return true;
    } catch (error) {
      console.error('Error guardando historial en Supabase:', error);
      throw error;
    }
  };

  // ⚠️ ELIMINADO: syncProductsWithSupabase para evitar sobrescribir datos de Supabase
// La sincronización ahora solo ocurre individualmente en handleFormSubmit
// const syncProductsWithSupabase = async (productsToSync) => { ... };

  const loadPriceHistoryFromSupabase = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Configuración de Supabase no disponible para historial de precios');
      setPriceHistoryError('Configuración de Supabase no disponible');
      return;
    }

    setLoadingPriceHistory(true);
    setPriceHistoryError(null);

    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        // Convertir datos al formato local
        const localHistory = data.map(entry => ({
          id: entry.id,
          timestamp: entry.created_at,
          productId: entry.product_id,
          productName: entry.product_name,
          oldPrice: entry.old_price,
          newPrice: entry.new_price,
          user: entry.changed_by,
          type: 'individual', // Todos los registros son individuales en la nueva tabla
          category: '', // No se guarda categoría en la nueva tabla
          difference: entry.new_price - entry.old_price,
          percentageChange: ((entry.new_price - entry.old_price) / entry.old_price * 100).toFixed(2)
        }));

        setPriceHistory(localHistory);
        console.log(`📊 Historial cargado desde Supabase: ${data.length} cambios`);
      } else {
        setPriceHistory([]);
        console.log('📊 No hay historial de precios en Supabase');
      }
    } catch (error) {
      console.error('Error cargando historial desde Supabase:', error);
      setPriceHistoryError('Error al cargar historial de precios');
    } finally {
      setLoadingPriceHistory(false);
    }
  };

  // Sistema de Backup y Restauración
  // Cargar puntos de restauración desde Supabase
  const loadRestorePointsFromSupabase = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Configuración de Supabase no disponible para restore points');
      return;
    }

    setLoadingRestorePoints(true);
    setRestorePointsError(null);

    try {
      const { data, error } = await supabase
        .from('restoration_points')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando puntos de restauración:', error);
        setRestorePointsError('Error al cargar puntos de restauración');
        return;
      }

      // Transformar datos de Supabase al formato esperado
      const transformedPoints = data.map(point => ({
        id: point.id,
        timestamp: point.created_at,
        reason: point.name,
        description: point.description,
        products: point.snapshot?.products || [],
        priceHistory: point.snapshot?.priceHistory || [],
        user: point.snapshot?.user || 'unknown'
      }));

      setRestorePoints(transformedPoints);
      console.log(`✅ Cargados ${transformedPoints.length} puntos de restauración desde Supabase`);

    } catch (error) {
      console.error('Error inesperado cargando restore points:', error);
      setRestorePointsError('Error inesperado al cargar puntos de restauración');
    } finally {
      setLoadingRestorePoints(false);
    }
  };

  // Crear punto de restauración en Supabase
  const createRestorePoint = async (reason) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Configuración de Supabase no disponible para restore points');
      showToast('❌ Error: Supabase no disponible', 'error');
      return;
    }

    if (!user) {
      showToast('❌ Error: Usuario no autenticado', 'error');
      return;
    }

    try {
      // Crear snapshot del estado actual
      const snapshot = {
        products: JSON.parse(JSON.stringify(products)), // Deep copy
        priceHistory: JSON.parse(JSON.stringify(priceHistory)), // Deep copy
        user: user?.email || 'unknown'
      };

      // Insertar en Supabase
      const { data, error } = await supabase
        .from('restoration_points')
        .insert({
          name: reason,
          description: `Backup automático - ${reason}`,
          snapshot: snapshot,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Mensaje:', error?.message);
        console.error('Código:', error?.code);
        console.error('Detalle:', error?.details);
        console.error('Hint:', error?.hint);
        console.error('Error completo:', JSON.stringify(error, null, 2));
        showToast('❌ Error al crear punto de restauración', 'error');
        return;
      }

      // Transformar y agregar a la lista local
      const newPoint = {
        id: data.id,
        timestamp: data.created_at,
        reason: data.name,
        description: data.description,
        products: data.snapshot?.products || [],
        priceHistory: data.snapshot?.priceHistory || [],
        user: data.snapshot?.user || 'unknown'
      };

      const newRestorePoints = [newPoint, ...restorePoints];
      setRestorePoints(newRestorePoints);
      
      console.log('📍 Punto de restauración creado en Supabase:', reason);
      showToast('✅ Punto de restauración creado', 'success');

    } catch (error) {
      console.error('Error inesperado creando restore point:', error);
      showToast('❌ Error inesperado al crear punto de restauración', 'error');
    }
  };

  // Eliminar punto de restauración de Supabase
  const deleteRestorePoint = async (pointId) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      showToast('❌ Error: Supabase no disponible', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('restoration_points')
        .delete()
        .eq('id', pointId);

      if (error) {
        console.error('Error eliminando punto de restauración:', error);
        showToast('❌ Error al eliminar punto de restauración', 'error');
        return;
      }

      // Eliminar de la lista local
      const newRestorePoints = restorePoints.filter(rp => rp.id !== pointId);
      setRestorePoints(newRestorePoints);
      
      console.log('🗑️ Punto de restauración eliminado:', pointId);
      showToast('✅ Punto de restauración eliminado', 'success');

    } catch (error) {
      console.error('Error inesperado eliminando restore point:', error);
      showToast('❌ Error inesperado al eliminar punto de restauración', 'error');
    }
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

  const addToCart = (p, qty) => {
    const existing = cart.find(i => i.id === p.id);
    if (existing) {
      saveCart(cart.map(i => i.id === p.id ? {...i, qty: i.qty + qty} : i));
    } else {
      saveCart([...cart, {...p, qty}]);
    }
    showToast("🛒 " + p.name + " agregado", "success");
  };
  const removeFromCart = (id) => { saveCart(cart.filter(i => i.id !== id)); };
  const updateCartQuantity = (id, newQty) => {
    if (newQty <= 0) {
      saveCart(cart.filter(i => i.id !== id));
    } else {
      saveCart(cart.map(i => i.id === id ? {...i, qty: newQty} : i));
    }
  };
  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + (i.price * i.qty), 0), [cart]);

  
  // Resetear página actual cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [cat, searchTerm, priceRange]);
  
  // Bloquear scroll del body cuando el carrito está abierto
  useEffect(() => {
    if (cartOpen) {
      document.body.classList.add('cart-open');
    } else {
      document.body.classList.remove('cart-open');
    }
    
    // Cleanup al desmontar
    return () => {
      document.body.classList.remove('cart-open');
    };
  }, [cartOpen]);
  
  
  // Verificar si la categoría seleccionada aún existe en availableCategories
  if (cat !== "Todos" && !availableCategories.includes(cat)) {
    console.log('⚠️ Categoría seleccionada ya no existe, cambiando a "Todos":', cat);
    setCat("Todos");
  }

  const loadProductsFromSupabase = async () => {
  try {
    console.log("🔍 loadProductsFromSupabase: INICIANDO...");
    console.log("🌍 AMBIENTE:", process.env.NODE_ENV);
    console.log("🔑 SUPABASE URL:", process.env.REACT_APP_SUPABASE_URL);
    
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
      `);

    console.log("📊 Respuesta Supabase:", { data: data?.length, error });

    if (error) {
      console.error("❌ Error de Supabase:", error);
      throw error;
    }

    if (data) {
      console.log("✅ Datos recibidos:", data.length);
      console.log("📦 Muestra de datos:", data.slice(0, 2));
      
      // Mapear para convertir bulk_info a bulkInfo y obtener categoría
      const mapped = data.map(p => ({
        ...p,
        category: p.categories?.name || "Frescos",
        bulkInfo: p.bulk_info || "",
        custom_badge: p.custom_badge || "",
        suspended: p.suspended || false,
      }));
      
      console.log("🔄 Productos mapeados:", mapped.length);
      setProducts(mapped);
      setStorageItem("roxy_products", mapped);
      return mapped;
    }
  } catch (error) {
    console.error("❌ Error cargando productos:", error.message);
    console.error("📍 Stack completo:", error);
    return null;
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
    
    // Guardar productos actualizados
    saveProducts(updatedProducts);
    
    // Sincronizar producto individual con Supabase
    const updatedProduct = updatedProducts.find(p => p.id === productId);
    if (updatedProduct) {
      await saveProductToSupabase(updatedProduct);
    }
    
    // Insertar cambio individual en historial de Supabase
    try {
      const historyEntry = {
        productId: productId,
        productName: product.name,
        oldPrice: oldPrice,
        newPrice: parseFloat(newPrice),
        user: user?.email || 'unknown'
      };
      
      await savePriceHistoryToSupabase(historyEntry);
      
      // Recargar historial desde Supabase para mantener sincronización
      await loadPriceHistoryFromSupabase();
      
      showToast("✅ Precio actualizado e historial guardado", "success");
    } catch (error) {
      console.error('Error guardando historial en Supabase:', error);
      showToast("✅ Precio actualizado (error guardando historial)", "warning");
    }
  };

  const updateBulkPrices = async (adjustmentType, value, selectedCategories = []) => {
    // Crear punto de restauración antes del cambio masivo
    await createRestorePoint(`Antes de ajuste masivo (${adjustmentType} ${value})`);
    
    let updatedCount = 0;
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
        return { ...p, price: newPrice };
      }
      return p;
    });
    
    // Guardar productos actualizados
    saveProducts(updatedProducts);
    
    // Sincronizar productos actualizados con Supabase
    const syncPromises = updatedProducts
      .filter(p => p.price !== products.find(orig => orig.id === p.id)?.price)
      .map(p => saveProductToSupabase(p));
    
    try {
      await Promise.allSettled(syncPromises);
      console.log(`✅ ${updatedCount} productos sincronizados con Supabase`);
    } catch (error) {
      console.error('Error sincronizando productos con Supabase:', error);
    }
    
    // Insertar cambios individuales en historial de Supabase
    try {
      const changes = [];
      updatedProducts.forEach(p => {
        const originalProduct = products.find(orig => orig.id === p.id);
        if (originalProduct && p.price !== originalProduct.price) {
          changes.push({
            productId: p.id,
            productName: p.name,
            oldPrice: originalProduct.price,
            newPrice: p.price,
            user: user?.email || 'unknown'
          });
        }
      });
      
      // Insertar cada cambio individualmente en Supabase
      for (const change of changes) {
        await savePriceHistoryToSupabase(change);
      }
      
      // Recargar historial desde Supabase para mantener sincronización
      await loadPriceHistoryFromSupabase();
      
      showToast(`✅ ${updatedCount} precios actualizados e historial guardado`, "success");
    } catch (error) {
      console.error('Error guardando historial en Supabase:', error);
      showToast(`✅ ${updatedCount} precios actualizados (error guardando historial)`, "warning");
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
    // Validación obligatoria de categoría
    if (!validateCategory(form.category)) {
      showToast("⚠️ Por favor, asigne una categoría para continuar", "error");
      return;
    }
    
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
      const result = await saveProductToSupabase(p);
      console.log('✏️ Producto actualizado en la lista y en Supabase');
      showToast("✏️ Producto actualizado", "success");
    } else {
      // Agregar nuevo producto - ACTUALIZACIÓN INMEDIATA
      const newProductList = [...products, p];
      setProducts(newProductList); // Actualizar estado local inmediatamente
      setStorageItem("roxy_products", newProductList); // Guardar en localStorage
      
      // Sincronizar individualmente con Supabase
      const newSupabaseId = await saveProductToSupabase(p);
      
      // ✅ FIX: Si se creó un nuevo producto, actualizar el ID local con el UUID de Supabase
      if (newSupabaseId && typeof newSupabaseId === 'string') {
        const updatedProductsWithSupabaseId = newProductList.map(x => 
          x.id === p.id ? { ...x, id: newSupabaseId } : x
        );
        setProducts(updatedProductsWithSupabaseId); // Actualizar estado con nuevo ID
        setStorageItem("roxy_products", updatedProductsWithSupabaseId); // Actualizar localStorage
        console.log('✅ ID local actualizado con UUID de Supabase:', newSupabaseId);
      }
      
      console.log('➕ Producto agregado a la lista y en Supabase');
      showToast("➕ Producto agregado", "success");
    }
    
    // Limpiar estado de imagen
    clearImagePreview();
    
    // Resetear formulario con primera categoría disponible o vacío
    const defaultCategory = availableCategories.length > 0 ? availableCategories[0] : "";
    setForm({ id:"", category: defaultCategory, name:"", description:"", price:"", bulkInfo:"", image_url:"", custom_badge:"" });
    
    // Limpiar estados de categoría
    setSuggestedCategory(null);
    setCategoryError('');
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    
    setEditing(false);
    setAdminTab("list");
    
    console.log('✅ Producto guardado y contador actualizado dinámicamente');
  };

  const startEdit = (p) => { 
    setForm({...p, price: p.price.toString()}); 
    setEditing(true); 
    setAdminTab("add");
    
    // Limpiar estados de categoría al editar
    setSuggestedCategory(null);
    setCategoryError('');
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    
    // Validar categoría del producto existente
    if (p.category) {
      validateCategory(p.category);
    }
    
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
    // Eliminar de Supabase primero
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        if (error) throw error;
        console.log('🗑️ Producto eliminado permanentemente de Supabase');
        
        // Eliminar del estado local inmediatamente
        const updatedProducts = products.filter(p => p.id !== id);
        await saveProducts(updatedProducts);
        
        console.log('✅ Producto eliminado y contador actualizado dinámicamente');
      } catch (error) {
        console.error('Error eliminando producto de Supabase:', error);
        showToast('⚠️ Error eliminando de Supabase', 'error');
      }
    }
    showToast("🗑️ Producto eliminado"); 
  };

  // Error Boundary y loading state - Solo mostrar loading si es inicialización
  if (loading && products.length === 0) {
    return (
      <div style={{ minHeight:"100vh", background:"#F4F4F5", fontFamily:"'Poppins', sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:80, height:80, margin:"0 auto 20px", borderRadius:"50%", overflow:"hidden", border:"3px solid #F5A623", animation:"spin 2s linear infinite" }}>
            <img src="https://bedccnjylrnkacaxtusv.supabase.co/storage/v1/object/public/imagenes/274300884_477506477168087_6457824232979322157_n.jpg" alt="Star Family Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ fontSize:18, color:"#6B7280", fontWeight:500 }}>Cargando...</div>
        </div>
      </div>
    );
  }

  // Si no hay productos pero ya terminó la carga, mostrar la aplicación con catálogo vacío
  // Esto permite que el usuario pueda acceder al panel de administración para agregar productos

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
            <div style={{ borderRadius:"50%", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", border:"2.5px solid #F5A623", flexShrink:0, overflow:"hidden", background:"#111" }}>
              <img src="https://bedccnjylrnkacaxtusv.supabase.co/storage/v1/object/public/imagenes/274300884_477506477168087_6457824232979322157_n.jpg" alt="Star Family Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
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

          {/* BANNERS */}
          <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 16px" }}>
            <BannerSection banners={banners} loading={loadingBanners} />
          </div>

          {/* CATEGORY BAR */}
          <div style={{ background:"white", borderBottom:"1px solid #E5E7EB", position:"sticky", top:62, zIndex:100 }}>
            <div className="cat-scroll">
              {["Todos", ...availableCategories].map(c => (
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
                  {searchTerm && `Buscando: "${searchTerm}"`}
                  {(priceRange.min || priceRange.max) && 
                    ` • Precio: $${priceRange.min || '0'} - $${priceRange.max || '∞'}`
                  }
                </div>
              )}
            </div>
          </div>

          {/* PRODUCT GRID CON PAGINACIÓN */}
          <div style={{ maxWidth:1200, margin:"0 auto", padding:"20px 12px 48px" }}>
            {/* Mostrar productos agrupados por categoría o paginados */}
            {cat === "Todos" ? (
              // Vista "Todos" con productos paginados
              <>
                {/* Productos con categoría */}
                {(() => {
                  const groupedProducts = {};
                  paginatedData.forEach(p => {
                    if (p && typeof p === 'object' && p.category && p.category.trim() && p.category !== 'null' && p.category !== null) {
                      const category = p.category;
                      if (!groupedProducts[category]) {
                        groupedProducts[category] = [];
                      }
                      groupedProducts[category].push(p);
                    }
                  });

                  return Object.entries(groupedProducts).map(([category, products]) => (
                    <div key={category} style={{ marginBottom:32 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingLeft:4 }}>
                        <div style={{ background:CAT_COLOR[category] || "#C41E3A", width:4, height:26, borderRadius:2 }} />
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"#111" }}>{category.toUpperCase()}</span>
                      </div>
                      <div className="product-grid">
                        {products?.filter(p => p && typeof p === 'object' && p.id).map((product) => (
                          <ProductCard key={product.id} p={product} onOpen={() => { setModal(product); setQty(1); }} onAdd={() => addToCart(product, 1)} />
                        ))}
                      </div>
                    </div>
                  ));
                })()}

                {/* Productos sin categoría */}
                {(() => {
                  const prodsWithoutCategory = paginatedData.filter(p => 
                    p && typeof p === 'object' && (
                      !p.category || 
                      p.category.trim() === '' || 
                      p.category === 'null' ||
                      p.category === null
                    )
                  );
                  if (prodsWithoutCategory.length === 0) return null;
                  
                  return (
                    <div key="sin-categoria" style={{ marginBottom:32 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingLeft:4 }}>
                        <div style={{ background:"#6B7280", width:4, height:26, borderRadius:2 }} />
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"#111" }}>SIN CATEGORÍA</span>
                      </div>
                      <div className="product-grid">
                        {prodsWithoutCategory?.filter(p => p && typeof p === 'object' && p.id).map((product) => (
                          <ProductCard key={product.id} p={product} onOpen={() => { setModal(product); setQty(1); }} onAdd={() => addToCart(product, 1)} />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              // Vista de categoría específica con productos paginados
              (() => {
                if (paginatedData.length === 0) return null;
                
                return (
                  <div style={{ marginBottom:32 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingLeft:4 }}>
                      <div style={{ background:CAT_COLOR[cat] || "#C41E3A", width:4, height:26, borderRadius:2 }} />
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"#111" }}>{cat.toUpperCase()}</span>
                    </div>
                    <div className="product-grid">
                      {paginatedData?.filter(p => p && typeof p === 'object' && p.id).map((product) => (
                        <ProductCard key={product.id} p={product} onOpen={() => { setModal(product); setQty(1); }} onAdd={() => addToCart(product, 1)} />
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
            
            {filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>
                <div style={{ fontSize:56 }}>📦</div>
                <div style={{ fontSize:18, fontWeight:700, marginTop:12 }}>
                  {products.length === 0 ? "No hay productos disponibles" : "Sin productos en esta categoría"}
                </div>
                {products.length === 0 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:14, marginBottom:16 }}>
                      Ve al panel de administración para agregar productos
                    </div>
                    <button 
                      onClick={() => setView("admin")}
                      style={{
                        background:"#C41E3A",
                        color:"white",
                        border:"none",
                        borderRadius:8,
                        padding:"10px 20px",
                        fontSize:14,
                        fontWeight:600,
                        cursor:"pointer",
                        fontFamily:"'Poppins',sans-serif"
                      }}
                    >
                      ⚙️ Ir al Panel de Administración
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CONTROLES DE PAGINACIÓN */}
            {filtered.length > 0 && (
              <PaginationControls 
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                totalItems={filtered.length}
              />
            )}
          </div>
        </>
      ) : (
        <AdminPanel 
            products={products}
            filteredProducts={filteredProducts} 
            adminFilters={adminFilters}
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
            availableCategories={availableCategories}
            suggestedCategory={suggestedCategory}
            newCategoryName={newCategoryName}
            showNewCategoryInput={showNewCategoryInput}
            categoryError={categoryError}
            loadingCategories={loadingCategories}
            handleCategoryChange={handleCategoryChange}
            handleAddNewCategory={handleAddNewCategory}
            cancelNewCategory={cancelNewCategory}
            setNewCategoryName={setNewCategoryName}
            setShowNewCategoryInput={setShowNewCategoryInput}
            handleProductNameChange={handleProductNameChange}
            handleDeleteCategory={handleDeleteCategory}
            supaUrl={supaUrl}
            supaKey={supaKey}
            setSupaUrl={setSupaUrl}
            setSupaKey={setSupaKey}
            onSync={syncSupabase}
            syncing={syncing}
            onSaveSupa={saveProductToSupabase}
            onReset={handleFormSubmit}
            onImageSelect={handleImageSelect}
            onClearImage={clearImagePreview}
            imagePreview={imagePreview}
            uploadingImage={uploadingImage}
            onMigrate={migrateExistingImagesToSupabase}
            onUpdateSinglePrice={updateSinglePrice}
            onUpdateBulkPrices={updateBulkPrices}
            onPreviewBulkPriceChanges={previewBulkPriceChanges}
            priceHistory={priceHistory}
            loadingPriceHistory={loadingPriceHistory}
            priceHistoryError={priceHistoryError}
            onMigrateImages={migrateExistingImagesToSupabase}
            restorePoints={restorePoints}
            onCreateRestorePoint={createRestorePoint}
            onRestoreFromPoint={restoreFromPoint}
            onDeleteRestorePoint={deleteRestorePoint}
            loadingRestorePoints={loadingRestorePoints}
            restorePointsError={restorePointsError}
            user={user}
            isMaster={isMaster}
            onLogin={handleLogin}
            onLogout={handleLogout}
            email={email}
            password={password}
            setEmail={setEmail}
            setPassword={setPassword}
            authLoading={localAuthLoading}
            saveImagePreview={saveImagePreview}
            onToggleSuspension={toggleProductSuspension}
            paymentSettings={paymentSettings}
            setPaymentSettings={setPaymentSettings}
            loadingPaymentSettings={loadingPaymentSettings}
            setLoadingPaymentSettings={setLoadingPaymentSettings}
            banners={banners}
            setBanners={setBanners}
            loadingBanners={loadingBanners}
            bannerForm={bannerForm}
            setBannerForm={setBannerForm}
            editingBanner={editingBanner}
            setEditingBanner={setEditingBanner}
            bannerImagePreview={bannerImagePreview}
            setBannerImagePreview={setBannerImagePreview}
            uploadingBannerImage={uploadingBannerImage}
            onBannerSubmit={handleBannerSubmit}
            onBannerImageSelect={handleBannerImageSelect}
            onClearBannerImage={clearBannerImagePreview}
            onDeleteBanner={deleteBanner}
            onEditBanner={startEditBanner}
                      />
      )}

      {/* FOOTER */}
      <footer style={{ background:"#111111", color:"white", padding:"40px 16px 20px", marginTop:"auto" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))", gap:"40px" }}>
          {/* Logo y marca */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ borderRadius:"50%", width:50, height:50, display:"flex", alignItems:"center", justifyContent:"center", border:"2.5px solid #F5A623", overflow:"hidden" }}>
                <img src="https://bedccnjylrnkacaxtusv.supabase.co/storage/v1/object/public/imagenes/274300884_477506477168087_6457824232979322157_n.jpg" alt="Star Family Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
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
              {["Todos", ...availableCategories].map(c => (
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
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.782 6.98 6.979 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.358-.2 6.782-2.618 6.979-6.98.058-1.281.072-1.689.072-4.948 0-3.259-.014-3.667-.072-4.947-.2-4.358-2.618-6.78-6.98-6.98-1.281-.059-1.689-.073-4.948-.073zm5.521 6.978a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5zm-5.521 1.436a4.746 4.746 0 100 9.492 4.746 4.746 0 000-9.492zm0 7.834a3.088 3.088 0 110-6.176 3.088 3.088 0 010 6.176z"/>
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
                <span style={{ fontSize:16 }}>🕐</span>
                <div>10 a 21hs</div>
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
              position: 'fixed',
              bottom: 80,
              right: 20,
              zIndex: 500,
              maxWidth: 320
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
                borderRadius:12,
                padding:"12px 16px",
                display:"flex",
                alignItems:"center",
                gap:12,
                boxShadow:"0 4px 16px rgba(196, 30, 58, 0.4)",
                backdropFilter:"blur(10px)",
                border:"1px solid rgba(255, 255, 255, 0.2)",
                cursor:"pointer",
                fontSize:14
              }}
              onClick={installPWA}
            >
              <div style={{ 
                fontSize:24, 
                flexShrink:0,
                animation: 'bounce 2s infinite'
              }}>
                📱
              </div>
              <div style={{ flex:1, minWidth: 0 }}>
                <div style={{ 
                  fontSize:13, 
                  fontWeight:600, 
                  marginBottom:2,
                  fontFamily:"'Poppins',sans-serif",
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  ¡Instala la app!
                </div>
                <div style={{ 
                  fontSize:11, 
                  opacity:0.9,
                  fontFamily:"'Poppins',sans-serif",
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  Compra más rápido
                </div>
              </div>
              <div style={{ 
                fontSize:16, 
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
                position: 'absolute',
                top: -6,
                right: -6,
                background:"rgba(255, 255, 255, 0.2)",
                border:"none",
                borderRadius:16,
                width:28,
                height:28,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                cursor:"pointer",
                fontSize:14,
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
        <CartDrawer 
          cart={cart} 
          onRemove={removeFromCart} 
          onUpdateQuantity={updateCartQuantity} 
          onClose={() => setCartOpen(false)} 
          total={cartTotal} 
          onClear={() => saveCart([])} 
          paymentSettings={paymentSettings}
          paymentCompleted={paymentCompleted}
          paymentProcessing={paymentProcessing}
          onPaymentSuccess={handleMercadoPagoSuccess}
          onPaymentError={handleMercadoPagoError}
        />
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
// PAGINATION CONTROLS
// ═══════════════════════════════════════════════════════

function PaginationControls({ currentPage, totalPages, setCurrentPage, totalItems }) {
  if (totalPages <= 1) return null;
  
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      gap: '8px', 
      margin: '32px 0',
      flexWrap: 'wrap'
    }}>
      {/* Botón Anterior */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: '8px 12px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          background: currentPage === 1 ? '#F9FAFB' : 'white',
          color: currentPage === 1 ? '#9CA3AF' : '#374151',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: "'Poppins', sans-serif"
        }}
      >
        ← Anterior
      </button>
      
      {/* Números de página */}
      {renderPageNumbers().map((page, index) => (
        page === '...' ? (
          <span key={`ellipsis-${index}`} style={{ 
            padding: '8px 4px', 
            color: '#9CA3AF',
            fontSize: '14px'
          }}>
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            style={{
              padding: '8px 12px',
              border: currentPage === page ? '1px solid #C41E3A' : '1px solid #E5E7EB',
              borderRadius: '8px',
              background: currentPage === page ? '#C41E3A' : 'white',
              color: currentPage === page ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: currentPage === page ? '600' : '500',
              fontFamily: "'Poppins', sans-serif"
            }}
          >
            {page}
          </button>
        )
      ))}
      
      {/* Botón Siguiente */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: '8px 12px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          background: currentPage === totalPages ? '#F9FAFB' : 'white',
          color: currentPage === totalPages ? '#9CA3AF' : '#374151',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: "'Poppins', sans-serif"
        }}
      >
        Siguiente →
      </button>
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
    description = '',
    custom_badge = ''
  } = p || {};
  
  // PARCHE DE SEGURIDAD TOTAL: Log de depuración
  console.log('Renderizando producto:', p?.id || 'ID NULO');
  
  const color = CAT_COLOR[category] || "#C41E3A";
  const emoji = CAT_EMOJI[category] || "🍖";
  
  // Lógica para el badge: mostrar etiqueta personalizada si existe, si no, no mostrar badge
  const badgeText = custom_badge && custom_badge.trim() !== '' ? custom_badge.trim() : null;
  
  return (
    <div className="product-card" onClick={onOpen}>
      {/* Image */}
      <div style={{ position:"relative", aspectRatio:"4/3", overflow:"hidden", background:`linear-gradient(135deg,${color}22,${color}44)` }}>
        {image_url && image_url.trim() !== ''
          ? <img src={image_url} alt={name || "Producto"} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.3s" }} onError={e => { e.target.src = "https://via.placeholder.com/300x300/f5a623/ffffff?text=Star+Family"; }} />
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:42 }}>{emoji}</div>
        }
        {badgeText && (
          <div style={{ position:"absolute", top:8, left:8, background:color, color:"white", fontSize:9, fontWeight:800, borderRadius:6, padding:"3px 8px", letterSpacing:0.5 }}>{badgeText.toUpperCase()}</div>
        )}
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
  
  // Lógica para el badge: mostrar etiqueta personalizada si existe, si no, no mostrar badge
  const badgeText = p?.custom_badge && p?.custom_badge.trim() !== '' ? p?.custom_badge.trim() : null;
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
        {badgeText && (
          <div style={{ background:`${color}18`, color, fontSize:11, fontWeight:800, borderRadius:6, padding:"3px 10px", display:"inline-block", marginBottom:8, letterSpacing:0.5 }}>{badgeText.toUpperCase()}</div>
        )}
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

// CART DRAWER
// ═══════════════════════════════════════════════════════

function CartDrawer({ cart, onRemove, onUpdateQuantity, onClose, total, onClear, paymentSettings, paymentCompleted, paymentProcessing, onPaymentSuccess, onPaymentError }) {
  // Ref para tracking de montaje y toast
  const toastRef = React.useRef(null);
  const isMountedRef = React.useRef(true);
  
  // Estado para manejar el método de pago seleccionado
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState(null); // null, 'mercadopago', 'transferencia'
  
  // Estado para controlar si el usuario copió datos bancarios
  const [hasCopiedBankData, setHasCopiedBankData] = React.useState(false);
  
  // Detectar si es dispositivo móvil
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Limpiar toast si existe al desmontar
      if (toastRef.current && document.body.contains(toastRef.current)) {
        try {
          document.body.removeChild(toastRef.current);
        } catch (e) {
          // Ignorar error si el nodo ya fue removido
        }
      }
    };
  }, []);
    
  // Función para copiar al portapapeles
  const copyToClipboard = React.useCallback(async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      // Crear toast temporal
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        background: #DCFCE7;
        color: #166534;
        padding: 10px 20px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        white-space: nowrap;
        font-family: 'Poppins', sans-serif;
      `;
      toast.textContent = `¡Copiaste el ${type}! ✅`;
      document.body.appendChild(toast);
      toastRef.current = toast;
      
      // Auto-ocultar después de 3 segundos
      setTimeout(() => {
        if (isMountedRef.current && toastRef.current && document.body.contains(toastRef.current)) {
          try {
            document.body.removeChild(toastRef.current);
          } catch (e) {
            // Ignorar error si el nodo ya fue removido
          }
          toastRef.current = null;
        }
      }, 3000);
    } catch (error) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      // Mostrar toast de fallback
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        background: #DCFCE7;
        color: #166534;
        padding: 10px 20px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        white-space: nowrap;
        font-family: 'Poppins', sans-serif;
      `;
      toast.textContent = `¡Copiaste el ${type}! ✅`;
      document.body.appendChild(toast);
      toastRef.current = toast;
      
      setTimeout(() => {
        if (isMountedRef.current && toastRef.current && document.body.contains(toastRef.current)) {
          try {
            document.body.removeChild(toastRef.current);
          } catch (e) {
            // Ignorar error si el nodo ya fue removido
          }
          toastRef.current = null;
        }
      }, 3000);
    }
  }, []);
  
  const sendWA = (paymentMethod = null) => {
    const lines = cart.map(i => `• ${i.qty}x ${i.name}: ${fmt(i.price * i.qty)}`).join("\n");
    let paymentInfo = "";
    
    if (paymentMethod === 'transferencia') {
      paymentInfo = "\n💳 Pago: Transferencia bancaria - adjunto comprobante";
    } else if (paymentMethod === 'mercadopago') {
      paymentInfo = "\n✅ Pago: Mercado Pago confirmado";
    }
    
    const msg = encodeURIComponent(`Hola! Quisiera hacer un pedido 👋\n\n${lines}\n\n*TOTAL: ${fmt(total)}*${paymentInfo}\n\nEspero su confirmación, gracias!`);
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

      <div style={{ flex: cart.length === 0 ? 1 : 0, overflowY:"auto", padding: cart.length === 0 ? "14px 20px" : 0, display: cart.length === 0 ? "block" : "none" }}>
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
              <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{fmt(item?.price || 0)} c/u</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontWeight:800, color:"#C41E3A", fontSize:15, marginBottom:4 }}>{fmt((item?.price || 0) * (item?.qty || 0))}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end" }}>
                <button 
                  onClick={() => onUpdateQuantity(item.id, (item?.qty || 1) - 1)}
                  style={{
                    width:24,
                    height:24,
                    borderRadius:4,
                    border:"1px solid #E5E7EB",
                    background:"white",
                    color:"#374151",
                    cursor:"pointer",
                    fontSize:14,
                    fontWeight:"600",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    transition:"all 0.2s"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = "#F3F4F6";
                    e.target.style.borderColor = "#D1D5DB";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "white";
                    e.target.style.borderColor = "#E5E7EB";
                  }}
                >
                  −
                </button>
                <span style={{ 
                  minWidth:20, 
                  textAlign:"center", 
                  fontSize:13, 
                  fontWeight:"700", 
                  color:"#1F2937" 
                }}>
                  {item?.qty || 0}
                </span>
                <button 
                  onClick={() => onUpdateQuantity(item.id, (item?.qty || 1) + 1)}
                  style={{
                    width:24,
                    height:24,
                    borderRadius:4,
                    border:"1px solid #E5E7EB",
                    background:"white",
                    color:"#374151",
                    cursor:"pointer",
                    fontSize:14,
                    fontWeight:"600",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    transition:"all 0.2s"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = "#F3F4F6";
                    e.target.style.borderColor = "#D1D5DB";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "white";
                    e.target.style.borderColor = "#E5E7EB";
                  }}
                >
                  +
                </button>
                <button 
                  onClick={() => onRemove(item.id)} 
                  style={{ 
                    background:"#FEE2E2", 
                    border:"1px solid #FECACA", 
                    color:"#DC2626", 
                    cursor:"pointer", 
                    fontSize:11, 
                    padding:"3px 6px", 
                    borderRadius:"4px",
                    fontWeight:"600",
                    transition:"all 0.2s",
                    marginLeft:4
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = "#FEE2E2";
                    e.target.style.borderColor = "#F87171";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "#FEE2E2";
                    e.target.style.borderColor = "#FECACA";
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div style={{ padding:"16px 20px", borderTop:"1px solid #F3F4F6", background:"white" }}>
          {/* ORDER SUMMARY SECTION */}
          <div style={{ marginBottom:16, padding:"14px", background:"#FDF4FF", borderRadius:12, border:"1px solid #E9D5FF" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#7C3AED", marginBottom:10 }}>📋 Resumen del pedido</div>
            
            {/* Product list summary */}
            <div style={{ marginBottom:12 }}>
              {cart.filter(Boolean).map((item, index) => (
                <div key={item.id} style={{ 
                  display:"flex", 
                  justifyContent:"space-between", 
                  alignItems:"center", 
                  padding:"6px 0", 
                  fontSize:12,
                  borderBottom: index < cart.length - 1 ? "1px solid #FAE8FF" : "none"
                }}>
                  <div style={{ color:"#4B5563", fontWeight:500, flex:1 }}>
                    {item.qty}x {item.name}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ color:"#1F2937", fontWeight:600 }}>
                      {fmt(item.price * item.qty)}
                    </div>
                    <button 
                      onClick={() => onRemove(item.id)}
                      style={{
                        background:"#FEE2E2",
                        border:"1px solid #FECACA",
                        color:"#DC2626",
                        cursor:"pointer",
                        fontSize:10,
                        padding:"2px 6px",
                        borderRadius:"4px",
                        fontWeight:"600",
                        transition:"all 0.2s",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = "#FEE2E2";
                        e.target.style.borderColor = "#F87171";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = "#FEE2E2";
                        e.target.style.borderColor = "#FECACA";
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Subtotal */}
            <div style={{ 
              display:"flex", 
              justifyContent:"space-between", 
              alignItems:"center", 
              paddingTop:"8px", 
              borderTop:"1px solid #E9D5FF",
              marginBottom:"8px"
            }}>
              <div style={{ fontSize:12, color:"#6B7280", fontWeight:600 }}>Subtotal</div>
              <div style={{ fontSize:13, color:"#374151", fontWeight:600 }}>
                {fmt(cart.reduce((sum, item) => sum + (item.price * item.qty), 0))}
              </div>
            </div>
          </div>
          
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14, padding:"12px 14px", background:"#1F2937", borderRadius:12 }}>
            <span style={{ fontWeight:700, color:"white" }}>Total del pedido</span>
            <span style={{ fontWeight:900, fontSize:20, color:"#10B981" }}>{fmt(total)}</span>
          </div>
          
          {/* PAYMENT METHOD SELECTION */}
          {!paymentCompleted && !selectedPaymentMethod && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:12 }}>
                💳 ¿Cómo querés pagar?
              </div>
              
              {/* Mercado Pago Button */}
              {(paymentSettings?.mp_enabled === true) && (
                <button
                  onClick={() => setSelectedPaymentMethod('mercadopago')}
                  style={{
                    width:"100%",
                    background:"#009EE3",
                    color:"white",
                    border:"none",
                    borderRadius:12,
                    padding:14,
                    fontSize:14,
                    fontWeight:600,
                    cursor:"pointer",
                    marginBottom:8,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:8,
                    fontFamily:"'Poppins',sans-serif",
                    transition:"background 0.2s"
                  }}
                  onMouseOver={(e) => e.target.style.background = "#0077B6"}
                  onMouseOut={(e) => e.target.style.background = "#009EE3"}
                >
                  💳 Pagar con Mercado Pago
                </button>
              )}
              
              {/* Transferencia Button */}
              {(paymentSettings?.transfer_enabled === true) && (
                <button
                  onClick={() => setSelectedPaymentMethod('transferencia')}
                  style={{
                    width:"100%",
                    background:"#6B7280",
                    color:"white",
                    border:"none",
                    borderRadius:12,
                    padding:14,
                    fontSize:14,
                    fontWeight:600,
                    cursor:"pointer",
                    marginBottom:8,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:8,
                    fontFamily:"'Poppins',sans-serif",
                    transition:"background 0.2s"
                  }}
                  onMouseOver={(e) => e.target.style.background = "#4B5563"}
                  onMouseOut={(e) => e.target.style.background = "#6B7280"}
                >
                  🏦 Pagar por Transferencia Bancaria
                </button>
              )}
              
                            
              {/* Si no hay métodos habilitados, mostrar ambos por defecto */}
              {(!paymentSettings || (paymentSettings?.mp_enabled === false && paymentSettings?.transfer_enabled === false)) && (
                <div style={{ 
                  background: "#FEF3C7", 
                  border: "1px solid #FDE68A", 
                  borderRadius:12, 
                  padding:12, 
                  fontSize:12, 
                  color:"#92400E",
                  textAlign:"center"
                }}>
                  ⚠️ No hay métodos de pago configurados. Contactá al administrador.
                </div>
              )}
            </div>
          )}

          {/* MERCADO PAGO CHECKOUT */}
          {!paymentCompleted && selectedPaymentMethod === 'mercadopago' && (
            <div style={{ marginBottom:12 }}>
              <div style={{ 
                background: "#F0F9FF", 
                border: "1px solid #BFDBFE", 
                borderRadius:12, 
                padding:12, 
                marginBottom:8 
              }}>
                <div style={{ 
                  fontSize:12, 
                  fontWeight:600, 
                  color:"#1E40AF", 
                  marginBottom:8, 
                  display:"flex", 
                  alignItems:"center", 
                  gap:6 
                }}>
                  💳 Pago seguro con Mercado Pago
                </div>
                <div style={{ fontSize:11, color:"#64748B", marginBottom:8 }}>
                  Paga con tarjeta, débito o efectivo en Pago Fácil
                </div>
                <MercadoPagoCheckout 
                  cartItems={cart} 
                  total={total}
                  onPaymentSuccess={(response) => {
                    onPaymentSuccess(response);
                    sendWA('mercadopago');
                  }}
                  onPaymentError={onPaymentError}
                />
              </div>
              
              {/* Botón WhatsApp solo en desktop para Mercado Pago */}
              {!isMobile && (
                <button
                  onClick={() => sendWA('mercadopago')}
                  style={{
                    width:"100%",
                    background:"#25D366",
                    color:"white",
                    border:"none",
                    borderRadius:12,
                    padding:14,
                    fontSize:14,
                    fontWeight:600,
                    cursor:"pointer",
                    marginBottom:8,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:8,
                    fontFamily:"'Poppins',sans-serif",
                    transition:"background 0.2s"
                  }}
                  onMouseOver={(e) => e.target.style.background = "#128C7E"}
                  onMouseOut={(e) => e.target.style.background = "#25D366"}
                >
                  📱 Enviar pedido por WhatsApp
                </button>
              )}
              
                            
              <button
                onClick={() => setSelectedPaymentMethod(null)}
                style={{
                  width:"100%",
                  background:"#F4F4F5",
                  color:"#6B7280",
                  border:"none",
                  borderRadius:8,
                  padding:8,
                  fontSize:12,
                  cursor:"pointer",
                  fontFamily:"'Poppins',sans-serif"
                }}
              >
                ← Volver a métodos de pago
              </button>
            </div>
          )}

          {/* TRANSFERENCIA BANCARIA VIEW */}
          {!paymentCompleted && selectedPaymentMethod === 'transferencia' && (
            <div style={{ marginBottom:12 }}>
              <div style={{ 
                background: "#F9FAFB", 
                border: "1px solid #E5E7EB", 
                borderRadius:12, 
                padding:16, 
                marginBottom:12 
              }}>
                <div style={{ 
                  fontSize:14, 
                  fontWeight:600, 
                  color:"#374151", 
                  marginBottom:12, 
                  textAlign:"center"
                }}>
                  🏦 Datos para Transferencia
                </div>
                
                <div style={{ fontSize:12, color:"#6B7280", marginBottom:16, textAlign:"center" }}>
                  Monto a transferir: <span style={{ fontWeight:700, color:"#111", fontSize:14 }}>{fmt(total)}</span>
                </div>

                {/* Titular */}
                {(paymentSettings?.titular) && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:"#6B7280", marginBottom:4 }}>Titular</div>
                    <div style={{ 
                      fontSize:13, 
                      fontWeight:600, 
                      color:"#111", 
                      padding:"8px 12px", 
                      background:"white", 
                      borderRadius:8, 
                      border:"1px solid #E5E7EB" 
                    }}>
                      {paymentSettings.titular}
                    </div>
                  </div>
                )}

                {/* Banco */}
                {(paymentSettings?.banco) && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:"#6B7280", marginBottom:4 }}>Banco</div>
                    <div style={{ 
                      fontSize:13, 
                      fontWeight:600, 
                      color:"#111", 
                      padding:"8px 12px", 
                      background:"white", 
                      borderRadius:8, 
                      border:"1px solid #E5E7EB" 
                    }}>
                      {paymentSettings.banco}
                    </div>
                  </div>
                )}

                {/* CBU */}
                {(paymentSettings?.cbu) && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:"#6B7280", marginBottom:4 }}>CBU</div>
                    <div style={{ 
                      display:"flex", 
                      gap:8, 
                      alignItems:"center"
                    }}>
                      <div style={{ 
                        flex:1, 
                        fontSize:12, 
                        fontWeight:600, 
                        color:"#111", 
                        padding:"8px 12px", 
                        background:"white", 
                        borderRadius:8, 
                        border:"1px solid #E5E7EB",
                        fontFamily:"monospace"
                      }}>
                        {paymentSettings.cbu}
                      </div>
                      <button
                        onClick={() => copyToClipboard(paymentSettings.cbu, 'CBU')}
                        style={{
                          padding:"6px 10px",
                          background:"#10B981",
                          color:"white",
                          border:"none",
                          borderRadius:6,
                          fontSize:11,
                          cursor:"pointer",
                          fontWeight:600
                        }}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}

                {/* Alias */}
                {(paymentSettings?.alias) && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:"#6B7280", marginBottom:4 }}>Alias</div>
                    <div style={{ 
                      display:"flex", 
                      gap:8, 
                      alignItems:"center"
                    }}>
                      <div style={{ 
                        flex:1, 
                        fontSize:12, 
                        fontWeight:600, 
                        color:"#111", 
                        padding:"8px 12px", 
                        background:"white", 
                        borderRadius:8, 
                        border:"1px solid #E5E7EB"
                      }}>
                        {paymentSettings.alias}
                      </div>
                      <button
                        onClick={() => copyToClipboard(paymentSettings.alias, 'Alias')}
                        style={{
                          padding:"6px 10px",
                          background:"#10B981",
                          color:"white",
                          border:"none",
                          borderRadius:6,
                          fontSize:11,
                          cursor:"pointer",
                          fontWeight:600
                        }}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ 
                  fontSize:11, 
                  color:"#6B7280", 
                  textAlign:"center", 
                  marginTop:12,
                  fontStyle:"italic"
                }}>
                  Una vez realizado el pago, enviá el comprobante por WhatsApp
                </div>
              </div>

              <button
                onClick={() => sendWA('transferencia')}
                style={{
                  width:"100%",
                  background:"#25D366",
                  color:"white",
                  border:"none",
                  borderRadius:12,
                  padding:14,
                  fontSize:14,
                  fontWeight:600,
                  cursor:"pointer",
                  marginBottom:8,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:8,
                  fontFamily:"'Poppins',sans-serif",
                  transition:"background 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#128C7E"}
                onMouseOut={(e) => e.target.style.background = "#25D366"}
              >
                📱 Enviar pedido por WhatsApp
              </button>

              <button
                onClick={() => setSelectedPaymentMethod(null)}
                style={{
                  width:"100%",
                  background:"#F4F4F5",
                  color:"#6B7280",
                  border:"none",
                  borderRadius:8,
                  padding:8,
                  fontSize:12,
                  cursor:"pointer",
                  fontFamily:"'Poppins',sans-serif"
                }}
              >
                ← Volver a métodos de pago
              </button>
            </div>
          )}
          
          {/* PAYMENT SUCCESS MESSAGE */}
          {paymentCompleted && (
            <div style={{ 
              background: "#DCFCE7", 
              border: "1px solid #BBF7D0", 
              borderRadius:12, 
              padding:16, 
              marginBottom:12,
              textAlign: "center"
            }}>
              <div style={{ fontSize:24, marginBottom:8 }}>🎉</div>
              <div style={{ 
                fontSize:14, 
                fontWeight:600, 
                color:"#166534", 
                marginBottom:4 
              }}>
                ¡Pago realizado con éxito!
              </div>
              <div style={{ fontSize:12, color:"#15803D" }}>
                Te contactaremos pronto para coordinar la entrega.
              </div>
            </div>
          )}
          <button 
            onClick={onClear} 
            disabled={paymentProcessing || paymentCompleted}
            style={{ 
              width:"100%", 
              background:"#F4F4F5", 
              color: paymentProcessing || paymentCompleted ? "#9CA3AF" : "#6B7280", 
              border:"none", 
              borderRadius:12, 
              padding:10, 
              fontSize:13, 
              cursor: paymentProcessing || paymentCompleted ? "not-allowed" : "pointer", 
              fontFamily:"'Poppins',sans-serif",
              opacity: paymentProcessing || paymentCompleted ? 0.6 : 1
            }}
          >
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
      <p style={{ color:"#6B7280", fontSize:14, marginBottom:20 }}>
        Modificá precios de forma individual o masiva.
      </p>

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

function PriceHistory({ priceHistory, loading, error }) {
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

  // Show loading state
  if (loading) {
    return (
      <div style={{ background:"white", borderRadius:16, padding:24 }}>
        <h3 style={{ margin:"0 0 6px", fontWeight:800 }}>📜 Historial de Cambios de Precios</h3>
        <p style={{ color:"#6B7280", fontSize:14, marginBottom:20 }}>
          Registro completo de todos los cambios de precios con fecha y hora.
        </p>
        <div style={{ textAlign:"center", padding:40, color:"#9CA3AF" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>⏳</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Cargando historial...</div>
          <div style={{ fontSize:13 }}>Obteniendo datos desde Supabase</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{ background:"white", borderRadius:16, padding:24 }}>
        <h3 style={{ margin:"0 0 6px", fontWeight:800 }}>📜 Historial de Cambios de Precios</h3>
        <p style={{ color:"#6B7280", fontSize:14, marginBottom:20 }}>
          Registro completo de todos los cambios de precios con fecha y hora.
        </p>
        <div style={{ textAlign:"center", padding:40, color:"#DC2626" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>❌</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Error al cargar historial</div>
          <div style={{ fontSize:13 }}>{error}</div>
        </div>
      </div>
    );
  }

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

function RestorePoints({ restorePoints, onCreateRestorePoint, onRestoreFromPoint, onDeleteRestorePoint, loadingRestorePoints, restorePointsError }) {
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
    }
  };

  const handleDeleteRestorePoint = async (pointId) => {
    const confirmed = window.confirm("¿Estás seguro que querés eliminar este punto de restauración?");
    if (confirmed) {
      await onDeleteRestorePoint(pointId);
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

      {/* Loading state */}
      {loadingRestorePoints && (
        <div style={{ textAlign:"center", padding:40, color:"#6B7280" }}>
          <div style={{ fontSize:24, marginBottom:12 }}>⏳</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Cargando puntos de restauración...</div>
          <div style={{ fontSize:13 }}>Obteniendo datos desde Supabase</div>
        </div>
      )}

      {/* Error state */}
      {restorePointsError && !loadingRestorePoints && (
        <div style={{ textAlign:"center", padding:40, color:"#DC2626" }}>
          <div style={{ fontSize:24, marginBottom:12 }}>❌</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Error al cargar puntos</div>
          <div style={{ fontSize:13 }}>{restorePointsError}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop:12,
              padding:"8px 16px",
              background:"#DC2626",
              color:"white",
              border:"none",
              borderRadius:6,
              cursor:"pointer",
              fontSize:12
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loadingRestorePoints && !restorePointsError && restorePoints.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#9CA3AF" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>No hay puntos de restauración</div>
          <div style={{ fontSize:13 }}>Los puntos de restauración se crearán automáticamente cuando hagas cambios importantes</div>
        </div>
      ) : null}
      
      {/* Lista de puntos de restauración */}
      {!loadingRestorePoints && !restorePointsError && restorePoints.length > 0 && (
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
                <div style={{ display:"flex", gap:6 }}>
                  <button
                    onClick={() => handleDeleteRestorePoint(point.id)}
                    style={{
                      padding:"6px 12px",
                      borderRadius:6,
                      border:"1px solid #6B7280",
                      background:"#6B7280",
                      color:"white",
                      fontWeight:600,
                      cursor:"pointer",
                      fontSize:12,
                      transition:"background 0.2s"
                    }}
                    onMouseOver={(e) => e.target.style.background = "#4B5563"}
                    onMouseOut={(e) => e.target.style.background = "#6B7280"}
                    title="Eliminar punto de restauración"
                  >
                    🗑️ Eliminar
                  </button>
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
      <style>{`
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

function AdminPanel({ products, filteredProducts, adminFilters, form, setForm, editing, setEditing, adminTab, setAdminTab, onSubmit, onEdit, onDelete, onExcel, fileRef, availableCategories, suggestedCategory, newCategoryName, showNewCategoryInput, categoryError, loadingCategories, handleCategoryChange, handleAddNewCategory, cancelNewCategory, setNewCategoryName, setShowNewCategoryInput, handleProductNameChange, handleDeleteCategory, supaUrl, supaKey, setSupaUrl, setSupaKey, onSync, syncing, onSaveSupa, onReset, onImageSelect, onClearImage, imagePreview, uploadingImage, onMigrate, onUpdateSinglePrice, onUpdateBulkPrices, onPreviewBulkPriceChanges, priceHistory, onMigrateImages, onSyncProducts, restorePoints, onCreateRestorePoint, onRestoreFromPoint, onDeleteRestorePoint, loadingRestorePoints, restorePointsError, user, isMaster, onLogin, onLogout, email, password, setEmail, setPassword, authLoading, saveImagePreview, loadingPriceHistory, priceHistoryError, onToggleSuspension, paymentSettings, setPaymentSettings, loadingPaymentSettings, setLoadingPaymentSettings, banners, setBanners, loadingBanners, bannerForm, setBannerForm, editingBanner, setEditingBanner, bannerImagePreview, setBannerImagePreview, uploadingBannerImage, onBannerSubmit, onBannerImageSelect, onClearBannerImage, onDeleteBanner, onEditBanner }) {
  const supabase = getSupabaseClient();
  
  // Cargar configuración de pago desde Supabase
  const loadPaymentSettings = useCallback(async () => {
    try {
      console.log('🔥 CARGANDO payment settings...');
      setLoadingPaymentSettings(true);
      
      // Buscar directamente el registro con ID fijo (más simple y confiable)
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      console.log('🔥 DATA DE SUPABASE:', data);
      console.log('🔥 DATA DE SUPABASE - is_active:', data?.is_active);
      console.log('🔥 DATA DE SUPABASE - mp_enabled:', data?.mp_enabled);
      console.log('🔥 DATA DE SUPABASE - transfer_enabled:', data?.transfer_enabled);
      console.log('🔥 ERROR DE SUPABASE:', error);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('🔥 Error cargando configuración de pago:', error);
        return;
      }
      
      if (data) {
        console.log('🔥 SETEANDO payment settings con datos:', data);
        const newSettings = {
          id: data.id,
          account_name: data.account_name || data.titular || '',
          bank_name: data.bank_name || data.banco || '',
          cbu: data.cbu || '',
          alias: data.alias || '',
          titular: data.titular || data.account_name || '',
          banco: data.banco || data.bank_name || '',
          mp_enabled: data.mp_enabled !== undefined ? data.mp_enabled : false,
          transfer_enabled: data.transfer_enabled !== undefined ? data.transfer_enabled : false,
          extra_message: data.extra_message || 'Una vez pagado, enviá el comprobante por mensaje 📩',
          is_active: data.is_active !== undefined ? data.is_active : true
        };
        console.log('🔥 NUEVOS SETTINGS (desde Supabase):', newSettings);
        // SOLO actualizar si los datos son diferentes
        setPaymentSettings(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newSettings)) {
            console.log('🔄 Actualizando estado con datos de Supabase');
            return newSettings;
          } else {
            console.log('⏭️ Estado sin cambios, omitiendo actualización');
            return prev;
          }
        });
      } else {
        console.log('🔥 NO HAY DATOS EN SUPABASE - usando valores por defecto');
        // Si no hay datos, crear registro por defecto
        await supabase
          .from('payment_settings')
          .upsert({
            id: '00000000-0000-0000-0000-000000000000',
            mp_enabled: false,
            transfer_enabled: false,
            is_active: true
          }, { onConflict: 'id' });
      }
    } catch (error) {
      console.error('🔥 Error cargando configuración de pago:', error);
    } finally {
      setLoadingPaymentSettings(false);
    }
  }, []);

  // Guardar configuración de pago en Supabase
  const savePaymentSettings = async () => {
  try {
    console.log('🔥 GUARDANDO paymentSettings:', JSON.stringify(paymentSettings, null, 2));
    let error;
    
    // Usar UPSERT con el registro activo - SIN desactivar otros primero
    const result = await supabase
      .from('payment_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000000', // UUID por defecto
        account_name: paymentSettings.account_name,
        bank_name: paymentSettings.bank_name,
        cbu: paymentSettings.cbu,
        alias: paymentSettings.alias,
        titular: paymentSettings.titular,
        banco: paymentSettings.banco,
        mp_enabled: paymentSettings.mp_enabled,
        transfer_enabled: paymentSettings.transfer_enabled,
        extra_message: paymentSettings.extra_message,
        is_active: true // Siempre marcar como activo el registro actual
      }, {
        onConflict: 'id' // si hay conflicto en id, hace update
      });

    console.log('🔥 RESULTADO UPSERT:', result);
    error = result.error;

    if (error) {
      console.error('🔥 ERROR EN UPSERT:', error);
      throw error;
    }

    console.log('🔥 UPSERT EXITOSO - Registro activo guardado');
    alert('✅ Guardado correctamente');
  } catch (error) {
    console.error('🔥 ERROR GENERAL guardando:', error);
    alert('❌ Error: ' + error.message);
  }
};

  // Cargar datos al montar el componente - SOLO una vez
  useEffect(() => {
    console.log('🚀 AdminPanel montado - cargando payment settings UNA VEZ');
    loadPaymentSettings();
  }, []);

  const input = { width:"100%", padding:"10px 13px", borderRadius:9, border:"1px solid #E5E7EB", fontSize:14, fontFamily:"'Poppins',sans-serif", marginTop:5, outline:"none" };

  if (!user || !isMaster) {
    return (
      <div style={{ maxWidth:400, margin:"0 auto", padding:"40px 16px" }}>
        <div style={{ background:"#111", borderRadius:16, padding:"30px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"white", fontSize:24, letterSpacing:2, marginBottom:8 }}>🔐 ACCESO ADMIN</div>
          <div style={{ color:"#9CA3AF", fontSize:13, marginBottom:24 }}>Solo usuarios maestros autorizados</div>
          
          <div style={{ background:"white", borderRadius:12, padding:24, textAlign:"left" }}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#6B7280", marginBottom:6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email de usuario maestro"
                disabled={authLoading}
                style={{ width:"100%", padding:"12px 16px", borderRadius:9, border:"1px solid #E5E7EB", fontSize:14, fontFamily:"'Poppins',sans-serif", outline:"none", background: authLoading ? "#F9FAFB" : "white", opacity: authLoading ? 0.6 : 1 }}
              />
            </div>
            
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#6B7280", marginBottom:6 }}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                disabled={authLoading}
                onKeyPress={(e) => e.key === 'Enter' && onLogin()}
                style={{ width:"100%", padding:"12px 16px", borderRadius:9, border:"1px solid #E5E7EB", fontSize:14, fontFamily:"'Poppins',sans-serif", outline:"none", background: authLoading ? "#F9FAFB" : "white", opacity: authLoading ? 0.6 : 1 }}
              />
            </div>
            
            <button
              onClick={onLogin}
              disabled={authLoading || !email || !password}
              style={{ width:"100%", background: authLoading || !email || !password ? "#9CA3AF" : "#C41E3A", color:"white", border:"none", borderRadius:9, padding:"12px 16px", fontSize:14, fontWeight:600, fontFamily:"'Poppins',sans-serif", cursor: authLoading || !email || !password ? "not-allowed" : "pointer", transition:"all 0.2s", opacity: authLoading || !email || !password ? 0.6 : 1 }}
            >
              {authLoading ? "Iniciando sesión..." : "🔐 Iniciar Sesión"}
            </button>
            
            {user && !isMaster && (
              <div style={{ marginTop:16, padding:12, background:"#FEE2E2", borderRadius:8, fontSize:12, color:"#991B1B", textAlign:"center" }}>
                ⚠️ Acceso denegado. Este usuario no tiene permisos de administrador.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"16px 12px 48px" }}>
      <div style={{ background:"#111", borderRadius:16, padding:"20px 24px", margin:"16px 0 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", color:"white", fontSize:26, letterSpacing:3 }}>⚙️ PANEL DE ADMINISTRACIÓN</div>
          <div style={{ color:"#9CA3AF", fontSize:13, marginTop:4 }}>{products.length} productos · Star Family Mayorista</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:"white", fontSize:12, marginBottom:4 }}>Usuario: {user?.email}</div>
          <div style={{ color:"#F5A623", fontSize:11, marginBottom:8 }}>👑 Usuario Master</div>
          <button
            onClick={onLogout}
            style={{
              background:"#DC2626",
              color:"white",
              border:"none",
              borderRadius:6,
              padding:"6px 12px",
              fontSize:12,
              fontWeight:600,
              fontFamily:"'Poppins',sans-serif",
              cursor:"pointer",
              transition:"all 0.2s"
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          ["list","📋 Productos"],
          ["add", editing?"✏️ Editar":"➕ Agregar"],
          ["banners","🎆 Banners"],
          ["payment","💳 Pagos"],
          ["prices","💰 Precios"],
          ["history","📜 Historial"],
          ["restore","🔄 Restauración"],
          ["excel","📊 Excel"]
        ].map(([t,label]) => (
          <button key={t} onClick={() => setAdminTab(t)} style={{ background:adminTab===t?"#C41E3A":"white", color:adminTab===t?"white":"#374151", border:adminTab===t?"none":"1px solid #E5E7EB", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Poppins',sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: LIST */}
      {adminTab === "list" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
            <div>
              <span style={{ fontWeight:700 }}>{filteredProducts.length} de {products.length} productos</span>
              {(adminFilters.searchTerm || adminFilters.category || adminFilters.status !== 'all') && (
                <span style={{ fontSize:12, color:"#6B7280", marginLeft:8 }}>
                  • Filtrando
                </span>
              )}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { setEditing(false); setForm({ id:"", category:"Frescos", name:"", description:"", price:"", bulkInfo:"", image:"", custom_badge:"" }); setAdminTab("add"); }} className="btn-red" style={{ padding:"8px 14px", fontSize:13 }}>+ Nuevo</button>
            </div>
          </div>
          
          {/* FILTROS DE BÚSQUEDA */}
          <div style={{ background:"white", borderRadius:12, padding:16, marginBottom:16, border:"1px solid #E5E7EB" }}>
            <div style={{ fontWeight:700, marginBottom:12, color:"#374151", fontSize:14 }}>🔍 Filtros de Búsqueda</div>
            
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              {/* Búsqueda por nombre */}
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#6B7280", marginBottom:6 }}>Buscar por nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Salchicha, Hamburguesa..."
                  style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:13, fontFamily:"'Poppins',sans-serif", outline:"none" }}
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    window.adminSearchTerm = searchTerm;
                    const event = new CustomEvent('adminSearch', { detail: { searchTerm } });
                    window.dispatchEvent(event);
                  }}
                />
              </div>
              
              {/* Filtro por categoría */}
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#6B7280", marginBottom:6 }}>Categoría</label>
                <select
                  style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:13, fontFamily:"'Poppins',sans-serif", outline:"none", background:"white" }}
                  onChange={(e) => {
                    const category = e.target.value;
                    window.adminCategoryFilter = category;
                    const event = new CustomEvent('adminCategoryFilter', { detail: { category } });
                    window.dispatchEvent(event);
                  }}
                >
                  <option value="">Todas las categorías</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Filtro por estado */}
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#6B7280", marginBottom:0 }}>Estado:</label>
              <div style={{ display:"flex", gap:6 }}>
                <button
                  onClick={() => {
                    window.adminStatusFilter = 'all';
                    const event = new CustomEvent('adminStatusFilter', { detail: { status: 'all' } });
                    window.dispatchEvent(event);
                  }}
                  style={{
                    padding:"6px 12px",
                    borderRadius:6,
                    border:"1px solid #E5E7EB",
                    background:window.adminStatusFilter === 'all' ? "#C41E3A" : "white",
                    color:window.adminStatusFilter === 'all' ? "white" : "#374151",
                    fontSize:12,
                    fontWeight:600,
                    cursor:"pointer"
                  }}
                >
                  Todos
                </button>
                <button
                  onClick={() => {
                    window.adminStatusFilter = 'active';
                    const event = new CustomEvent('adminStatusFilter', { detail: { status: 'active' } });
                    window.dispatchEvent(event);
                  }}
                  style={{
                    padding:"6px 12px",
                    borderRadius:6,
                    border:"1px solid #E5E7EB",
                    background:window.adminStatusFilter === 'active' ? "#059669" : "white",
                    color:window.adminStatusFilter === 'active' ? "white" : "#374151",
                    fontSize:12,
                    fontWeight:600,
                    cursor:"pointer"
                  }}
                >
                  ✅ Activos
                </button>
                <button
                  onClick={() => {
                    window.adminStatusFilter = 'suspended';
                    const event = new CustomEvent('adminStatusFilter', { detail: { status: 'suspended' } });
                    window.dispatchEvent(event);
                  }}
                  style={{
                    padding:"6px 12px",
                    borderRadius:6,
                    border:"1px solid #E5E7EB",
                    background:window.adminStatusFilter === 'suspended' ? "#F59E0B" : "white",
                    color:window.adminStatusFilter === 'suspended' ? "white" : "#374151",
                    fontSize:12,
                    fontWeight:600,
                    cursor:"pointer"
                  }}
                >
                  ⏸️ Suspendidos
                </button>
              </div>
            </div>
            
            {/* Botón para limpiar filtros */}
            <div style={{ marginTop:12, textAlign:"right" }}>
              <button
                onClick={() => {
                  window.adminSearchTerm = '';
                  window.adminCategoryFilter = '';
                  window.adminStatusFilter = 'all';
                  document.querySelector('input[placeholder="Ej: Salchicha, Hamburguesa..."]').value = '';
                  document.querySelector('select').value = '';
                  const event = new CustomEvent('adminClearFilters', {});
                  window.dispatchEvent(event);
                }}
                style={{
                  padding:"6px 12px",
                  borderRadius:6,
                  border:"1px solid #6B7280",
                  background:"white",
                  color:"#6B7280",
                  fontSize:12,
                  fontWeight:600,
                  cursor:"pointer"
                }}
              >
                🔄 Limpiar filtros
              </button>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filteredProducts && filteredProducts.length > 0 ? (
              filteredProducts.filter(Boolean).map(p => (
              <div key={p.id} style={{ 
                background:"white", 
                borderRadius:12, 
                padding:"12px 16px", 
                display:"flex", 
                gap:12, 
                alignItems:"center", 
                boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                opacity: p?.suspended ? 0.7 : 1,
                border: p?.suspended ? "2px dashed #F59E0B" : "none"
              }}>
                <div style={{ width:46, height:46, borderRadius:10, background:`${CAT_COLOR[p?.category]||"#C41E3A"}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, overflow:"hidden" }}>
                  {p?.image_url ? <img src={p?.image_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" onError={e => { e.target.src = "https://via.placeholder.com/46x46/f5a623/ffffff?text=SF"; }} /> : (CAT_EMOJI[p?.category]||"🍖")}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                    <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p?.name || "Sin nombre"}</div>
                    {p?.suspended && (
                      <span style={{
                        background:"#F59E0B",
                        color:"white",
                        fontSize:10,
                        fontWeight:700,
                        borderRadius:4,
                        padding:"2px 6px",
                        whiteSpace:"nowrap"
                      }}>
                        ⏸️ SUSPENDIDO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>{p?.category} · <strong style={{ color:"#C41E3A" }}>{fmt(p?.price || 0)}</strong></div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button 
                    onClick={() => onToggleSuspension(p.id)} 
                    style={{ 
                      background: p?.suspended ? "#D1FAE5" : "#FEF3C7", 
                      border:"none", 
                      borderRadius:8, 
                      padding:"7px 11px", 
                      cursor:"pointer", 
                      fontSize:12,
                      color: p?.suspended ? "#059669" : "#D97706"
                    }}
                    title={p?.suspended ? "Activar producto" : "Suspender producto"}
                  >
                    {p?.suspended ? "✅ Activar" : "⏸️ Suspender"}
                  </button>
                  <button onClick={() => onEdit(p)} style={{ background:"#EFF6FF", border:"none", borderRadius:8, padding:"7px 11px", cursor:"pointer", fontSize:14 }}>✏️</button>
                  <button onClick={() => {
                    if (window.confirm(`¿Estás seguro que querés borrar "${p?.name || 'este producto'}"?\n\nEsta acción no se puede deshacer.`)) {
                      onDelete(p.id);
                    }
                  }} style={{ background:"#FEE2E2", border:"none", borderRadius:8, padding:"7px 11px", cursor:"pointer", fontSize:14 }}>🗑️</button>
                </div>
              </div>
            ))
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign:"center", padding:40, color:"#6B7280" }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
                <div style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>No se encontraron productos</div>
                <div style={{ fontSize:14 }}>
                  {(adminFilters.searchTerm || adminFilters.category || adminFilters.status !== 'all') 
                    ? "Intenta con otros filtros o limpiar los filtros para ver todos los productos"
                    : "No hay productos disponibles"
                  }
                </div>
              </div>
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
              <input 
                value={form.name} 
                onChange={e => handleProductNameChange(e.target.value)} 
                style={input} 
                placeholder="Ej: Salchichas Largas x6" 
              />
              {suggestedCategory && (
                <div style={{ 
                  fontSize:11, 
                  color:"#059669", 
                  marginTop:4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <span>💡</span>
                  <span>Categoría sugerida: <strong>{suggestedCategory}</strong></span>
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>CATEGORÍA *</label>
              {loadingCategories ? (
                <div style={{ ...input, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                  <span>Cargando categorías...</span>
                </div>
              ) : showNewCategoryInput ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    style={{ ...input, flex: 1 }}
                    placeholder="Nombre de nueva categoría"
                    onKeyPress={e => e.key === 'Enter' && handleAddNewCategory()}
                  />
                  <button
                    onClick={handleAddNewCategory}
                    style={{
                      padding: '10px 16px',
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: 9,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    ✅
                  </button>
                  <button
                    onClick={cancelNewCategory}
                    style={{
                      padding: '10px 16px',
                      background: '#DC2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: 9,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    ❌
                  </button>
                </div>
              ) : (
                <div>
                  <select 
                    value={form.category} 
                    onChange={e => handleCategoryChange(e.target.value)} 
                    style={{
                      ...input,
                      borderColor: categoryError ? '#DC2626' : '#E5E7EB',
                      backgroundColor: categoryError ? '#FEF2F2' : 'white'
                    }}
                  >
                    <option value="">Seleccionar categoría...</option>
                    {availableCategories.map(c => (
                      <option key={c} value={c}>
                        {c} {suggestedCategory === c && '💡'}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ fontSize: 11, color: categoryError ? '#DC2626' : '#6B7280' }}>
                      {categoryError || 'Seleccione una categoría existente o cree una nueva'}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {console.log('🔍 Botón eliminar - Condición:', { 
                        formCategory: form.category, 
                        adminCats: ADMIN_CATS, 
                        isInAdminCats: form.category ? ADMIN_CATS.includes(form.category) : 'N/A',
                        shouldShow: form.category && !ADMIN_CATS.includes(form.category)
                      })}
                      {form.category && !ADMIN_CATS.includes(form.category) && (
                        <button
                          onClick={() => handleDeleteCategory(form.category)}
                          style={{
                            background: 'none',
                            border: '1px solid #DC2626',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 11,
                            color: '#DC2626',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#DC2626';
                            e.target.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'white';
                            e.target.style.color = '#DC2626';
                          }}
                          title="Eliminar categoría personalizada"
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                      <button
                        onClick={() => setShowNewCategoryInput(true)}
                        style={{
                          background: 'none',
                          border: '1px solid #D1D5DB',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          color: '#6B7280',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.borderColor = '#C41E3A';
                          e.target.style.color = '#C41E3A';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.borderColor = '#D1D5DB';
                          e.target.style.color = '#6B7280';
                        }}
                      >
                        + Nueva categoría
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>ETIQUETA PERSONALIZADA</label>
              <input value={form.custom_badge} onChange={e => setForm({...form,custom_badge:e.target.value})} style={input} placeholder="Ej: Oferta, Nuevo, Edición Limitada (opcional)" />
              <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>Si se completa, reemplazará la categoría en el badge del producto</div>
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
                          maxWidth:300, 
                          height:150, 
                          objectFit:"contain", 
                          background:"#111827",
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

      {/* TAB: BANNERS */}
      {adminTab === "banners" && (
        <div style={{ background:"white", borderRadius:16, padding:24 }}>
          <h3 style={{ margin:"0 0 6px", fontWeight:800 }}>🎆 Gestión de Banners</h3>
          <p style={{ color:"#6B7280", fontSize:14, marginBottom:20 }}>Administrá los banners promocionales que se muestran en la tienda.</p>
          
          {/* FORMULARIO DE BANNER */}
          <div style={{ background:"#F9FAFB", borderRadius:12, padding:20, marginBottom:24 }}>
            <h4 style={{ margin:"0 0 16px", fontWeight:700, fontSize:16 }}>
              {editingBanner ? "✏️ Editar Banner" : "➕ Agregar Banner"}
            </h4>
            
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>Título (opcional)</label>
                <input
                  type="text"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:"1px solid #E5E7EB", fontSize:14, fontFamily:"'Poppins',sans-serif", marginTop:5, outline:"none" }}
                  placeholder="Ej: Promo Especial"
                />
              </div>
              
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>Enlace (opcional)</label>
                <input
                  type="url"
                  value={bannerForm.link}
                  onChange={(e) => setBannerForm({...bannerForm, link: e.target.value})}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:"1px solid #E5E7EB", fontSize:14, fontFamily:"'Poppins',sans-serif", marginTop:5, outline:"none" }}
                  placeholder="https://ejemplo.com"
                />
              </div>
            </div>
            
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>Descripción (opcional)</label>
              <textarea
                value={bannerForm.description}
                onChange={(e) => setBannerForm({...bannerForm, description: e.target.value})}
                style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:"1px solid #E5E7EB", fontSize:14, fontFamily:"'Poppins',sans-serif", marginTop:5, outline:"none", minHeight:80, resize:"vertical" }}
                placeholder="Descripción del banner..."
              />
            </div>
            
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>Imagen del Banner *</label>
              <input
                type="file"
                accept="image/*"
                style={{ display:"none" }}
                onChange={onBannerImageSelect}
                id="banner-file-input"
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
                onClick={() => document.getElementById('banner-file-input').click()}
                onMouseOver={(e) => { e.target.style.borderColor="#C41E3A"; e.target.style.background="#FFF5F5"; }}
                onMouseOut={(e) => { e.target.style.borderColor="#E5E7EB"; e.target.style.background="#FAFAFA"; }}
              >
                {bannerImagePreview ? (
                  <div style={{ position:"relative" }}>
                    <img 
                      src={bannerImagePreview} 
                      alt="Vista previa del banner" 
                      style={{ 
                        width: "100%", 
                        maxWidth:300, 
                        height:150, 
                        objectFit:"contain", 
                        background:"#111827",
                        borderRadius:8,
                        border:"1px solid #E5E7EB"
                      }} 
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearBannerImage();
                      }}
                      style={{
                        position:"absolute",
                        top:8,
                        right:8,
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
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:32, marginBottom:8 }}>🎆</div>
                    <div style={{ fontWeight:600, color:"#374151", marginBottom:4 }}>
                      {uploadingBannerImage ? "Subiendo imagen..." : "Hacé clic para subir imagen del banner"}
                    </div>
                    <div style={{ fontSize:12, color:"#9CA3AF" }}>
                      Formatos: JPG, PNG, GIF (máx. 5MB) · Tamaño recomendado: 1200x300px
                    </div>
                  </div>
                )}
              </div>
              {uploadingBannerImage && (
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
            
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
              <input
                type="checkbox"
                id="banner-active"
                checked={bannerForm.active}
                onChange={(e) => setBannerForm({...bannerForm, active: e.target.checked})}
                style={{ width:16, height:16 }}
              />
              <label htmlFor="banner-active" style={{ fontSize:14, color:"#374151", cursor:"pointer" }}>
                Banner activo (visible en la tienda)
              </label>
            </div>
            
            <div style={{ display:"flex", gap:10 }}>
              <button 
                onClick={onBannerSubmit} 
                className="btn-red" 
                style={{ flex:1, padding:12, fontSize:14, borderRadius:10, justifyContent:"center" }}
                disabled={!bannerForm.image_url || uploadingBannerImage}
              >
                {editingBanner ? "💾 Guardar cambios" : "✅ Agregar banner"}
              </button>
              {editingBanner && (
                <button 
                  onClick={() => {
                    setEditingBanner(false);
                    setBannerForm({
                      id: '',
                      title: '',
                      description: '',
                      image_url: '',
                      link: '',
                      active: true
                    });
                    setBannerImagePreview(null);
                  }} 
                  style={{ background:"#F4F4F5", color:"#6B7280", border:"none", borderRadius:10, padding:"12px 20px", cursor:"pointer", fontSize:14, fontFamily:"'Poppins',sans-serif" }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
          
          {/* LISTA DE BANNERS */}
          <div>
            <h4 style={{ margin:"0 0 16px", fontWeight:700, fontSize:16 }}>
              📋 Banners Existentes ({banners.length})
            </h4>
            
            {loadingBanners ? (
              <div style={{ textAlign:"center", padding:40, color:"#6B7280" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>🔄</div>
                <div>Cargando banners...</div>
              </div>
            ) : banners.length === 0 ? (
              <div style={{ textAlign:"center", padding:40, color:"#6B7280", background:"#F9FAFB", borderRadius:12 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🎆</div>
                <div style={{ fontWeight:600, marginBottom:4 }}>No hay banners aún</div>
                <div style={{ fontSize:12 }}>Agregá tu primer banner usando el formulario de arriba</div>
              </div>
            ) : (
              <div style={{ display:"grid", gap:12 }}>
                {banners.map((banner) => (
                  <div key={banner.id} style={{ 
                    border:"1px solid #E5E7EB", 
                    borderRadius:12, 
                    padding:16, 
                    display:"flex", 
                    gap:16,
                    background:"white",
                    position:"relative"
                  }}>
                    {/* Imagen miniatura */}
                    <div style={{ flexShrink:0 }}>
                      {banner.image_url ? (
                        <img 
                          src={banner.image_url} 
                          alt={banner.title || "Banner"} 
                          style={{ 
                            width:120, 
                            height:60, 
                            objectFit:"contain", 
                            background:"#111827",
                            borderRadius:8,
                            border:"1px solid #E5E7EB"
                          }} 
                        />
                      ) : (
                        <div style={{ 
                          width:120, 
                          height:60, 
                          background:"#F3F4F6", 
                          borderRadius:8, 
                          display:"flex", 
                          alignItems:"center", 
                          justifyContent:"center",
                          color:"#9CA3AF",
                          fontSize:12
                        }}>
                          Sin imagen
                        </div>
                      )}
                    </div>
                    
                    {/* Información */}
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>
                        {banner.title || "Sin título"}
                      </div>
                      {banner.description && (
                        <div style={{ fontSize:12, color:"#6B7280", marginBottom:4 }}>
                          {banner.description}
                        </div>
                      )}
                      {banner.link && (
                        <div style={{ fontSize:12, color:"#2563EB", marginBottom:4 }}>
                          🔗 {banner.link}
                        </div>
                      )}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                        <span style={{ 
                          fontSize:11, 
                          padding:"2px 8px", 
                          borderRadius:12, 
                          background:banner.active ? "#DCFCE7" : "#FEE2E2",
                          color:banner.active ? "#166534" : "#991B1B",
                          fontWeight:600
                        }}>
                          {banner.active ? "✅ Activo" : "❌ Inactivo"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Acciones */}
                    <div style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                      <button
                        onClick={() => onEditBanner(banner)}
                        style={{
                          padding:"6px 10px",
                          borderRadius:6,
                          border:"1px solid #3B82F6",
                          background:"#3B82F6",
                          color:"white",
                          fontWeight:600,
                          cursor:"pointer",
                          fontSize:12,
                          transition:"background 0.2s"
                        }}
                        onMouseOver={(e) => e.target.style.background = "#2563EB"}
                        onMouseOut={(e) => e.target.style.background = "#3B82F6"}
                        title="Editar banner"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteBanner(banner.id)}
                        style={{
                          padding:"6px 10px",
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
                        title="Eliminar banner"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PAYMENT SETTINGS */}
      {adminTab === "payment" && (
        <div style={{ background:"white", borderRadius:16, padding:24 }}>
          <h3 style={{ margin:"0 0 6px", fontWeight:800 }}>💳 Métodos de Pago</h3>
          <p style={{ color:"#6B7280", fontSize:14, marginBottom:24 }}>Configurá qué métodos de pago están disponibles para los clientes.</p>
          
          {/* Métodos Habilitados */}
          <div style={{ marginBottom:32 }}>
            <h4 style={{ margin:"0 0 16px", fontWeight:700, fontSize:16 }}>🔧 Métodos Activos</h4>
            
            {/* Mercado Pago Toggle */}
            <div style={{ 
              display:"flex", 
              justifyContent:"space-between", 
              alignItems:"center", 
              padding:"16px", 
              background:"#F9FAFB", 
              borderRadius:12, 
              border:"1px solid #E5E7EB",
              marginBottom:12 
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:24 }}>💳</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Mercado Pago</div>
                  <div style={{ fontSize:13, color:"#6B7280" }}>Pago online con tarjeta, débito o efectivo</div>
                </div>
              </div>
              <label style={{ position:"relative", display:"inline-block", width:48, height:24 }}>
                <input 
                  type="checkbox" 
                  checked={paymentSettings?.mp_enabled === true}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    console.log('🔄 Toggle mp_enabled cambiado a:', newValue);
                    // Actualizar estado local inmediatamente
                    setPaymentSettings(prev => {
                      const updated = {...prev, mp_enabled: newValue};
                      console.log('📝 Estado local actualizado:', updated);
                      return updated;
                    });
                    // Guardar automáticamente el cambio
                    const saveChange = async () => {
                      const supabase = getSupabaseClient();
                      if (supabase) {
                        try {
                          console.log('💾 Guardando mp_enabled:', newValue);
                          console.log('💾 Objeto completo a guardar:', {
                            id: '00000000-0000-0000-0000-000000000000',
                            mp_enabled: newValue,
                            transfer_enabled: paymentSettings.transfer_enabled,
                            extra_message: paymentSettings.extra_message,
                            is_active: true
                          });
                          const { error } = await supabase
                            .from('payment_settings')
                            .upsert({
                              id: '00000000-0000-0000-0000-000000000000',
                              mp_enabled: newValue,
                              transfer_enabled: paymentSettings.transfer_enabled,
                              extra_message: paymentSettings.extra_message,
                              is_active: true
                            }, { onConflict: 'id' });
                          
                          if (error) {
                            console.error('❌ Error guardando mp_enabled:', error);
                          } else {
                            console.log('✅ mp_enabled guardado correctamente:', newValue);
                          }
                        } catch (err) {
                          console.error('❌ Error general guardando:', err);
                        }
                      }
                    };
                    saveChange();
                  }}
                  style={{ opacity:0, width:0, height:0 }}
                />
                <span style={{
                  position:"absolute",
                  cursor:"pointer",
                  top:0,
                  left:0,
                  right:0,
                  bottom:0,
                  backgroundColor: paymentSettings?.mp_enabled === true ? "#10B981" : "#D1D5DB",
                  transition:"0.3s",
                  borderRadius:24
                }}>
                  <span style={{
                    position:"absolute",
                    content:"\"",
                    height:18,
                    width:18,
                    left: paymentSettings?.mp_enabled === true ? 26 : 3,
                    bottom:3,
                    backgroundColor:"white",
                    transition:"0.3s",
                    borderRadius:50
                  }}></span>
                </span>
              </label>
            </div>

            {/* Transferencia Toggle */}
            <div style={{ 
              display:"flex", 
              justifyContent:"space-between", 
              alignItems:"center", 
              padding:"16px", 
              background:"#F9FAFB", 
              borderRadius:12, 
              border:"1px solid #E5E7EB" 
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:24 }}>🏦</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Transferencia Bancaria</div>
                  <div style={{ fontSize:13, color:"#6B7280" }}>Transferencia o depósito bancario tradicional</div>
                </div>
              </div>
              <label style={{ position:"relative", display:"inline-block", width:48, height:24 }}>
                <input 
                  type="checkbox" 
                  checked={paymentSettings?.transfer_enabled === true}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    console.log('🔄 Toggle transfer_enabled cambiado a:', newValue);
                    // Actualizar estado local inmediatamente
                    setPaymentSettings(prev => {
                      const updated = {...prev, transfer_enabled: newValue};
                      console.log('📝 Estado local actualizado:', updated);
                      return updated;
                    });
                    // Guardar automáticamente el cambio
                    const saveChange = async () => {
                      const supabase = getSupabaseClient();
                      if (supabase) {
                        try {
                          console.log('💾 Guardando transfer_enabled:', newValue);
                          console.log('💾 Objeto completo a guardar:', {
                            id: '00000000-0000-0000-0000-000000000000',
                            mp_enabled: paymentSettings.mp_enabled,
                            transfer_enabled: newValue,
                            extra_message: paymentSettings.extra_message,
                            is_active: true
                          });
                          const { error } = await supabase
                            .from('payment_settings')
                            .upsert({
                              id: '00000000-0000-0000-0000-000000000000',
                              mp_enabled: paymentSettings.mp_enabled,
                              transfer_enabled: newValue,
                              extra_message: paymentSettings.extra_message,
                              is_active: true
                            }, { onConflict: 'id' });
                          
                          if (error) {
                            console.error('❌ Error guardando transfer_enabled:', error);
                          } else {
                            console.log('✅ transfer_enabled guardado correctamente:', newValue);
                          }
                        } catch (err) {
                          console.error('❌ Error general guardando:', err);
                        }
                      }
                    };
                    saveChange();
                  }}
                  style={{ opacity:0, width:0, height:0 }}
                />
                <span style={{
                  position:"absolute",
                  cursor:"pointer",
                  top:0,
                  left:0,
                  right:0,
                  bottom:0,
                  backgroundColor: paymentSettings?.transfer_enabled === true ? "#10B981" : "#D1D5DB",
                  transition:"0.3s",
                  borderRadius:24
                }}>
                  <span style={{
                    position:"absolute",
                    content:"\"",
                    height:18,
                    width:18,
                    left: paymentSettings?.transfer_enabled === true ? 26 : 3,
                    bottom:3,
                    backgroundColor:"white",
                    transition:"0.3s",
                    borderRadius:50
                  }}></span>
                </span>
              </label>
            </div>
          </div>

          {/* Datos Bancarios */}
          <div style={{ marginBottom:32 }}>
            <h4 style={{ margin:"0 0 16px", fontWeight:700, fontSize:16 }}>🏦 Datos Bancarios</h4>
            
            <div style={{ display:"grid", gap:16 }}>
              {/* Titular */}
              <div>
                <label style={{ display:"block", fontWeight:600, fontSize:13, marginBottom:6, color:"#374151" }}>
                  Titular de la cuenta
                </label>
                <input
                  type="text"
                  value={paymentSettings?.titular || ''}
                  onChange={(e) => setPaymentSettings(prev => ({...prev, titular: e.target.value}))}
                  placeholder="Nombre completo del titular"
                  style={{
                    width:"100%",
                    padding:"10px 14px",
                    border:"1px solid #D1D5DB",
                    borderRadius:8,
                    fontSize:14,
                    background:"white"
                  }}
                />
              </div>

              {/* Banco */}
              <div>
                <label style={{ display:"block", fontWeight:600, fontSize:13, marginBottom:6, color:"#374151" }}>
                  Banco
                </label>
                <input
                  type="text"
                  value={paymentSettings?.banco || ''}
                  onChange={(e) => setPaymentSettings(prev => ({...prev, banco: e.target.value}))}
                  placeholder="Nombre del banco"
                  style={{
                    width:"100%",
                    padding:"10px 14px",
                    border:"1px solid #D1D5DB",
                    borderRadius:8,
                    fontSize:14,
                    background:"white"
                  }}
                />
              </div>

              {/* CBU */}
              <div>
                <label style={{ display:"block", fontWeight:600, fontSize:13, marginBottom:6, color:"#374151" }}>
                  CBU
                </label>
                <input
                  type="text"
                  value={paymentSettings?.cbu || ''}
                  onChange={(e) => setPaymentSettings(prev => ({...prev, cbu: e.target.value}))}
                  placeholder="0000000000000000000000000000"
                  style={{
                    width:"100%",
                    padding:"10px 14px",
                    border:"1px solid #D1D5DB",
                    borderRadius:8,
                    fontSize:14,
                    background:"white",
                    fontFamily:"monospace"
                  }}
                />
              </div>

              {/* Alias */}
              <div>
                <label style={{ display:"block", fontWeight:600, fontSize:13, marginBottom:6, color:"#374151" }}>
                  Alias
                </label>
                <input
                  type="text"
                  value={paymentSettings?.alias || ''}
                  onChange={(e) => setPaymentSettings(prev => ({...prev, alias: e.target.value}))}
                  placeholder="tu.alias.bancario"
                  style={{
                    width:"100%",
                    padding:"10px 14px",
                    border:"1px solid #D1D5DB",
                    borderRadius:8,
                    fontSize:14,
                    background:"white"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
            <button
              onClick={savePaymentSettings}
              style={{
                padding:"12px 24px",
                background:"#10B981",
                color:"white",
                border:"none",
                borderRadius:8,
                fontWeight:600,
                fontSize:14,
                cursor:"pointer",
                transition:"background 0.2s"
              }}
              onMouseOver={(e) => e.target.style.background = "#059669"}
              onMouseOut={(e) => e.target.style.background = "#10B981"}
            >
              💾 Guardar Configuración
            </button>
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
        <PriceHistory 
          priceHistory={priceHistory} 
          loading={loadingPriceHistory}
          error={priceHistoryError}
        />
      )}

      {/* TAB: RESTORE */}
      {adminTab === "restore" && (
        <RestorePoints 
          restorePoints={restorePoints}
          onCreateRestorePoint={onCreateRestorePoint}
          onRestoreFromPoint={onRestoreFromPoint}
          onDeleteRestorePoint={onDeleteRestorePoint}
          loadingRestorePoints={loadingRestorePoints}
          restorePointsError={restorePointsError}
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
  
  /* Bloquear scroll del body cuando el carrito está abierto */
  body.cart-open { overflow: hidden; position: fixed; width: 100%; }

  .cart-drawer { position:fixed; top:62px; right:0; width:380px; max-width:100vw; height:calc(100vh - 62px); background:white; z-index:450; box-shadow:-6px 0 32px rgba(0,0,0,0.15); transform:translateX(100%); transition:transform 0.3s cubic-bezier(0.4,0,0.2,1); overflow-y:auto; }
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
  
  /* Imágenes de productos adaptadas SOLO para móviles */
  @media(max-width:640px) { 
    .product-card img { 
      width: 100%; 
      height: 250px; 
      object-fit: cover; 
      display: block; 
    } 
  }

  .btn-red { display:inline-flex; align-items:center; background:#C41E3A; color:white; border:none; border-radius:10px; padding:9px 18px; cursor:pointer; font-size:14px; font-weight:700; font-family:'Poppins',sans-serif; transition:background 0.15s; }
  .btn-red:hover { background:#A01731; }
  .btn-ghost { display:inline-flex; align-items:center; background:transparent; color:#9CA3AF; border:1px solid #374151; border-radius:9px; padding:7px 14px; cursor:pointer; font-size:13px; font-weight:600; font-family:'Poppins',sans-serif; transition:all 0.15s; }
  .btn-ghost:hover { border-color:#9CA3AF; color:white; }

  .btn-add-cart { background:#C41E3A; color:white; border:none; border-radius:8px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:22px; font-weight:700; flex-shrink:0; transition:background 0.15s; line-height:1; }
  .btn-add-cart:hover { background:#A01731; }

  @media(max-width:480px) { .cart-drawer { top:0; width:100vw; height:100dvh; background:#fff; z-index:1000; } }
`;
