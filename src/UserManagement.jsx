// ═════════════════════════════════════════════════════
// COMPONENTE DE GESTIÓN DE USUARIOS PARA MAESTROS
// ═════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useMasterUser } from './useMasterUser';
import { MasterProtectedRoute } from './MasterProtectedRoute';

export const UserManagement = () => {
  const { 
    isMaster, 
    loading, 
    user, 
    createUser, 
    assignMasterPermissions, 
    getAllUsers, 
    deleteUser 
  } = useMasterUser();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    isMaster: false,
    role: 'user'
  });
  const [assignEmail, setAssignEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    if (isMaster && !loading) {
      loadUsers();
    }
  }, [isMaster, loading]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersList = await getAllUsers();
      setUsers(usersList || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      alert('Error al cargar usuarios: ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      alert('Por favor completa todos los campos');
      return;
    }

    setProcessing(true);
    try {
      await createUser(
        formData.email,
        formData.password,
        formData.isMaster,
        formData.role
      );
      
      alert('Usuario creado exitosamente');
      setFormData({ email: '', password: '', isMaster: false, role: 'user' });
      setShowCreateForm(false);
      loadUsers();
    } catch (error) {
      console.error('Error creando usuario:', error);
      alert('Error al crear usuario: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAssignMaster = async () => {
    if (!assignEmail) {
      alert('Por favor ingresa un email');
      return;
    }

    setProcessing(true);
    try {
      await assignMasterPermissions(assignEmail);
      alert('Permisos de master asignados exitosamente');
      setAssignEmail('');
      loadUsers();
    } catch (error) {
      console.error('Error asignando permisos:', error);
      alert('Error al asignar permisos: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`¿Estás seguro que deseas eliminar al usuario ${userEmail}?`)) {
      return;
    }

    setProcessing(true);
    try {
      await deleteUser(userId);
      alert('Usuario eliminado exitosamente');
      loadUsers();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert('Error al eliminar usuario: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <MasterProtectedRoute>
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              👥 Gestión de Usuarios
            </h2>
            <p className="text-gray-600">
              Panel de administración para gestionar usuarios y permisos del sistema
            </p>
          </div>

          {/* Actions */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ➕ Crear Nuevo Usuario
              </button>
              
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email para asignar master"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 flex-1 min-w-[250px]"
                />
                <button
                  onClick={handleAssignMaster}
                  disabled={processing || !assignEmail}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  👑 Asignar Master
                </button>
              </div>
            </div>
          </div>

          {/* Create User Form */}
          {showCreateForm && (
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Crear Nuevo Usuario</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isMaster}
                      onChange={(e) => setFormData({...formData, isMaster: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Usuario Master
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Creando...' : 'Crear Usuario'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users List */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Usuarios del Sistema</h3>
            
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay usuarios para mostrar
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Master
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Acceso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {userItem.email}
                          {userItem.id === user?.id && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Tú
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded text-xs ${
                            userItem.role === 'master' ? 'bg-purple-100 text-purple-800' :
                            userItem.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {userItem.role || 'user'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {userItem.is_master ? (
                            <span className="text-green-600 font-semibold">✅ Sí</span>
                          ) : (
                            <span className="text-gray-400">❌ No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(userItem.user_created_at).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userItem.last_sign_in_at 
                            ? new Date(userItem.last_sign_in_at).toLocaleDateString('es-AR')
                            : 'Nunca'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {userItem.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(userItem.id, userItem.email)}
                              disabled={processing}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MasterProtectedRoute>
  );
};

export default UserManagement;
