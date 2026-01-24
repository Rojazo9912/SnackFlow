import { useEffect, useState } from 'react';
import {
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Check,
} from 'lucide-react';
import { useRef } from 'react';
import { showToast } from '../utils/toast';
import { ordersApi, cashRegisterApi, tenantsApi } from '../services/api';
import { PrintTicket } from '../components/PrintTicket';
import { Printer } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { requestNotificationPermission, showBrowserNotification, playNotificationSound } from '../utils/notifications';
import { MixedPaymentModal } from '../components/MixedPaymentModal';
import { useGlobalKeyboardShortcuts } from '../hooks/useGlobalKeyboardShortcuts';

interface Order {
  id: string;
  status: string;
  total: number;
  notes: string;
  created_at: string;
  user: { id: string; name: string };
  cashier?: { id: string; name: string };
  payment_method?: string;
  payment_details?: any;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    product: { id: string; name: string };
    notes?: string;
  }>;
}

export function CashierPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cashSession, setCashSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMixedPayment, setShowMixedPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Printing state
  const printRef = useRef<HTMLDivElement>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [printType, setPrintType] = useState<'ticket' | 'comanda' | 'drawer'>('ticket');
  const { user } = useAuthStore();

  // Recent sales state
  const [recentSales, setRecentSales] = useState<Order[]>([]);
  const [showRecentSales, setShowRecentSales] = useState(false);

  useEffect(() => {
    loadData();
    // Request notification permission on mount
    requestNotificationPermission();
    // Poll for new orders every 5 seconds
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Realtime notifications for new orders
  useRealtimeNotifications({
    enabled: !!cashSession,
    onNewOrder: (order) => {
      console.log('New order notification:', order);
      // Play sound
      playNotificationSound();
      // Show toast
      showToast.info(`Nuevo pedido de ${order.user?.name || 'Cliente'}`, {
        duration: 5000,
      });
      // Show browser notification
      showBrowserNotification('Nuevo Pedido', {
        body: `Pedido #${order.id.slice(0, 8)} - Total: $${order.total}`,
        tag: order.id,
      });
      // Refresh orders list
      loadOrders();
    },
  });

  // Keyboard shortcuts
  useGlobalKeyboardShortcuts({
    onOpenCashRegister: () => {
      if (!cashSession) {
        const amount = prompt('Monto inicial de caja:');
        if (!amount) return;
        cashRegisterApi.open(parseFloat(amount))
          .then(() => {
            showToast.success('Caja abierta');
            loadData();
          })
          .catch((error: any) => {
            showToast.error(error.message || 'Error abriendo caja');
          });
      }
    },
    onProcessPayment: () => {
      if (selectedOrder && cashSession) {
        setShowPaymentModal(true);
      }
    },
    onReprintTicket: () => {
      const lastTicket = localStorage.getItem('lastPrintedTicket');
      if (!lastTicket) {
        showToast.warning('No hay ticket anterior para reimprimir');
        return;
      }
      try {
        const ticketData = JSON.parse(lastTicket);
        setOrderToPrint(ticketData);
        setPrintType('ticket');
        setTimeout(() => window.print(), 100);
        showToast.success('Reimprimiendo último ticket');
      } catch (error) {
        showToast.error('Error al reimprimir ticket');
      }
    },
    onOpenDrawer: () => {
      setPrintType('drawer');
      setOrderToPrint({} as any); // Dummy data for drawer
      setTimeout(() => {
        window.print();
        // Restore to ticket mode after a delay
        setTimeout(() => setPrintType('ticket'), 1000);
      }, 100);
      showToast.success('Abriendo cajón...');
    },
  });

  const loadData = async () => {
    try {
      const [ordersData, sessionData, tenantData] = await Promise.all([
        ordersApi.getPending(),
        cashRegisterApi.getCurrent(),
        tenantsApi.getCurrent(), // Load tenant info for printing
      ]);
      setOrders(ordersData);
      setCashSession(sessionData);

      // Store tenant data for printing
      if (tenantData && user) {
        user.tenant = tenantData;
      }
    } catch (error: any) {
      if (error.message?.includes('No hay caja abierta')) {
        setCashSession(null);
      } else {
        showToast.error('Error cargando datos');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const ordersData = await ordersApi.getPending();
      setOrders(ordersData);
    } catch (error) {
      // Silently fail polling
    }
  };

  const loadRecentSales = async () => {
    try {
      // Get completed orders from today
      const today = new Date().toISOString().split('T')[0];
      const salesData = await ordersApi.getAll({
        status: 'completed',
        fromDate: today
      });
      setRecentSales(salesData.slice(0, 20)); // Last 20 sales
    } catch (error) {
      console.error('Error loading recent sales:', error);
    }
  };

  const handleTakeOrder = async (order: Order) => {
    try {
      await ordersApi.updateStatus(order.id, 'in_cashier');
      setSelectedOrder(order);
      loadOrders();
    } catch (error: any) {
      showToast.error(error.message || 'Error tomando pedido');
    }
  };

  const handleProcessPayment = async (payments?: Array<{ method: string; amount: number }>, receivedAmount?: number, changeAmount?: number) => {
    if (!selectedOrder) return;

    setProcessingPayment(true);
    try {
      // If no payments array provided, use single payment method
      const paymentData = payments || [{ method: paymentMethod, amount: selectedOrder.total }];
      const received = receivedAmount || (amountReceived ? parseFloat(amountReceived) : undefined);
      const change = changeAmount || (received && paymentMethod === 'cash' ? received - selectedOrder.total : undefined);

      await ordersApi.processPayment(
        selectedOrder.id,
        paymentData,
        received,
        change
      );

      // Prepare for printing
      const ticketData = {
        ...selectedOrder,
        payment_method: paymentData.length === 1 ? paymentData[0].method : 'mixed',
        payment_details: { payments: paymentData, amountReceived: received, change }
      } as any;

      setOrderToPrint(ticketData);
      setPrintType('ticket');

      // Save last ticket to localStorage for reprint
      localStorage.setItem('lastPrintedTicket', JSON.stringify(ticketData));

      showToast.success('Pago procesado correctamente');
      setSelectedOrder(null);
      setShowPaymentModal(false);
      setShowMixedPayment(false);
      setAmountReceived('');
      loadOrders();

      // Check for auto-print setting
      if ((user?.tenant?.settings as any)?.autoPrintTickets) {
        setTimeout(() => {
          console.log('Auto-printing ticket...');
          window.print();
        }, 500);
      }
    } catch (error: any) {
      showToast.error(error.message || 'Error procesando pago');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePrint = (type: 'ticket' | 'comanda', order?: Order) => {
    const target = order || selectedOrder || orderToPrint;
    if (!target) {
      console.error('No order to print');
      showToast.error('No hay pedido para imprimir');
      return;
    }

    console.log('Preparing to print:', { type, orderId: target.id, tenant: user?.tenant });
    setOrderToPrint(target);
    setPrintType(type);

    // Increased delay to ensure state update and render
    setTimeout(() => {
      console.log('Calling window.print()');
      window.print();
    }, 300);
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt('Motivo de cancelacion:');
    if (!reason) return;

    try {
      await ordersApi.cancel(orderId, reason);
      showToast.success('Pedido cancelado');
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      showToast.error(error.message || 'Error cancelando pedido');
    }
  };

  const calculateChange = () => {
    if (!selectedOrder || !amountReceived) return 0;
    return parseFloat(amountReceived) - selectedOrder.total;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!cashSession) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Caja no abierta
        </h2>
        <p className="text-gray-500 mb-6">
          Debes abrir la caja para comenzar a recibir pedidos
        </p>
        <button
          onClick={async () => {
            const amount = prompt('Monto inicial de caja:');
            if (!amount) return;
            try {
              await cashRegisterApi.open(parseFloat(amount));
              showToast.success('Caja abierta');
              loadData();
            } catch (error: any) {
              showToast.error(error.message || 'Error abriendo caja');
            }
          }}
          className="btn-primary"
        >
          Abrir Caja
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <Header
        title="Caja"
        subtitle={`${orders.length} pedidos en cola`}
        actions={
          <div className="flex gap-2">
            {/* Enable Sound Button */}
            <button
              onClick={async () => {
                try {
                  const audio = new Audio('/notification.mp3');
                  audio.volume = 0.1; // Low volume for test
                  await audio.play();
                  setSoundEnabled(true);
                  showToast.success('🔊 Sonido de notificaciones habilitado');
                } catch (error) {
                  showToast.error('No se pudo habilitar el sonido');
                }
              }}
              className={`btn-secondary text-sm flex items-center gap-2 ${soundEnabled ? 'bg-green-100 border-green-300' : ''
                }`}
              title="Habilitar sonido de notificaciones"
            >
              {soundEnabled ? '🔊' : '🔇'}
              {soundEnabled ? 'Sonido ON' : 'Habilitar Sonido'}
            </button>

            <button
              onClick={() => {
                setShowRecentSales(!showRecentSales);
                if (!showRecentSales) {
                  loadRecentSales();
                }
              }}
              className={`btn-secondary text-sm flex items-center gap-2 ${showRecentSales ? 'bg-blue-100 border-blue-300' : ''}`}
              title="Ver últimas ventas"
            >
              📋 {showRecentSales ? 'Ocultar' : 'Últimas Ventas'}
            </button>

            <button
              onClick={() => {
                const lastTicket = localStorage.getItem('lastPrintedTicket');
                if (!lastTicket) {
                  showToast.warning('No hay ticket anterior para reimprimir');
                  return;
                }
                try {
                  const ticketData = JSON.parse(lastTicket);
                  setOrderToPrint(ticketData);
                  setPrintType('ticket');
                  setTimeout(() => window.print(), 100);
                  showToast.success('Reimprimiendo último ticket');
                } catch (error) {
                  showToast.error('Error al reimprimir ticket');
                }
              }}
              className="btn-secondary text-sm flex items-center gap-2"
              title="Reimprimir último ticket"
            >
              <Printer className="w-4 h-4" />
              Reimprimir
            </button>
            <button
              onClick={async () => {
                const amount = prompt('Monto final contado:');
                if (!amount) return;
                try {
                  const result = await cashRegisterApi.close(parseFloat(amount));
                  showToast.success(
                    `Caja cerrada. Diferencia: $${result.difference.toFixed(2)}`
                  );
                  loadData();
                } catch (error: any) {
                  showToast.error(error.message || 'Error cerrando caja');
                }
              }}
              className="btn-secondary text-sm"
            >
              Cerrar Caja
            </button>
          </div>
        }
      />


      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 no-print">
        {/* Orders list */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Cola de Pedidos ({orders.length})
            </h1>
            <button
              onClick={async () => {
                const amount = prompt('Monto final contado:');
                if (!amount) return;
                try {
                  const result = await cashRegisterApi.close(parseFloat(amount));
                  showToast.success(
                    `Caja cerrada. Diferencia: $${result.difference.toFixed(2)}`
                  );
                  loadData();
                } catch (error: any) {
                  showToast.error(error.message || 'Error cerrando caja');
                }
              }}
              className="btn-secondary text-sm"
            >
              Cerrar Caja
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {orders.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-full h-full" />}
                title="No hay pedidos pendientes"
                description="Los pedidos aparecerán aquí cuando los vendedores los envíen"
              />
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleTakeOrder(order)}
                  className={`card cursor-pointer hover:shadow-md transition-shadow ${selectedOrder?.id === order.id
                    ? 'ring-2 ring-primary-500'
                    : ''
                    }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex-1">
                      <span className="text-xs text-gray-500">
                        #{order.id.slice(0, 8)}
                      </span>
                      <p className="font-medium">{order.user.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint('comanda', order);
                        }}
                        className="p-2 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                        title="Imprimir Comanda"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                      <span className="text-lg font-bold text-primary-600">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                  <div className="mt-2 text-sm">
                    {order.order_items.slice(0, 3).map((item) => (
                      <span key={item.id} className="mr-2">
                        {item.quantity}x {item.product.name}
                      </span>
                    ))}
                    {order.order_items.length > 3 && (
                      <span className="text-gray-500">
                        +{order.order_items.length - 3} mas
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected order detail */}
        {selectedOrder && (
          <div className="lg:w-96 bg-white rounded-xl shadow-sm flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Detalle del Pedido</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {selectedOrder.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2 border-b"
                  >
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} x ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-semibold">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {selectedOrder.notes && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span className="text-primary-600">
                  ${selectedOrder.total.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className="btn-danger flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="btn-success flex-1"
                >
                  Cobrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Procesar Pago</h3>

              <div className="mb-4">
                <p className="text-2xl font-bold text-primary-600 text-center">
                  ${selectedOrder.total.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { id: 'cash', icon: Banknote, label: 'Efectivo' },
                  { id: 'card', icon: CreditCard, label: 'Tarjeta' },
                  { id: 'transfer', icon: Smartphone, label: 'Transferencia' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${paymentMethod === method.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200'
                      }`}
                  >
                    <method.icon className="w-6 h-6" />
                    <span className="text-xs">{method.label}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Monto recibido
                  </label>

                  {/* Smart Denominations */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <button
                      onClick={() => setAmountReceived(selectedOrder.total.toString())}
                      className="px-2 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                    >
                      Exacto
                    </button>
                    {[20, 50, 100, 200, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setAmountReceived(amount.toString())}
                        className="px-2 py-1 text-xs font-medium bg-white hover:bg-green-50 text-green-700 border border-green-200 rounded transition-colors"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="input text-lg font-bold"
                    placeholder="0.00"
                    autoFocus
                  />
                  {amountReceived && calculateChange() >= 0 && (
                    <p className="text-lg font-semibold text-green-600 mt-2">
                      Cambio: ${calculateChange().toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleProcessPayment()}
                  disabled={
                    processingPayment ||
                    (paymentMethod === 'cash' &&
                      (!amountReceived ||
                        parseFloat(amountReceived) < selectedOrder.total))
                  }
                  className="btn-success flex-1 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {processingPayment ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Printing Component */}
        <PrintTicket
          ref={printRef}
          type={printType}
          data={orderToPrint}
          tenant={user?.tenant}
        />

        {/* Mixed Payment Modal */}
        {selectedOrder && (
          <MixedPaymentModal
            isOpen={showMixedPayment}
            onClose={() => setShowMixedPayment(false)}
            total={selectedOrder.total}
            onConfirm={handleProcessPayment}
          />
        )}

        {/* Recent Sales Modal */}
        {showRecentSales && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Últimas Ventas de Hoy</h3>
                <button
                  onClick={() => setShowRecentSales(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {recentSales.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No hay ventas registradas hoy</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-mono text-gray-500">
                                #{sale.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-600">
                                {new Date(sale.created_at).toLocaleTimeString('es-MX')}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {sale.user?.name}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                              {sale.order_items?.slice(0, 3).map((item: any) => (
                                <span key={item.id} className="bg-gray-100 px-2 py-1 rounded">
                                  {item.quantity}x {item.product.name}
                                </span>
                              ))}
                              {sale.order_items?.length > 3 && (
                                <span className="text-gray-500">
                                  +{sale.order_items.length - 3} más
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary-600">
                                ${sale.total.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {sale.payment_method === 'cash' ? 'Efectivo' :
                                  sale.payment_method === 'card' ? 'Tarjeta' :
                                    sale.payment_method === 'transfer' ? 'Transferencia' :
                                      sale.payment_method === 'mixed' ? 'Mixto' :
                                        sale.payment_method}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                handlePrint('ticket', sale);
                                setShowRecentSales(false);
                              }}
                              className="btn-primary flex items-center gap-2"
                              title="Imprimir ticket"
                            >
                              <Printer className="w-4 h-4" />
                              Imprimir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setShowRecentSales(false)}
                  className="btn-secondary w-full"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
