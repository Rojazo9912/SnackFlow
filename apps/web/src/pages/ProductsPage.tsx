import { useEffect, useState } from 'react';
import { Plus, Edit, Star, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, categoriesApi } from '../services/api';
import { RecipeEditor } from '../components/RecipeEditor';

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  active: boolean;
  is_favorite: boolean;
  is_composite: boolean;
  category_id: string;
  unit: string;
  categories: { id: string; name: string } | null;
}

interface Ingredient {
  ingredientId: string;
  quantity: number;
}

interface Category {
  id: string;
  name: string;
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    categoryId: '',
    isComposite: false,
    unit: 'pieza',
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        productsApi.getAll({ includeInactive: true } as any),
        categoriesApi.getAll(true),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      code: formData.code || undefined,
      price: parseFloat(formData.price),
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      stock: formData.stock ? parseInt(formData.stock) : 0,
      minStock: formData.minStock ? parseInt(formData.minStock) : undefined,
      categoryId: formData.categoryId || undefined,
      isComposite: formData.isComposite,
      unit: formData.unit,
    };

    try {
      let productId: string;
      if (editingProduct) {
        await productsApi.update(editingProduct.id, data);
        productId = editingProduct.id;
        toast.success('Producto actualizado');
      } else {
        const newProduct = await productsApi.create(data);
        productId = newProduct.id;
        toast.success('Producto creado');
      }

      if (formData.isComposite) {
        await productsApi.updateIngredients(productId, ingredients);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Error guardando producto');
    }
  };

  const handleEdit = (product: Product) => {
    handleEditSetup(product);
  };

  const handleEditSetup = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      code: product.code || '',
      price: product.price.toString(),
      cost: product.cost?.toString() || '',
      stock: product.stock?.toString() || '',
      minStock: product.min_stock?.toString() || '',
      categoryId: product.category_id || '',
      isComposite: product.is_composite || false,
      unit: product.unit || 'pieza',
    });

    if (product.is_composite) {
      try {
        const ingredientsData = await productsApi.getIngredients(product.id);
        setIngredients(ingredientsData);
      } catch (error) {
        toast.error('Error cargando ingredientes');
      }
    } else {
      setIngredients([]);
    }
    setShowModal(true);
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await productsApi.toggleActive(product.id);
      toast.success(product.active ? 'Producto desactivado' : 'Producto activado');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Error cambiando estado');
    }
  };

  const handleToggleFavorite = async (product: Product) => {
    try {
      await productsApi.toggleFavorite(product.id);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Error cambiando favorito');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      code: '',
      price: '',
      cost: '',
      stock: '',
      minStock: '',
      categoryId: '',
      isComposite: false,
      unit: 'pieza',
    });
    setIngredients([]);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Categoria
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  Precio
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  Stock
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
              {filteredProducts.map((product) => (
                <tr key={product.id} className={!product.active ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFavorite(product)}
                        className={`p-1 rounded ${product.is_favorite
                          ? 'text-yellow-500'
                          : 'text-gray-300 hover:text-yellow-500'
                          }`}
                      >
                        <Star
                          className={`w-4 h-4 ${product.is_favorite ? 'fill-current' : ''
                            }`}
                        />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{product.name}</p>
                          {product.is_composite && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                              Receta
                            </span>
                          )}
                        </div>
                        {product.code && (
                          <p className="text-sm text-gray-500">{product.code}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {product.categories?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.is_composite ? (
                      <span className="text-purple-600 font-medium">
                        - <span className="text-xs text-gray-400">(calc)</span>
                      </span>
                    ) : (
                      <span
                        className={`${product.min_stock && product.stock <= product.min_stock
                          ? 'text-red-600 font-medium'
                          : ''
                          }`}
                      >
                        {product.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={`px-2 py-1 text-xs rounded-full ${product.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {product.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(product)}
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium mb-1">Codigo</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Precio *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Stock {formData.isComposite && '(Calculado)'}
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    className="input disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={formData.isComposite}
                    placeholder={formData.isComposite ? 'Calculado' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Stock minimo
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="input"
                  >
                    <option value="">Sin categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad</label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="input"
                  >
                    <option value="pieza">Pieza</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="gr">Gramo (gr)</option>
                    <option value="lt">Litro (lt)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isComposite"
                  checked={formData.isComposite}
                  onChange={(e) =>
                    setFormData({ ...formData, isComposite: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="isComposite" className="text-sm font-medium text-gray-700">
                  Es producto compuesto (receta)
                </label>
              </div>

              {formData.isComposite && (
                <div className="border-t pt-4">
                  <RecipeEditor
                    productId={editingProduct?.id}
                    ingredients={ingredients}
                    onChange={setIngredients}
                    availableProducts={products}
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
                  {editingProduct ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
