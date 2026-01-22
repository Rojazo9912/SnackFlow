import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { tenantsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      const data = await tenantsApi.getCurrent();
      setTenant(data);
      setFormData({
        name: data.name,
        slug: data.slug,
      });
    } catch (error) {
      toast.error('Error cargando configuracion');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updated = await tenantsApi.update(formData);
      setTenant(updated);
      updateUser({ tenant: updated });
      toast.success('Configuracion guardada');
    } catch (error: any) {
      toast.error(error.message || 'Error guardando configuracion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuracion</h1>

      <div className="card">
        <h2 className="font-semibold mb-4">Informacion del Negocio</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre del negocio
            </label>
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
            <label className="block text-sm font-medium mb-1">
              Identificador (slug)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                })
              }
              className="input"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              URL: {formData.slug}.snackflow.app
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold mb-4">Plan Actual</h2>
        <div className="p-4 bg-primary-50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-primary-700 capitalize">
                {tenant?.plan || 'Basico'}
              </p>
              <p className="text-sm text-gray-600">
                Tu plan actual de SnackFlow
              </p>
            </div>
            <button className="btn-secondary text-sm">Cambiar plan</button>
          </div>
        </div>
      </div>
    </div>
  );
}
