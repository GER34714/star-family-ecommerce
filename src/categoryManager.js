// ═══════════════════════════════════════════════════════
// CATEGORY MANAGER - SUGERENCIA AUTOMÁTICA Y VALIDACIÓN
// ═══════════════════════════════════════════════════════

// Palabras clave para sugerencia automática de categorías
const CATEGORY_KEYWORDS = {
  'Embutidos': ['salchicha', 'pancho', 'viena', 'longaniza', 'chorizo', 'morcilla', 'bondiola', 'jamon', 'mortadela', 'salame'],
  'Lácteos': ['queso', 'crema', 'leche', 'yogur', 'manteca', 'dulce de leche', 'ricotta'],
  'Panadería': ['pan', 'medialuna', 'factura', 'chipa', 'pan dulce', 'pan integral', 'baguette'],
  'Carnes': ['carne', 'hamburguesa', 'milanesa', 'bife', 'asado', 'costilla', 'vacio', 'cuadril'],
  'Congelados': ['pizza', 'empanada', 'tarta', 'helado', 'papas fritas', 'nuggets'],
  'Bebidas': ['agua', 'gaseosa', 'jugo', 'cerveza', 'vino', 'refresco'],
  'Snacks': ['papas', 'chips', 'mani', 'aceituna', 'palmito', 'snack'],
  'Aderezos': ['mayonesa', 'ketchup', 'mostaza', 'salsa', 'aderezo', 'vinagre'],
  'Pastas': ['fideos', 'ñoquis', 'ravioles', 'sorrentinos', 'lasaña', 'tallarines'],
  'Verduras': ['lechuga', 'tomate', 'cebolla', 'pimiento', 'zanahoria', 'verdura'],
  'Frutas': ['manzana', 'banana', 'naranja', 'pera', 'uva', 'fruta'],
  'Perfumería': ['jabón', 'shampoo', 'crema corporal', 'desodorante', 'perfume'],
  'Limpieza': ['lavandina', 'detergente', 'limpiador', 'palo', 'trapo', 'escoba']
};

// Función para normalizar texto a Title Case
export const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espacios
    .split(' ')
    .map(word => {
      // Palabras que siempre van en minúscula (excepto al inicio)
      const lowerCaseWords = ['de', 'la', 'el', 'en', 'y', 'o', 'con', 'sin', 'del'];
      if (lowerCaseWords.includes(word) && str.indexOf(word) > 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Función para sugerir categoría automáticamente basada en palabras clave
export const suggestCategory = (productName) => {
  if (!productName || typeof productName !== 'string') return null;
  
  const name = productName.toLowerCase().trim();
  
  // Buscar coincidencias exactas primero
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return category;
      }
    }
  }
  
  return null;
};

// Función para validar si una categoría es válida
export const isValidCategory = (category, availableCategories = []) => {
  if (!category || typeof category !== 'string') return false;
  
  const normalizedCategory = toTitleCase(category.trim());
  return availableCategories.some(cat => 
    cat.toLowerCase() === normalizedCategory.toLowerCase()
  );
};

// Función para verificar si una categoría ya existe (case insensitive)
export const categoryExists = (categoryName, existingCategories = []) => {
  if (!categoryName || typeof categoryName !== 'string') return false;
  
  const normalized = categoryName.toLowerCase().trim();
  return existingCategories.some(cat => 
    typeof cat === 'string' && cat.toLowerCase().trim() === normalized
  );
};

// Función para crear nueva categoría con formato normalizado
export const createCategory = (categoryName, existingCategories = []) => {
  if (!categoryName || typeof categoryName !== 'string') return null;
  
  const normalized = toTitleCase(categoryName.trim());
  
  // Verificar que no exista
  if (categoryExists(normalized, existingCategories)) {
    return null; // Ya existe
  }
  
  return normalized;
};

// Función para obtener todas las categorías disponibles (desde Supabase o fallback)
export const getAvailableCategories = async (supabase) => {
  try {
    if (!supabase) {
      // Fallback a categorías hardcoded si no hay Supabase
      return [
        'Frescos', 'Completos', 'Panchos Armados', 'Hamburguesas', 
        'Pizzas y Empanadas', 'Medialunas y Chipas', 'Combos'
      ];
    }
    
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name');
    
    if (error) throw error;
    
    return data.map(cat => cat.name);
  } catch (error) {
    console.error('Error cargando categorías:', error);
    // Fallback a categorías hardcoded
    return [
      'Frescos', 'Completos', 'Panchos Armados', 'Hamburguesas', 
      'Pizzas y Empanadas', 'Medialunas y Chipas', 'Combos'
    ];
  }
};

// Función para agregar nueva categoría a Supabase
export const addCategoryToSupabase = async (supabase, categoryName) => {
  if (!supabase || !categoryName) return null;
  
  try {
    const normalizedCategory = toTitleCase(categoryName.trim());
    
    // Verificar que no exista ya
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', normalizedCategory)
      .single();
    
    if (existing) {
      console.warn('La categoría ya existe:', normalizedCategory);
      return existing.id;
    }
    
    // Insertar nueva categoría
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: normalizedCategory,
        emoji: '📦', // Emoji por defecto
        color: '#C41E3A' // Color por defecto
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Categoría creada:', normalizedCategory);
    return data.id;
  } catch (error) {
    console.error('Error creando categoría:', error);
    return null;
  }
};

