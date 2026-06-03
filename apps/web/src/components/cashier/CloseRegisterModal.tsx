import { useState, useEffect } from 'react';
import { 
  X, Landmark, ArrowUpRight, ArrowDownRight, RefreshCw, 
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Clock, User, HelpCircle, AlertCircle
} from 'lucide-react';
import { reportsApi } from '../../services/api';
import { showToast } from '../../utils/toast';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: { id: string; name: string; code: string };
  notes?: string;
}

interface SessionOrder {
  id: string;
  total: number;
  payment_method: string;
  payment_details: any;
  created_at: string;
  user: { name: string };
  order_items: OrderItem[];
}

interface SessionSummary {
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  byPaymentMethod: {
    cash: number;
    card: number;
    transfer: number;
    mixed: number;
  };
  cashFlow: {
    openingAmount: number;
    cashSales: number;
    deposits: number;
    withdrawals: number;
    expectedCash: number;
  };
  orders: SessionOrder[];
}

interface CloseRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (countedAmount: number) => void;
  sessionId: string;
  pendingOrdersCount: number;
}

export function CloseRegisterModal({
  isOpen,
  onClose,
  onConfirm,
  sessionId,
  pendingOrdersCount,
}: CloseRegisterModalProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [countedAmount, setCountedAmount] = useState<string>('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && sessionId) {
      loadSessionSummary();
    }
  }, [isOpen, sessionId]);

  const loadSessionSummary = async () => {
    setLoading(true);
    try {
      const data = await reportsApi.getCashSessionSummary(sessionId);
      setSummary(data);
      if (data?.cashFlow?.expectedCash !== undefined) {
        setCountedAmount(data.cashFlow.expectedCash.toFixed(2));
      }
    } catch (error) {
      console.error(error);
      showToast.error('Error al cargar el resumen del turno');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleOrderExpand = (id: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <span className="text-emerald-600 font-bold">💵</span>;
      case 'card':
        return <span className="text-blue-600 font-bold">💳</span>;
      case 'transfer':
        return <span className="text-purple-600 font-bold">📲</span>;
      case 'mixed':
        return <span className="text-amber-600 font-bold">🔄</span>;
      default:
        return <span className="text-gray-600 font-bold">❓</span>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      case 'mixed': return 'Mixto';
      default: return method;
    }
  };

  const expectedCash = summary?.cashFlow?.expectedCash || 0;
  const countedNum = parseFloat(countedAmount) || 0;
  const difference = countedNum - expectedCash;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (countedAmount === '' || isNaN(countedNum) || countedNum < 0) {
      showToast.error('Ingresa un monto contado válido');
      return;
    }

    if (pendingOrdersCount > 0) {
      const confirmPending = window.confirm(
        `¡Atención! Hay ${pendingOrdersCount} pedidos pendientes en la cola que se cancelarán o quedarán huérfanos. ¿Estás seguro de cerrar la caja?`
      );
      if (!confirmPending) return;
    }

    onConfirm(countedNum);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-950 dark:text-white">Cierre de Caja (Arqueo del Turno)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Sesión ID: {sessionId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadSessionSummary}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              title="Recargar resumen"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Calculando ventas, movimientos y compilando arqueo...</p>
          </div>
        ) : !summary ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
            <p className="text-gray-700 dark:text-gray-300 font-semibold">Error al cargar datos del arqueo</p>
            <button onClick={loadSessionSummary} className="mt-4 btn-primary">Reintentar</button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            
            {/* Left Side: Summary & Financials */}
            <div className="w-full lg:w-1/2 p-6 overflow-y-auto space-y-6 border-b lg:border-b-0 lg:border-r border-gray-300 dark:border-gray-800">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">El Acumulado Financiero</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">💵 Fondo de Apertura</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">${summary.cashFlow.openingAmount.toFixed(2)}</p>
                    </div>
                    <span className="text-2xl">🏦</span>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-xs text-gray-500">Total Ventas Turno</p>
                      <p className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-1">${summary.totalSales.toFixed(2)}</p>
                    </div>
                    <span className="text-2xl">📈</span>
                  </div>

                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <h5 className="text-xs font-bold text-gray-500 dark:text-gray-450 uppercase tracking-wider">Desglose de Métodos</h5>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  <div className="py-2.5 flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">💵 Efectivo (Ventas)</span>
                    <span className="font-bold text-gray-900 dark:text-white">${summary.byPaymentMethod.cash.toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">💳 Tarjeta</span>
                    <span className="font-bold text-gray-900 dark:text-white">${summary.byPaymentMethod.card.toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">📲 Transferencia</span>
                    <span className="font-bold text-gray-900 dark:text-white">${summary.byPaymentMethod.transfer.toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">🔄 Pagos Mixtos (Total)</span>
                    <span className="font-bold text-gray-900 dark:text-white">${summary.byPaymentMethod.mixed.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Cash Movements */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <h5 className="text-xs font-bold text-gray-500 dark:text-gray-450 uppercase tracking-wider">Movimientos de Turno</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Entradas / Depósitos</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">+${summary.cashFlow.deposits.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl">
                      <ArrowDownRight className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Salidas / Retiros</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">-${summary.cashFlow.withdrawals.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expected cash */}
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950/20 dark:to-primary-900/10 p-5 rounded-2xl border border-primary-100 dark:border-primary-900/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary-700 dark:text-primary-400">💰 Efectivo Esperado en Caja</p>
                  <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">(Fondo Inicial + Ventas Efectivo + Entradas - Salidas)</p>
                </div>
                <p className="text-2xl font-black text-primary-700 dark:text-primary-300">${expectedCash.toFixed(2)}</p>
              </div>
            </div>

            {/* Right Side: Shift Sales & Expandable Products */}
            <div className="w-full lg:w-1/2 p-6 flex flex-col min-h-0 overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Todas las Ventas ({summary.orders.length})</h4>
                <span className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-bold">
                  {summary.transactionCount} Transacciones
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {summary.orders.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-400 dark:text-gray-500">
                    <span className="text-3xl block mb-2">📥</span>
                    No hay ventas registradas en esta sesión de caja
                  </div>
                ) : (
                  summary.orders.map((order) => {
                    const isExpanded = !!expandedOrders[order.id];
                    return (
                      <div 
                        key={order.id} 
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                      >
                        {/* Summary Row */}
                        <div 
                          onClick={() => toggleOrderExpand(order.id)}
                          className="p-4 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-400 uppercase">#{order.id.slice(0, 8)}</span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-gray-800 dark:text-gray-300">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span>{order.user?.name || 'Vendedor'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-base font-bold text-gray-900 dark:text-white">${order.total.toFixed(2)}</p>
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800 capitalize">
                                {getPaymentMethodIcon(order.payment_method)}
                                {getPaymentMethodLabel(order.payment_method)}
                              </span>
                            </div>
                            <div className="text-gray-400">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>

                        {/* Accordion Detail: Products Sold */}
                        {isExpanded && (
                          <div className="bg-gray-50/50 dark:bg-gray-900/30 px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 animate-slide-down">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Productos Vendidos</p>
                            <div className="space-y-1.5">
                              {order.order_items.map((item) => (
                                <div key={item.id} className="flex justify-between items-center text-xs bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 font-bold px-2 py-0.5 rounded text-[11px]">
                                      {item.quantity}x
                                    </span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                      {item.product.name}
                                    </span>
                                  </div>
                                  <span className="font-mono text-gray-500 font-medium">
                                    ${item.subtotal.toFixed(2)} <span className="text-[10px] text-gray-400">(${item.unit_price.toFixed(2)} c/u)</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* Footer / Arqueo Count input */}
        {summary && (
          <div className="bg-white dark:bg-gray-800 px-6 py-5 border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Count Input Box */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contado Real en Caja (Efectivo)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={countedAmount}
                    onChange={(e) => setCountedAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all w-full sm:w-56"
                    required
                  />
                </div>
              </div>

              {/* Real-time difference display */}
              <div className="flex-1">
                {difference === 0 ? (
                  <div className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl border border-green-200 dark:border-green-900/30 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Caja Cuadrada Exacta</p>
                      <p className="text-xs opacity-90 mt-0.5">El monto contado coincide perfectamente con el esperado.</p>
                    </div>
                  </div>
                ) : difference < 0 ? (
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/30 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Faltante detectado: ${Math.abs(difference).toFixed(2)}</p>
                      <p className="text-xs opacity-90 mt-0.5">El dinero contado es menor al total esperado del arqueo.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Sobrante detectado: ${difference.toFixed(2)}</p>
                      <p className="text-xs opacity-90 mt-0.5">El dinero en caja supera el monto esperado del turno.</p>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-xl font-bold transition-all shadow-md shadow-red-600/10 flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar y Cerrar Caja
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
