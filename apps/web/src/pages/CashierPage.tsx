import { useEffect, useState, useRef } from 'react';
import {
  Clock,
  ArrowLeftRight,
  X,
} from 'lucide-react';
import { showToast } from '../utils/toast';
import { ordersApi, cashRegisterApi, tenantsApi, reportsApi } from '../services/api';
import { PrintTicket } from '../components/PrintTicket';
import { Printer } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { requestNotificationPermission, showBrowserNotification, playNotificationSound } from '../utils/notifications';
import { MixedPaymentModal } from '../components/MixedPaymentModal';
import { useGlobalKeyboardShortcuts } from '../hooks/useGlobalKeyboardShortcuts';
import { playSound } from '../utils/notifications';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp';
import { CashSummaryWidget } from '../components/CashSummaryWidget';
import { TicketPreviewModal } from '../components/TicketPreviewModal';
import { CashMovementModal } from '../components/CashMovementModal';
import { PaymentModal } from '../components/cashier/PaymentModal';
import { RecentSalesModal } from '../components/cashier/RecentSalesModal';
import { OrderDetail } from '../components/cashier/OrderDetail';
import { ORDER_STATUS } from '@snackflow/shared';

// New Modals
import { OpenRegisterModal } from '../components/cashier/OpenRegisterModal';
import { CancelOrderModal } from '../components/cashier/CancelOrderModal';
import { CloseRegisterModal } from '../components/cashier/CloseRegisterModal';

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

  // New Modals State
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMixedPayment, setShowMixedPayment] = useState(false);

  // Movement modal state
  const [showMovementModal, setShowMovementModal] = useState(false);

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Printing state
  const printRef = useRef<HTMLDivElement>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [printType, setPrintType] = useState<'ticket' | 'comanda' | 'drawer' | 'report'>('ticket');
  const { user } = useAuthStore();

  // Recent sales state
  const [recentSales, setRecentSales] = useState<Order[]>([]);
  const [showRecentSales, setShowRecentSales] = useState(false);

  // Help modal state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Ticket preview state
  const [showTicketPreview, setShowTicketPreview] = useState(false);

  useEffect(() => {
    loadData();
    // Request notification permission on mount
    requestNotificationPermission();
  }, []);

  // Realtime notifications for new orders
  useRealtimeNotifications({
    enabled: !!cashSession,
    onNewOrder: (order) => {
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
    onOrderUpdate: (order) => {
      // Refresh orders list on any update (cancellation, status change)
      loadOrders();
    }
  });

  // Keyboard shortcuts
  useGlobalKeyboardShortcuts({
    onOpenCashRegister: () => {
      if (!cashSession) {
        setShowOpenModal(true);
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

  // F1 for help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setShowTicketPreview(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      // Get completed orders from today (using local date boundaries)
      const today = new Date().toLocaleDateString('en-CA');
      const localStart = new Date(`${today}T00:00:00`).toISOString();
      const salesData = await ordersApi.getAll({
        status: 'paid',
        fromDate: localStart
      });
      setRecentSales(salesData.slice(0, 20)); // Last 20 sales
    } catch (error) {
      console.error('Error loading recent sales:', error);
    }
  };

  const handleTakeOrder = async (order: Order) => {
    try {
      await ordersApi.updateStatus(order.id, ORDER_STATUS.IN_CASHIER);
      setSelectedOrder(order);
      loadOrders();
    } catch (error: any) {
      showToast.error(error.message || 'Error tomando pedido');
    }
  };

  const handleProcessPayment = async (payments?: Array<{ method: string; amount: number }>, receivedAmount?: number, changeAmount?: number) => {
    if (!selectedOrder) return;

    // Validation: Check for suspiciously high amounts
    const received = receivedAmount;
    if (received && received > 5000) {
      const confirm = window.confirm(
        `El monto recibido ($${received.toFixed(2)}) es muy alto. ¿Es correcto?`
      );
      if (!confirm) return;
    }

    setProcessingPayment(true);
    try {
      // If no payments array provided, check if we can infer or error out.
      // With the new modals, payments should always be provided.
      const paymentData = payments || [{ method: 'cash', amount: selectedOrder.total }];
      const change = changeAmount;

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
      playSound('success');
      setSelectedOrder(null);
      setShowPaymentModal(false);
      setShowMixedPayment(false);
      loadOrders();

      // Show ticket preview instead of auto-printing
      setShowTicketPreview(true);
    } catch (error: any) {
      showToast.error(error.message || 'Error procesando pago');
      playSound('error');
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

    setOrderToPrint(target);
    setPrintType(type);

    // Increased delay to ensure state update and render
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleCancelOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId) || selectedOrder;
    if (order) {
      setOrderToCancel(order);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!orderToCancel) return;
    try {
      await ordersApi.cancel(orderToCancel.id, reason);
      showToast.success('Pedido cancelado');
      setOrderToCancel(null);
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      showToast.error(error.message || 'Error cancelando pedido');
    }
  };

  const handlePrintZReport = async () => {
    try {
      const [dailySales, topProductsObj] = await Promise.all([
        reportsApi.getDailySales(),
        reportsApi.getTopProducts(1, 5)
      ]);

      const reportData = {
        ...dailySales,
        topProducts: topProductsObj.products,
        type: 'report'
      };

      setOrderToPrint(reportData as any);
      setPrintType('report');
      setTimeout(() => window.print(), 300);
      showToast.success('Imprimiendo reporte del día...');
    } catch (error) {
      console.error(error);
      showToast.error('Error generando reporte');
    }
  };

  const handleCloseRegister = () => {
    if (!cashSession) return;
    setShowCloseModal(true);
  };

  const handleConfirmClose = async (amount: number) => {
    try {
      const result = await cashRegisterApi.close(amount);
      showToast.success(
        `Caja cerrada. Diferencia: $${result.difference.toFixed(2)}`
      );
      setShowCloseModal(false);
      loadData();

      // Auto-print Z Report
      setTimeout(() => {
        handlePrintZReport();
      }, 1000);
    } catch (error: any) {
      console.error(error);
      showToast.error(error.message || 'Error cerrando caja');
    }
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
          onClick={() => setShowOpenModal(true)}
          className="btn-primary font-bold shadow-md shadow-primary-500/10"
        >
          Abrir Caja
        </button>

        <OpenRegisterModal
          isOpen={showOpenModal}
          onClose={() => setShowOpenModal(false)}
          onConfirm={async (amount) => {
            try {
              await cashRegisterApi.open(amount);
              showToast.success('Caja abierta');
              setShowOpenModal(false);
              loadData();
            } catch (error: any) {
              showToast.error(error.message || 'Error abriendo caja');
            }
          }}
        />
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
              title="Reimprimir último ticket (F9)"
            >
              <Printer className="w-4 h-4" />
              Reimprimir
            </button>
            <button
              onClick={() => setShowMovementModal(true)}
              className="btn-secondary text-sm flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              title="Registrar entrada/salida de dinero"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Movimientos
            </button>
            <button
              onClick={handlePrintZReport}
              className="btn-secondary text-sm flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
              title="Imprimir reporte del día"
            >
              <Printer className="w-4 h-4" />
              Corte Z
            </button>
            <button
              onClick={handleCloseRegister}
              className="btn-secondary text-sm"
            >
              Cerrar Caja
            </button>
          </div>
        }
      />

      {/* Cash Summary Widget */}
      {cashSession && (
        <div className="px-6 mb-4">
          <CashSummaryWidget sessionId={cashSession.id} />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 no-print">
        {/* Orders list */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Cola de Pedidos ({orders.length})
            </h1>
            <button
              onClick={handleCloseRegister}
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
          <OrderDetail
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onCancel={handleCancelOrder}
            onPay={() => setShowPaymentModal(true)}
          />
        )}

        {/* Payment Modal */}
        {selectedOrder && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            total={selectedOrder.total}
            onConfirm={handleProcessPayment}
            processing={processingPayment}
          />
        )}
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
        <RecentSalesModal
          isOpen={showRecentSales}
          onClose={() => setShowRecentSales(false)}
          sales={recentSales}
          onPrint={handlePrint}
        />

        {/* Print Components */}
        <PrintTicket
          ref={printRef}
          type={printType}
          data={orderToPrint}
          tenant={user?.tenant}
        />

        {/* Ticket Preview Modal */}
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

        {/* Cash Movement Modal */}
        <CashMovementModal
          isOpen={showMovementModal}
          onClose={() => setShowMovementModal(false)}
          onSuccess={() => {
            setCashSession({ ...cashSession });
            loadData();
          }}
        />

        {/* Keyboard Shortcuts Help Modal */}
        <KeyboardShortcutsHelp
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
        />

        {/* Open Cash Register Modal */}
        <OpenRegisterModal
          isOpen={showOpenModal}
          onClose={() => setShowOpenModal(false)}
          onConfirm={async (amount) => {
            try {
              await cashRegisterApi.open(amount);
              showToast.success('Caja abierta');
              setShowOpenModal(false);
              loadData();
            } catch (error: any) {
              showToast.error(error.message || 'Error abriendo caja');
            }
          }}
        />

        {/* Cancel Order Modal */}
        {orderToCancel && (
          <CancelOrderModal
            isOpen={!!orderToCancel}
            onClose={() => setOrderToCancel(null)}
            orderId={orderToCancel.id}
            onConfirm={handleConfirmCancel}
          />
        )}

        {/* Close Register Modal */}
        {cashSession && (
          <CloseRegisterModal
            isOpen={showCloseModal}
            onClose={() => setShowCloseModal(false)}
            sessionId={cashSession.id}
            pendingOrdersCount={orders.length}
            onConfirm={handleConfirmClose}
          />
        )}
      </div>
    </div>
  );
}