// Función para ocultar categoría en la tienda (sin eliminar de BD)
export const hideCategoryFromShop = async (supabase, categoryName) => {
  if (!supabase || !categoryName) return false;
  
  try {
    const normalizedCategory = toTitleCase(categoryName.trim());
    console.log('👁️ Ocultando categoría de la tienda:', normalizedCategory);
    
    // Obtener el ID de la categoría
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', normalizedCategory)
      .single();
    
    if (categoryError) {
      console.warn('⚠️ Categoría no encontrada:', normalizedCategory);
      return false;
    }
    
    // Marcar categoría como oculta (inactive)
    const { error: updateError } = await supabase
      .from('categories')
      .update({ active: false })
      .eq('id', categoryData.id);
    
    if (updateError) throw updateError;
    
    console.log('✅ Categoría oculta en la tienda:', normalizedCategory);
    return true;
  } catch (error) {
    console.error('Error ocultando categoría:', error);
    return false;
  }
};

// Función para eliminar categoría de Supabase (eliminación completa)
export const deleteCategoryFromSupabase = async (supabase, categoryName) => {
  if (!supabase || !categoryName) return false;
  
  try {
    const normalizedCategory = toTitleCase(categoryName.trim());
    console.log('🗑️ Intentando eliminar categoría:', { original: categoryName, normalized: normalizedCategory });
    
    // Primero obtener el ID de la categoría
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', normalizedCategory)
      .single();
    
    console.log('📋 Búsqueda de categoría:', { data: categoryData, error: categoryError });
    
    if (categoryError) {
      console.warn('⚠️ Categoría no encontrada:', normalizedCategory, categoryError);
      return false;
    }
    
    // Verificar si hay productos usando esta categoría (por category_id)
    const { data: productsWithCategory, error: checkError } = await supabase
      .from('products')
      .select('id, category_id')
      .eq('category_id', categoryData.id)
      .limit(5);
    
    console.log('🔍 Verificación de productos:', { 
      categoryId: categoryData.id, 
      categoryName: normalizedCategory,
      productsFound: productsWithCategory, 
      error: checkError 
    });
    
    if (checkError) throw checkError;
    
    if (productsWithCategory && productsWithCategory.length > 0) {
      console.log('🔄 Actualizando productos para quitarles la categoría:', productsWithCategory.length, 'productos afectados');
      
      // Actualizar productos por category_id (relación)
      const { error: updateErrorById } = await supabase
        .from('products')
        .update({ 
          category_id: null 
        })
        .eq('category_id', categoryData.id);
      
      if (updateErrorById) {
        console.error('❌ Error actualizando productos por category_id:', updateErrorById);
      } else {
        console.log('✅ Productos actualizados por category_id correctamente');
      }
      
      // También actualizar productos por nombre de categoría (para productos nuevos)
      const { error: updateErrorByName } = await supabase
        .from('products')
        .update({ 
          category: '' 
        })
        .eq('category', normalizedCategory);
      
      if (updateErrorByName) {
        console.error('❌ Error actualizando productos por nombre:', updateErrorByName);
      } else {
        console.log('✅ Productos actualizados por nombre correctamente');
      }
      
      // Si ambos actualizaciones fallaron, lanzar error
      if (updateErrorById && updateErrorByName) {
        console.error('❌ Ambas actualizaciones fallaron');
        throw updateErrorById;
      }
      
      console.log('✅ Productos actualizados correctamente, ahora sin categoría');
    }
    
    // Eliminar categoría
    console.log('🗑️ Ejecutando eliminación de categoría:', normalizedCategory);
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('name', normalizedCategory);
    
    console.log('📋 Resultado de eliminación:', { error: deleteError });
    
    if (deleteError) throw deleteError;
    
    console.log('✅ Categoría eliminada exitosamente:', normalizedCategory);
    return true;
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    return false;
  }
};

// Hook React para manejo de categorías con sugerencia automática
export const useCategorySuggestion = (initialCategories = []) => {
  const [categories, setCategories] = useState(initialCategories);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  
  // Analizar nombre de producto y sugerir categoría
  const analyzeProductName = (productName) => {
    const suggestion = suggestCategory(productName);
    setSuggestedCategory(suggestion);
    return suggestion;
  };
  
  // Agregar nueva categoría
  const addNewCategory = (categoryName) => {
    const normalizedCategory = createCategory(categoryName, categories);
    if (normalizedCategory) {
      setCategories(prev => [...prev, normalizedCategory]);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      return normalizedCategory;
    }
    return null;
  };
  
  // Resetear sugerencia
  const clearSuggestion = () => {
    setSuggestedCategory(null);
  };
  
  return {
    categories,
    suggestedCategory,
    newCategoryName,
    showNewCategoryInput,
    setCategories,
    setNewCategoryName,
    setShowNewCategoryInput,
    analyzeProductName,
    addNewCategory,
    clearSuggestion
  };
};
