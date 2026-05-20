import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { ordersApi } from '../services/api';
import { showToast } from '../utils/toast';
import { Search, Printer, Calendar, Receipt, TrendingUp, ArrowRight, X } from 'lucide-react';
import { PrintTicket } from '../components/PrintTicket';
import { useRef } from 'react';
import { getStartOfDayISO, getEndOfDayISO, getTodayLocal } from '../utils/date';

interface Order {
  id: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  paid_at?: string;
  user: { name: string };
  order_items: Array<{
    id: string;
    quantity: number;
    product: { name: string };
  }>;
}

const PAYMENT_META: Record<string, { label: string; cls: string }> = {
  cash: { label: 'Efectivo', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  card: { label: 'Tarjeta', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  transfer: { label: 'Transfer.', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
  mixed: { label: 'Mixto', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
};

export function SalesHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Use Intl-based today to avoid locale-dependent issues
  const today = getTodayLocal();
  const [dateFilter, setDateFilter] = useState({ from: today, to: today });

  // Printing
  const printRef = useRef<HTMLDivElement>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

  // Summary stats from loaded orders
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

  useEffect(() => {
    loadOrders();
  }, [dateFilter]);

  const loadOrders = async () => {
    // Validate range
    if (dateFilter.from > dateFilter.to) {
      showToast.error('La fecha inicial no puede ser mayor a la final');
      return;
    }
    setLoading(true);
    try {
      const data = await ordersApi.getAll({
        status: 'paid',
        fromDate: getStartOfDayISO(dateFilter.from),
        toDate: getEndOfDayISO(dateFilter.to),
      });
      setOrders(data);
    } catch {
      showToast.error('Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (order: Order) => {
    setOrderToPrint(order);
    setTimeout(() => window.print(), 100);
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Display date for a sale — prefer paid_at over created_at
  const saleDate = (order: Order) =>
    new Date(order.paid_at || order.created_at).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

  return (
    <div className="space-y-6">
      <Header
        title="Historial de Ventas"
        subtitle="Consulta y reimprime tickets anteriores"
      />

      {/* ── Summary pills ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <div className="rounded-xl bg-primary-100 p-3 dark:bg-primary-900/30">
            <Receipt className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tickets</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {loading ? '—' : filteredOrders.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {loading
                ? '—'
                : `$${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <div className="rounded-xl bg-violet-100 p-3 dark:bg-violet-900/30">
            <Receipt className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ticket Promedio</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {loading
                ? '—'
                : `$${avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID o vendedor…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-700/50">
            <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="date"
              value={dateFilter.from}
              max={dateFilter.to}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, from: e.target.value }))}
              className="border-0 bg-transparent text-sm text-gray-900 focus:ring-0 dark:text-white"
            />
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
            <input
              type="date"
              value={dateFilter.to}
              min={dateFilter.from}
              max={getTodayLocal()}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, to: e.target.value }))}
              className="border-0 bg-transparent text-sm text-gray-900 focus:ring-0 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Ticket
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Fecha de Pago
                </th>
                <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">
                  Items
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Método
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
                      <p className="text-sm text-gray-500 animate-pulse">Cargando historial…</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        No se encontraron tickets en este rango
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const pm = PAYMENT_META[order.payment_method] ?? {
                    label: order.payment_method,
                    cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                  };

                  return (
                    <tr
                      key={order.id}
                      className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    >
                      {/* Ticket ID */}
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-primary-50 px-2 py-1 font-mono text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>

                      {/* Date (paid_at preferred) */}
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {saleDate(order)}
                      </td>

                      {/* Items */}
                      <td className="hidden px-5 py-4 text-sm text-gray-500 dark:text-gray-400 md:table-cell">
                        <div className="max-w-xs truncate">
                          {order.order_items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ')}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          ${order.total.toFixed(2)}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pm.cls}`}>
                          {pm.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handlePrint(order)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 opacity-0 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 group-hover:opacity-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-primary-500 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                          title="Reimprimir Ticket"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Reimprimir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination hint */}
        {filteredOrders.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Mostrando <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredOrders.length}</span>{' '}
              tickets
              {searchTerm && ` que coinciden con "${searchTerm}"`}
            </p>
          </div>
        )}
      </div>

      <PrintTicket ref={printRef} type="ticket" data={orderToPrint} tenant={{} as any} />
    </div>
  );
}
