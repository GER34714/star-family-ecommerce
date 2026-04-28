// ═════════════════════════════════════════════════════
// HOOK PERSONALIZADO PARA GESTIÓN DE USUARIOS MAESTROS
// ═════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { getSupabaseClient } from './supabaseClient';

export const useMasterUser = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const supabase = getSupabaseClient();

  // Verificar si el usuario actual es master
  const checkMasterStatus = async (userId) => {
    if (!supabase || !userId) {
      setIsMaster(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_master, role, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error verificando estado de master:', error);
        setIsMaster(false);
        return false;
      }

      const masterStatus = data?.is_master || false;
      setIsMaster(masterStatus);
      setProfile(data);
      return masterStatus;
    } catch (error) {
      console.error('Error en checkMasterStatus:', error);
      setIsMaster(false);
      return false;
    }
  };

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

  // Efecto para verificar estado de autenticación al cargar
  useEffect(() => {
    const initializeAuth = async () => {
      // Si no hay Supabase, no bloquear la aplicación
      if (!supabase) {
        console.warn('⚠️ Supabase no disponible - Autenticación deshabilitada');
        setLoading(false);
        return;
      }

      try {
        // Obtener usuario actual con timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de autenticación')), 3000)
        );
        
        const authPromise = supabase.auth.getUser();
        const { data: { user: currentUser } } = await Promise.race([authPromise, timeoutPromise]);
        
        if (currentUser) {
          setUser(currentUser);
          await checkMasterStatus(currentUser.id);
        }
      } catch (error) {
        console.warn('⚠️ Error inicializando autenticación:', error.message);
        // No bloquear la aplicación si falla la autenticación
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Escuchar cambios en la autenticación solo si Supabase está disponible
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            await checkMasterStatus(session.user.id);
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
  }, [supabase]);

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
