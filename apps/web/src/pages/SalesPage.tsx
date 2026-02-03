import { useEffect, useState, useRef } from 'react';
import { Search, Plus, Minus, Trash2, Send, Star, LayoutGrid, List, AlertTriangle, Banknote } from 'lucide-react';
import { showToast } from '../utils/toast';
import { useCartStore } from '../stores/cartStore';
import { productsApi, categoriesApi, ordersApi, tenantsApi } from '../services/api';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { useGlobalKeyboardShortcuts } from '../hooks/useGlobalKeyboardShortcuts';
import { playSound } from '../utils/notifications';

import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { PaymentModal } from '../components/cashier/PaymentModal';
import { TicketPreviewModal } from '../components/TicketPreviewModal';
import { PrintTicket } from '../components/PrintTicket';
import { useAuthStore } from '../stores/authStore';
import { ORDER_STATUS } from '@snackflow/shared';

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
  image?: string;
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  const [customerName, setCustomerName] = useState('');

  // Cobrar (direct charge) flow state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<any>(null);
  const { user } = useAuthStore();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData, tenantData] = await Promise.all([
        productsApi.getAll({ calculateCompositeStock: true }),
        categoriesApi.getAll(),
        tenantsApi.getCurrent(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      if (tenantData && user) {
        user.tenant = tenantData;
      }
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
          playSound('error');
          return;
        }

        addItem({
          id: firstProduct.id,
          name: firstProduct.name,
          price: firstProduct.price,
        });
        playSound('scan');
        setSearch(''); // Clear search after adding
        searchInputRef.current?.focus(); // Keep focus for next search
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search, filteredProducts, items, addItem]);

  // Realtime updates for products
  useRealtimeNotifications({
    onProductUpdate: (newProduct: Product) => {
      setProducts(prev => prev.map(p => p.id === newProduct.id ? { ...p, ...newProduct } : p));
    }
  });

  // Listen for low stock alerts
  useEffect(() => {
    const handleLowStock = (e: CustomEvent) => {
      const product = e.detail;
      showToast.warning(`⚠️ ¡Alerta! Stock bajo para: ${product.name} (${product.stock} restantes)`);
      playSound('error');
    };

    window.addEventListener('low-stock-alert', handleLowStock as any);
    return () => window.removeEventListener('low-stock-alert', handleLowStock as any);
  }, []);

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
        notes: customerName ? `[Cliente: ${customerName}] ${notes || ''}` : notes,
      });
      showToast.success('Pedido enviado a caja');
      clearCart();
      setCustomerName('');
    } catch (error: any) {
      showToast.error(error.message || 'Error enviando pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCobrar = async () => {
    if (items.length === 0) {
      showToast.warning('Agrega productos al pedido');
      return;
    }

    setProcessingPayment(true);
    try {
      const order = await ordersApi.create({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        })),
        notes: customerName ? `[Cliente: ${customerName}] ${notes || ''}` : notes,
      });

      await ordersApi.updateStatus(order.id, ORDER_STATUS.IN_CASHIER);
      setCurrentOrderId(order.id);
      setShowPaymentModal(true);
    } catch (error: any) {
      showToast.error(error.message || 'Error creando pedido');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleConfirmPayment = async (
    payments: Array<{ method: string; amount: number }>,
    receivedAmount?: number,
    changeAmount?: number
  ) => {
    if (!currentOrderId) return;

    setProcessingPayment(true);
    try {
      await ordersApi.processPayment(
        currentOrderId,
        payments,
        receivedAmount,
        changeAmount
      );

      const ticketData = {
        id: currentOrderId,
        total: getTotal(),
        notes: customerName ? `[Cliente: ${customerName}] ${notes || ''}` : notes,
        created_at: new Date().toISOString(),
        user: { name: user?.name || 'Vendedor' },
        order_items: items.map((item, index) => ({
          id: `item-${index}`,
          quantity: item.quantity,
          unit_price: item.price,
          product: { name: item.name },
          notes: item.notes,
        })),
        payment_method: payments.length === 1 ? payments[0].method : 'mixed',
        payment_details: {
          payments,
          amountReceived: receivedAmount,
          change: changeAmount,
        },
      };

      setOrderToPrint(ticketData);
      localStorage.setItem('lastPrintedTicket', JSON.stringify(ticketData));

      showToast.success('Pago procesado correctamente');
      playSound('success');

      setShowPaymentModal(false);
      clearCart();
      setCustomerName('');
      setCurrentOrderId(null);
      setShowTicketPreview(true);

      loadData();
    } catch (error: any) {
      showToast.error(error.message || 'Error procesando pago');
      playSound('error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentCancel = async () => {
    setShowPaymentModal(false);
    if (currentOrderId) {
      try {
        await ordersApi.cancel(currentOrderId, 'Pago cancelado por el operador');
      } catch (error) {
        console.warn('No se pudo cancelar la orden:', error);
      }
      setCurrentOrderId(null);
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
            <div className="flex gap-2">
              <div className="relative flex-1">
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
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Vista Cuadrícula"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Vista Lista"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
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

          {/* Products grid/list */}
          <div className="flex-1 overflow-y-auto">
            {viewMode === 'grid' ? (
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
                    className={`group relative bg-white p-4 rounded-2xl shadow-sm border transaction-all duration-200 text-left
                      ${getAvailableStock(product) <= 0
                        ? 'border-gray-200 opacity-50 cursor-not-allowed grayscale'
                        : getAvailableStock(product) <= 5
                          ? 'border-red-500 shadow-red-100 ring-1 ring-red-500 hover:shadow-red-200' // Red border for low stock
                          : 'border-transparent hover:border-primary-500 hover:shadow-md'
                      }
                    `}
                  >
                    {/* Low Stock Warning Badge */}
                    {getAvailableStock(product) > 0 && getAvailableStock(product) <= 5 && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md z-10 animate-bounce">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col mb-2 flex-1">
                      {product.image ? (
                        <div className="w-full h-32 mb-2 rounded-lg overflow-hidden relative bg-gray-50">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          {product.is_favorite && (
                            <div className="absolute top-1 right-1 bg-white/80 p-1 rounded-full backdrop-blur-sm">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-between items-start mb-2">
                          {product.is_favorite && (
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0 ml-auto" />
                          )}
                        </div>
                      )}

                      <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                        {product.name}
                      </h3>
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
            ) : (
              <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                    <tr>
                      <th className="px-4 py-2 text-left">SKU</th>
                      <th className="px-4 py-2 text-left">Producto</th>
                      <th className="px-4 py-2 text-right">Precio</th>
                      <th className="px-4 py-2 text-center">Stock</th>
                      <th className="px-4 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${getAvailableStock(product) <= 0 ? 'opacity-50' : ''}`}
                        onClick={() => {
                          if (getAvailableStock(product) <= 0) return;
                          addItem({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                          });
                          playSound('scan');
                          setSearch('');
                          searchInputRef.current?.focus();
                        }}
                      >
                        <td className="px-4 py-3 text-sm text-gray-500 break-all w-24 font-mono text-xs">{product.code}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.image && (
                              <img src={product.image} className="w-8 h-8 rounded object-cover border" alt="" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900 line-clamp-1">{product.name}</p>
                              {product.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mt-0.5" />}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">${product.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getAvailableStock(product) <= 0
                            ? 'bg-red-50 text-red-600'
                            : getAvailableStock(product) <= 5
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-green-50 text-green-600'
                            }`}>
                            {getAvailableStock(product)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button disabled={getAvailableStock(product) <= 0} className="p-1 hover:bg-primary-50 rounded text-primary-600">
                            <Plus className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {filteredProducts.length === 0 && (
            <EmptyState
              icon={<Search className="w-full h-full" />}
              title="No se encontraron productos"
              description={search ? `No hay productos que coincidan con "${search}"` : selectedCategory ? 'No hay productos en esta categoría' : 'No hay productos disponibles'}
            />
          )}
        </div>

        {/* Cart section */}
        <div className="lg:w-72 flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm">
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
          <input
            type="text"
            placeholder="Nombre del Cliente (Opcional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="input text-sm"
          />
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

          <div className="flex flex-col gap-2">
            <button
              onClick={handleCobrar}
              disabled={items.length === 0 || submitting || processingPayment}
              className="w-full py-3 flex items-center justify-center gap-2 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Banknote className="w-5 h-5" />
              {processingPayment ? 'Procesando...' : 'Cobrar'}
            </button>
            <button
              onClick={handleSendOrder}
              disabled={items.length === 0 || submitting || processingPayment}
              className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Enviando...' : 'Enviar a Caja'}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentCancel}
        total={getTotal()}
        onConfirm={handleConfirmPayment}
        processing={processingPayment}
      />

      {/* Ticket Preview */}
      <TicketPreviewModal
        isOpen={showTicketPreview}
        onClose={() => setShowTicketPreview(false)}
        order={orderToPrint}
        tenant={user?.tenant}
        onConfirm={() => {
          setShowTicketPreview(false);
          setTimeout(() => window.print(), 300);
        }}
      />

      {/* Hidden print component */}
      <div className="hidden print:block">
        <PrintTicket
          ref={printRef}
          type="ticket"
          data={orderToPrint}
          tenant={user?.tenant}
        />
      </div>
    </div>
  );
}
