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
    const matchesCategory = !selectedCategory || p.categories?.id === selectedCategory;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const favoriteProducts = products.filter((p) => p.is_favorite);

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
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedCategory('favorites')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                selectedCategory === 'favorites'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Star className="w-4 h-4" />
              Favoritos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(selectedCategory === 'favorites' ? favoriteProducts : filteredProducts).map(
              (product) => (
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
                  className={`card text-left hover:shadow-md transition-shadow ${
                    product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm line-clamp-2">
                      {product.name}
                    </h3>
                    {product.is_favorite && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-primary-600 font-bold">
                    ${product.price.toFixed(2)}
                  </p>
                  {product.stock <= 5 && product.stock > 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      Stock: {product.stock}
                    </p>
                  )}
                </button>
              )
            )}
          </div>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1 rounded text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
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
