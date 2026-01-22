import { useEffect, useState } from 'react';
import { Plus, Edit, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoriesApi } from '../services/api';

interface Category {
  id: string;
  name: string;
  position: number;
  active: boolean;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll(true);
      setCategories(data);
    } catch (error) {
      toast.error('Error cargando categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, { name });
        toast.success('Categoria actualizada');
      } else {
        await categoriesApi.create({ name });
        toast.success('Categoria creada');
      }
      setShowModal(false);
      setName('');
      setEditingCategory(null);
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || 'Error guardando categoria');
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await categoriesApi.toggleActive(category.id);
      toast.success(
        category.active ? 'Categoria desactivada' : 'Categoria activada'
      );
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || 'Error cambiando estado');
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            setName('');
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Categoria
        </button>
      </div>

      <div className="card">
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                !category.active ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                <span className="font-medium">{category.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(category)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    category.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category.active ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  onClick={() => {
                    setEditingCategory(category);
                    setName(category.name);
                    setShowModal(true);
                  }}
                  className="p-2 text-gray-500 hover:text-primary-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No hay categorias registradas
            </p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingCategory ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
