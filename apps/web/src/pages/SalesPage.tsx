import { useEffect, useState } from 'react';
import { Search, Plus, Minus, Trash2, Send, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../stores/cartStore';
import { productsApi, categoriesApi, ordersApi } from '../services/api';

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  stock: number;
  is_favorite: boolean;
  categories: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    items,
    notes,
    addItem,
    removeItem,
    updateQuantity,
    setOrderNotes,
    clearCart,
    getTotal,
    getItemCount,
  } = useCartStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    // Search filter (applies always)
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory === 'favorites') {
      return p.is_favorite;
    }

    if (selectedCategory) {
      return p.categories?.id === selectedCategory;
    }

    return true; // "Todos"
  });

  const handleSendOrder = async () => {
    if (items.length === 0) {
      toast.error('Agrega productos al pedido');
      return;
    }

    setSubmitting(true);
    try {
      await ordersApi.create({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        })),
        notes,
      });
      toast.success('Pedido enviado a caja');
      clearCart();
    } catch (error: any) {
      toast.error(error.message || 'Error enviando pedido');
    } finally {
      setSubmitting(false);
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
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* Products section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search and filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-6 py-2 rounded-xl whitespace-nowrap font-medium transition-all duration-200 ${!selectedCategory
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-200 scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedCategory('favorites')}
              className={`px-6 py-2 rounded-xl whitespace-nowrap font-medium transition-all duration-200 flex items-center gap-2 ${selectedCategory === 'favorites'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-200 scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                }`}
            >
              <Star className={`w-4 h-4 ${selectedCategory === 'favorites' ? 'fill-current' : ''}`} />
              Favoritos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-6 py-2 rounded-xl whitespace-nowrap font-medium transition-all duration-200 ${selectedCategory === cat.id
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-200 scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map((product: Product) => (
              <button
                key={product.id}
                onClick={() =>
                  addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                  })
                }
                disabled={product.stock <= 0}
                className={`group relative bg-white p-4 rounded-2xl shadow-sm border border-transparent hover:border-primary-500 hover:shadow-md transition-all duration-200 text-left ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                    {product.name}
                  </h3>
                  {product.is_favorite && (
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  )}
                </div>

                <div className="mt-auto">
                  <p className="text-primary-600 font-bold text-lg">
                    ${product.price.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-md ${product.stock <= 0
                      ? 'bg-red-50 text-red-600'
                      : product.stock <= 5
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                      {product.stock <= 0 ? 'Sin stock' : `Stock: ${product.stock}`}
                    </span>
                    <div className="bg-primary-50 p-1.5 rounded-lg group-hover:bg-primary-500 group-hover:text-white transition-colors duration-200">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Search className="w-12 h-12 mb-2 opacity-20" />
              <p>No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart section */}
      <div className="lg:w-80 flex flex-col bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">
            Pedido ({getItemCount()} items)
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Agrega productos al pedido
            </p>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-3 py-2 border-b">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-primary-600 text-sm">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-transform"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 active:scale-95 transition-transform ml-1"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t space-y-3">
          <textarea
            placeholder="Notas del pedido (opcional)"
            value={notes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="input text-sm resize-none"
            rows={2}
          />

          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary-600">${getTotal().toFixed(2)}</span>
          </div>

          <button
            onClick={handleSendOrder}
            disabled={items.length === 0 || submitting}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            {submitting ? 'Enviando...' : 'Enviar a Caja'}
          </button>
        </div>
      </div>
    </div>
  );
}
