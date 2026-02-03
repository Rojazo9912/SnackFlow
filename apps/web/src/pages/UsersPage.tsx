import { useEffect, useState } from 'react';
import { Plus, Edit, Key } from 'lucide-react';
import { showToast } from '../utils/toast';
import { usersApi } from '../services/api';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ROLES, ROLE_LABELS, type UserRole } from '@snackflow/shared';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}

interface FormData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  pin: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    role: ROLES.SELLER,
    pin: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      showToast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          name: formData.name,
          role: formData.role,
        });
        showToast.success('Usuario actualizado');
      } else {
        await usersApi.create(formData);
        showToast.success('Usuario creado');
      }
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      showToast.error(error.message || 'Error guardando usuario');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.toggleActive(user.id);
      showToast.success(user.active ? 'Usuario desactivado' : 'Usuario activado');
      loadUsers();
    } catch (error: any) {
      showToast.error(error.message || 'Error cambiando estado');
    }
  };

  const handleUpdatePin = async (user: User) => {
    const pin = prompt('Nuevo PIN (4-6 digitos:');
    if (!pin || pin.length < 4 || pin.length > 6) {
      showToast.error('PIN invalido');
      return;
    }

    try {
      await usersApi.updatePin(user.id, pin);
      showToast.success('PIN actualizado');
    } catch (error: any) {
      showToast.error(error.message || 'Error actualizando PIN');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: ROLES.SELLER,
      pin: '',
    });
  };

  const getRoleLabel = (role: string) => {
    return ROLE_LABELS[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Usuarios"
        subtitle={`${users.length} usuarios registrados`}
        actions={
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Usuario
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Rol
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className={!user.active ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-sm">{getRoleLabel(user.role)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`px-2 py-1 text-xs rounded-full ${user.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {user.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleUpdatePin(user)}
                      className="p-1 text-gray-500 hover:text-primary-600 mr-1"
                      title="Cambiar PIN"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setFormData({
                          ...formData,
                          name: user.name,
                          role: user.role,
                        });
                        setShowModal(true);
                      }}
                      className="p-1 text-gray-500 hover:text-primary-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Contrasena *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="input"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rol *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as UserRole })
                  }
                  className="input"
                  required
                >
                  <option value={ROLES.SELLER}>{ROLE_LABELS[ROLES.SELLER]}</option>
                  <option value={ROLES.CASHIER}>{ROLE_LABELS[ROLES.CASHIER]}</option>
                  <option value={ROLES.SUPERVISOR}>{ROLE_LABELS[ROLES.SUPERVISOR]}</option>
                  <option value={ROLES.ADMIN}>{ROLE_LABELS[ROLES.ADMIN]}</option>
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    PIN (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) =>
                      setFormData({ ...formData, pin: e.target.value })
                    }
                    className="input"
                    placeholder="4-6 digitos"
                    maxLength={6}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingUser ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
