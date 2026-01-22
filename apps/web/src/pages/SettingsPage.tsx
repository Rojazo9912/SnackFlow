import { useEffect, useState } from 'react';
import { Save, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { tenantsApi, filesApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    logo: '',
    ticketHeader: '',
    ticketFooter: '',
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
        address: data.settings?.address || '',
        phone: data.settings?.phone || '',
        logo: data.settings?.logo || '',
        ticketHeader: data.settings?.ticketHeader || '',
        ticketFooter: data.settings?.ticketFooter || '',
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
      const { address, phone, logo, ticketHeader, ticketFooter, ...tenantData } = formData;
      const updated = await tenantsApi.update({
        ...tenantData,
        settings: {
          ...tenant.settings,
          address,
          phone,
          logo,
          ticketHeader,
          ticketFooter,
        }
      });
      setTenant(updated);
      updateUser({ tenant: updated });
      toast.success('Configuracion guardada');
    } catch (error: any) {
      toast.error(error.message || 'Error guardando configuracion');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await filesApi.uploadLogo(file);
      setFormData({ ...formData, logo: url });
      toast.success('Logo subido correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error subiendo logo');
    } finally {
      setUploading(false);
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

          <div className="border-t pt-4 mt-6">
            <h2 className="font-semibold mb-4">Personalización de Tickets</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Logo del Negocio</label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 group">
                  {formData.logo ? (
                    <>
                      <img src={formData.logo} alt="Logo preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo: '' })}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </>
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="logo-upload"
                    className={`btn-secondary text-sm cursor-pointer inline-flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG o JPG, máx. 2MB. Se recomienda fondo blanco.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                  placeholder="Calle, Ciudad, CP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+52 ..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Encabezado de Ticket</label>
                <input
                  type="text"
                  value={formData.ticketHeader}
                  onChange={(e) => setFormData({ ...formData, ticketHeader: e.target.value })}
                  className="input"
                  placeholder="¡Gracias por visitarnos!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pie de Ticket</label>
                <input
                  type="text"
                  value={formData.ticketFooter}
                  onChange={(e) => setFormData({ ...formData, ticketFooter: e.target.value })}
                  className="input"
                  placeholder="Síguenos en @redes_sociales"
                />
              </div>
            </div>
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
