// ═════════════════════════════════════════════════════
// HOOK PERSONALIZADO PARA GESTIÓN DE USUARIOS MAESTROS
// ═════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from './supabaseClient';

export const useMasterUser = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const supabase = getSupabaseClient();

  // Verificar si el usuario actual es master
  const checkMasterStatus = useCallback(async (userId, retryCount = 0) => {
    if (!supabase || !userId) {
      console.log('🔍 checkMasterStatus: Sin supabase o userId - seteando isMaster=false');
      setIsMaster(false);
      return false;
    }

    // Evitar múltiples ejecuciones del log
    if (retryCount === 0) {
      console.log('🔍 checkMasterStatus: Verificando usuario:', userId);
    }

    // Crear AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_master, role, email')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);
      console.log('📊 Resultado Master Query:', { data, error });

      if (error) {
        console.error('❌ Error verificando estado de master:', {
          message: error.message,
          hint: error.hint,
          details: error.details,
          code: error.code,
          userId: userId
        });
        setIsMaster(false);
        return false;
      }

      const masterStatus = data?.is_master || false;
      console.log('✅ Estado master verificado:', {
        userId: userId,
        isMaster: masterStatus,
        profile: data
      });
      setIsMaster(masterStatus);
      setProfile(data);
      return masterStatus;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('❌ Timeout en consulta master:', userId);
        
        // Reintento automático si es timeout
        if (retryCount < 1) {
          console.log('🔄 Reintentando consulta master en 2 segundos...');
          setTimeout(() => checkMasterStatus(userId, retryCount + 1), 2000);
        }
      } else {
        console.error('❌ Error en checkMasterStatus (catch):', {
          message: error.message,
          stack: error.stack,
          userId: userId
        });
      }
      setIsMaster(false);
      return false;
    }
  }, [supabase]);

  // Iniciar sesión con email y contraseña
  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Configuración de Supabase no disponible');
    }

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setUser(data.user);
      
      // Verificar si es usuario master
      await checkMasterStatus(data.user.id);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    if (!supabase) {
      setUser(null);
      setProfile(null);
      setIsMaster(false);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error en signOut:', error);
    } finally {
      setUser(null);
      setProfile(null);
      setIsMaster(false);
    }
  };

  // Crear nuevo usuario (solo para masters)
  const createUser = async (email, password, isMaster = false, role = 'user') => {
    if (!isMaster) {
      throw new Error('Solo los usuarios maestros pueden crear nuevos usuarios');
    }

    if (!supabase) {
      throw new Error('Configuración de Supabase no disponible');
    }

    try {
      // 1. Crear usuario en auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Crear perfil en la tabla profiles
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            is_master: isMaster,
            role: isMaster ? 'master' : role,
          });

        if (profileError) throw profileError;
      }

      return { success: true, user: authData.user };
    } catch (error) {
      console.error('Error en createUser:', error);
      throw error;
    }
  };

  // Asignar permisos de master a usuario existente
  const assignMasterPermissions = async (email) => {
    if (!isMaster) {
      throw new Error('Solo los usuarios maestros pueden asignar permisos');
    }

    if (!supabase) {
      throw new Error('Configuración de Supabase no disponible');
    }

    try {
      // Obtener usuario por email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
      
      if (userError) {
        // Si el admin API no está disponible, intentar con RPC
        const { data, error } = await supabase.rpc('setup_master_user', {
          p_email: email,
        });

        if (error) throw error;
        return data;
      }

      if (!userData.user) {
        throw new Error('Usuario no encontrado');
      }

      // Actualizar perfil
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userData.user.id,
          email: email,
          is_master: true,
          role: 'master',
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, profile: data };
    } catch (error) {
      console.error('Error en assignMasterPermissions:', error);
      throw error;
    }
  };

  // Obtener todos los usuarios (solo para masters)
  const getAllUsers = async () => {
    if (!isMaster) {
      throw new Error('Solo los usuarios maestros pueden ver todos los usuarios');
    }

    if (!supabase) {
      throw new Error('Configuración de Supabase no disponible');
    }

    try {
      const { data, error } = await supabase
        .from('master_users_view')
        .select('*')
        .order('user_created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error en getAllUsers:', error);
      throw error;
    }
  };

  // Eliminar usuario (solo para masters)
  const deleteUser = async (userId) => {
    if (!isMaster) {
      throw new Error('Solo los usuarios maestros pueden eliminar usuarios');
    }

    if (!supabase) {
      throw new Error('Configuración de Supabase no disponible');
    }

    try {
      // Eliminar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Nota: La eliminación del usuario de auth.users requiere admin API
      // o debe hacerse desde el dashboard de Supabase

      return { success: true };
    } catch (error) {
      console.error('Error en deleteUser:', error);
      throw error;
    }
  };

  useEffect(() => {
  const initializeAuth = async () => {
    if (!supabase) {
      console.warn('⚠️ Supabase no disponible - Autenticación deshabilitada');
      setLoading(false);
      return;
    }

    try {
      // ✅ getSession() lee de localStorage, es instantáneo (no necesita timeout)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        // Esperar 500ms antes de verificar master para evitar colisión
        setTimeout(async () => {
          await checkMasterStatus(session.user.id);
        }, 500);
      }
    } catch (error) {
      console.warn('⚠️ Error inicializando autenticación:', error.message);
    } finally {
      setLoading(false);
    }
  };

  initializeAuth();

  if (supabase) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Esperar 500ms antes de verificar master para evitar colisión
          setTimeout(async () => {
            await checkMasterStatus(session.user.id);
          }, 500);
        } else {
          setUser(null);
          setProfile(null);
          setIsMaster(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }
}, [supabase, checkMasterStatus]); // Dependencia correcta: solo cambia cuando supabase o checkMasterStatus cambian

  return {
    // Estado
    user,
    profile,
    isMaster,
    loading,
    authLoading,

    // Métodos
    signIn,
    signOut,
    createUser,
    assignMasterPermissions,
    getAllUsers,
    deleteUser,
    checkMasterStatus,
  };
};
