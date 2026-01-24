import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { authApi, tenantsApi } from '../services/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    loadTenantInfo();
  }, []);

  const loadTenantInfo = async () => {
    try {
      // Always use the Ice-Cream-Shop tenant
      const slug = 'Ice-Cream-Shop';
      const info = await tenantsApi.getPublic(slug);
      setTenantInfo(info);
    } catch (error) {
      console.error('Error loading tenant info:', error);
      // Continue without logo if tenant not found
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      login(response.user, response.accessToken);
      toast.success('Bienvenido a SnackFlow');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            {tenantInfo?.logo && (
              <div className="mb-4 flex justify-center">
                <img
                  src={tenantInfo.logo}
                  alt={tenantInfo.name || 'Logo'}
                  className="h-24 w-auto object-contain"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-primary-600">
              {tenantInfo?.name || 'SnackFlow'}
            </h1>
            <p className="text-gray-500 mt-2">Sistema de Punto de Venta</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Correo electronico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/80 text-sm mt-6">
          &copy; 2026 SnackFlow. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
