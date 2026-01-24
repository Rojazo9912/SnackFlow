import { useEffect, useState, useRef } from 'react';
import { Search, Plus, Minus, Trash2, Send, Star } from 'lucide-react';
import { showToast } from '../utils/toast';
import { useCartStore } from '../stores/cartStore';
import { productsApi, categoriesApi, ordersApi } from '../services/api';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { useGlobalKeyboardShortcuts } from '../hooks/useGlobalKeyboardShortcuts';

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  stock: number;
  calculated_stock?: number;
  is_favorite: boolean;
  is_composite: boolean;
  categories: { id: string; name: string } | null;
}

// Helper to get available stock (uses calculated_stock for composite products)
const getAvailableStock = (product: Product): number => {
  return product.is_composite ? (product.calculated_stock ?? 0) : product.stock;
};

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
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        productsApi.getAll({ calculateCompositeStock: true }),
        categoriesApi.getAll(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      showToast.error('Error cargando datos');
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

  // Handle keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F to focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Esc to clear search (only when search input is focused)
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearch('');
        searchInputRef.current?.blur();
      }

      // Enter to add first product (only when search input is focused and has results)
      if (e.key === 'Enter' && document.activeElement === searchInputRef.current && filteredProducts.length > 0) {
        e.preventDefault();
        const firstProduct = filteredProducts[0];
        const currentQuantity = items.find(i => i.productId === firstProduct.id)?.quantity || 0;
        const availableStock = getAvailableStock(firstProduct);

        if (currentQuantity >= availableStock) {
          showToast.warning(`Stock insuficiente. Solo hay ${availableStock} disponibles`);
          return;
        }

        addItem({
          id: firstProduct.id,
          name: firstProduct.name,
          price: firstProduct.price,
        });
        setSearch(''); // Clear search after adding
        searchInputRef.current?.focus(); // Keep focus for next search
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search, filteredProducts, items, addItem]);

  // Global keyboard shortcuts
  useGlobalKeyboardShortcuts({
    onNewSale: () => {
      if (items.length > 0) {
        if (confirm('¿Limpiar el carrito y comenzar una nueva venta?')) {
          clearCart();
          showToast.success('Carrito limpiado');
        }
      }
    },
  });

  const handleSendOrder = async () => {
    if (items.length === 0) {
      showToast.warning('Agrega productos al pedido');
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
      showToast.success('Pedido enviado a caja');
      clearCart();
    } catch (error: any) {
      showToast.error(error.message || 'Error enviando pedido');
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <Header
        title="Ventas"
        subtitle={`${items.length} productos en el carrito`}
      />

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Products section */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search and filters */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Buscar producto... (Ctrl+F)"
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
                  onClick={() => {
                    const currentQuantity = items.find(i => i.productId === product.id)?.quantity || 0;
                    const availableStock = getAvailableStock(product);

                    if (currentQuantity >= availableStock) {
                      showToast.warning(`Stock insuficiente. Solo hay ${availableStock} disponibles`);
                      return;
                    }

                    addItem({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                    });
                  }}
                  disabled={getAvailableStock(product) <= 0}
                  className={`group relative bg-white p-4 rounded-2xl shadow-sm border border-transparent hover:border-primary-500 hover:shadow-md transition-all duration-200 text-left ${getAvailableStock(product) <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''
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
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-md ${getAvailableStock(product) <= 0
                        ? 'bg-red-50 text-red-600'
                        : getAvailableStock(product) <= 5
                          ? 'bg-orange-50 text-orange-600'
                          : product.is_composite
                            ? 'bg-purple-50 text-purple-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                        {product.is_composite ? 'Disp: ' : 'Stock: '}
                        {getAvailableStock(product) <= 0 ? 'Sin stock' : getAvailableStock(product)}
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
              <EmptyState
                icon={<Search className="w-full h-full" />}
                title="No se encontraron productos"
                description={search ? `No hay productos que coincidan con "${search}"` : selectedCategory ? 'No hay productos en esta categoría' : 'No hay productos disponibles'}
              />
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
    </div>
  );
}
