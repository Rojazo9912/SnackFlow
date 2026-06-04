import { useEffect, useState } from 'react';
import {
  Calendar,
  Printer,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Clock,
  Award,
  Download,
  RefreshCw,
  BarChart2,
  Wallet,
  CreditCard,
  Smartphone,
  Layers,
} from 'lucide-react';
import { showToast } from '../utils/toast';
import { reportsApi } from '../services/api';
import { useRef } from 'react';
import { PrintTicket } from '../components/PrintTicket';
import { useAuthStore } from '../stores/authStore';
import { Header } from '../components/Header';
import { parseLocalDate, getTodayLocal } from '../utils/date';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | undefined | null) =>
  `$${(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  cash: {
    label: 'Efectivo',
    icon: <Wallet className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  card: {
    label: 'Tarjeta',
    icon: <CreditCard className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  transfer: {
    label: 'Transferencia',
    icon: <Smartphone className="w-4 h-4" />,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  mixed: {
    label: 'Mixto',
    icon: <Layers className="w-4 h-4" />,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
};

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  gradient,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}>
      {/* decorative blob */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 h-16 w-16 rounded-full bg-white/10" />

      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-white/80">{label}</p>
          <div className="rounded-xl bg-white/20 p-2">{icon}</div>
        </div>
        <p className="text-3xl font-extrabold tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-sm text-white/70">{sub}</p>}
      </div>
    </div>
  );
}

function HourBar({
  hour,
  total,
  count,
  max,
}: {
  hour: string;
  total: number;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? (total / max) * 100 : 0;
  const isHot = pct >= 80;

  return (
    <div className="group flex flex-col items-center gap-1">
      {/* tooltip on hover */}
      <div className="relative flex flex-col items-center">
        <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded-lg bg-gray-900 px-3 py-2 text-center text-xs text-white shadow-xl group-hover:block dark:bg-gray-700">
          <p className="font-bold">{fmt(total)}</p>
          <p className="text-white/70">{count} tickets</p>
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>

        <div
          className={`w-8 rounded-t-md transition-all duration-500 ${
            isHot
              ? 'bg-gradient-to-t from-orange-600 to-amber-400'
              : 'bg-gradient-to-t from-primary-600 to-primary-400'
          }`}
          style={{ height: `${Math.max(pct, 2)}%`, minHeight: 4 }}
        />
      </div>
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{hour}</span>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const today = getTodayLocal();
  const [dateFilter, setDateFilter] = useState({ from: today, to: today });
  const [dailySales, setDailySales] = useState<any>(null);
  const [salesByHour, setSalesByHour] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const handlePrint = () => {
    if (!dailySales) return;
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      await reportsApi.exportDailySales({ fromDate: dateFilter.from, toDate: dateFilter.to, format: 'excel' });
      showToast.success('Reporte Excel generado');
    } catch {
      showToast.error('Error exportando a Excel');
    }
  };

  const handleExportPdf = async () => {
    try {
      await reportsApi.exportDailySales({ fromDate: dateFilter.from, toDate: dateFilter.to, format: 'pdf' });
      showToast.success('Reporte PDF generado');
    } catch {
      showToast.error('Error exportando a PDF');
    }
  };

  const handleExportTopProducts = async () => {
    try {
      await reportsApi.exportTopProducts({ days: 7 });
      showToast.success('Reporte de productos generado');
    } catch {
      showToast.error('Error exportando reporte');
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateFilter]);

  const loadReports = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [daily, byHour, top] = await Promise.all([
        reportsApi.getDailySales(undefined, dateFilter.from, dateFilter.to),
        reportsApi.getSalesByHour(undefined, dateFilter.from, dateFilter.to),
        reportsApi.getTopProducts(7, 10),
      ]);
      setDailySales(daily);
      setSalesByHour(byHour);
      setTopProducts(top);
    } catch {
      showToast.error('Error cargando reportes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── date display (fix: parse with noon anchor to avoid UTC-offset bug) ──
  const displayDate = dateFilter.from === dateFilter.to
    ? parseLocalDate(dateFilter.from).toLocaleDateString('es-MX', { dateStyle: 'long' })
    : `Del ${parseLocalDate(dateFilter.from).toLocaleDateString('es-MX', { dateStyle: 'short' })} al ${parseLocalDate(dateFilter.to).toLocaleDateString('es-MX', { dateStyle: 'short' })}`;

  // ── hours chart ──────────────────────────────────────────────────────────
  const hourEntries: Array<{ hour: string; total: number; count: number }> = [];
  let maxHourVal = 1;

  if (salesByHour?.byHour) {
    const rawValues = Object.values(salesByHour.byHour) as Array<{ total: number; count: number }>;
    maxHourVal = Math.max(...rawValues.map((d) => d.total || 0), 1);

    Object.entries(salesByHour.byHour as Record<string, { total: number; count: number }>)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([h, d]) => {
        if (d.total > 0 || (Number(h) >= 7 && Number(h) <= 22)) {
          hourEntries.push({ hour: `${h.padStart(2, '0')}h`, total: d.total || 0, count: d.count || 0 });
        }
      });
  }

  // ── loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Cargando reportes…</p>
      </div>
    );
  }

  const hasData = (dailySales?.ticketCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Header
        title="Reportes"
        subtitle={displayDate}
        actions={
          <div className="flex flex-wrap items-center gap-2 no-print">
            {/* Date range picker */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
              <Calendar className="h-4 w-4 text-gray-400 animate-pulse" />
              <input
                type="date"
                value={dateFilter.from}
                max={dateFilter.to}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                className="border-0 bg-transparent text-sm text-gray-900 focus:ring-0 dark:text-white"
              />
              <span className="text-gray-400">a</span>
              <input
                type="date"
                value={dateFilter.to}
                min={dateFilter.from}
                max={getTodayLocal()}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                className="border-0 bg-transparent text-sm text-gray-900 focus:ring-0 dark:text-white"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadReports(true)}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              disabled={!hasData}
              className="btn-secondary flex items-center gap-2"
              title="Imprimir resumen del día"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
              title="Exportar a Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
              title="Exportar a PDF"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        }
      />

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label={dateFilter.from === dateFilter.to ? "Ventas del Día" : "Ventas del Período"}
          value={fmt(dailySales?.totalSales)}
          icon={<TrendingUp className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700"
          sub={dailySales?.comparison ? (
            `${Number(dailySales.comparison.salesChange) >= 0 ? '📈 +' : '📉 '}${dailySales.comparison.salesChange}% vs período anterior (${fmt(dailySales.comparison.prevTotalSales)})`
          ) : hasData ? undefined : 'Sin ventas registradas'}
        />
        <MetricCard
          label="Tickets"
          value={String(dailySales?.ticketCount ?? 0)}
          icon={<ShoppingCart className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-violet-500 via-purple-600 to-purple-700"
          sub={dailySales?.comparison ? (
            `${Number(dailySales.comparison.ticketsChange) >= 0 ? '📈 +' : '📉 '}${dailySales.comparison.ticketsChange}% vs período anterior (${dailySales.comparison.prevTicketCount})`
          ) : undefined}
        />
        <MetricCard
          label="Ticket Promedio"
          value={fmt(dailySales?.averageTicket)}
          icon={<Receipt className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700"
          sub={dailySales?.comparison ? (
            `${Number(dailySales.comparison.averageTicketChange) >= 0 ? '📈 +' : '📉 '}${dailySales.comparison.averageTicketChange}% vs período anterior (${fmt(dailySales.comparison.prevAverageTicket)})`
          ) : undefined}
        />
      </div>

      {dailySales?.comparison && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right no-print">
          * Comparación realizada contra el período anterior: <span className="font-semibold">{dailySales.comparison.prevPeriodLabel}</span>
        </p>
      )}

      {/* ── No data banner ──────────────────────────────────────────────── */}
      {!hasData && (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-900/20">
          <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-900/40">
            <BarChart2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Sin ventas para esta fecha</p>
            <p className="text-sm text-amber-700/70 dark:text-amber-400/70">
              No se registraron ventas el {displayDate}.
            </p>
          </div>
        </div>
      )}

      {/* ── Payment method breakdown ─────────────────────────────────────── */}
      {dailySales?.byPaymentMethod && hasData && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Wallet className="h-4 w-4 text-primary-500" />
            Ventas por Método de Pago
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(dailySales.byPaymentMethod).map(([method, data]: [string, any]) => {
              const meta = PAYMENT_LABELS[method] ?? {
                label: method,
                icon: <Wallet className="w-4 h-4" />,
                color: 'text-gray-600',
                bg: 'bg-gray-50',
              };
              const pct =
                dailySales.totalSales > 0
                  ? ((data.total / dailySales.totalSales) * 100).toFixed(1)
                  : '0';

              return (
                <div key={method} className={`rounded-xl p-4 ${meta.bg}`}>
                  <div className={`flex items-center gap-2 mb-2 ${meta.color}`}>
                    {meta.icon}
                    <span className="text-sm font-semibold">{meta.label}</span>
                  </div>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {fmt(data.total)}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{data.count} tickets</span>
                    <span className={`font-medium ${meta.color}`}>{pct}%</span>
                  </div>
                  {/* mini progress bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${meta.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sales by hour chart ──────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <Clock className="h-4 w-4 text-primary-500" />
          Ventas por Hora
        </h2>
        <p className="mb-5 text-xs text-gray-400 dark:text-gray-500">
          Distribución de ingresos durante el día
        </p>

        {hourEntries.length > 0 ? (
          <div className="flex h-48 items-end gap-1">
            {hourEntries.map(({ hour, total, count }) => (
              <HourBar
                key={hour}
                hour={hour}
                total={total}
                count={count}
                max={maxHourVal}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700/40">
            <p className="text-sm text-gray-400">Sin datos de ventas por hora</p>
          </div>
        )}
      </div>

      {/* ── Top Products ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Award className="h-4 w-4 text-amber-500" />
              Productos Más Vendidos
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Últimos {topProducts?.period ?? '7 días'}
            </p>
          </div>
          <button
            onClick={handleExportTopProducts}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </button>
        </div>

        {topProducts?.products?.length > 0 ? (
          <div className="space-y-2">
            {topProducts.products.map((product: any, index: number) => {
              const maxQty = topProducts.products[0]?.quantity ?? 1;
              const pct = maxQty > 0 ? (product.quantity / maxQty) * 100 : 0;
              const rankColors = [
                'from-amber-400 to-yellow-300',
                'from-gray-400 to-gray-300',
                'from-orange-600 to-orange-400',
              ];
              const medalBg = ['bg-amber-100 text-amber-700', 'bg-gray-100 text-gray-600', 'bg-orange-100 text-orange-700'];

              return (
                <div
                  key={product.id}
                  className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  {/* Rank badge */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                      index < 3
                        ? `bg-gradient-to-br ${rankColors[index]} text-white shadow`
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Name + bar */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {product.name}
                      </p>
                      <span className="ml-3 shrink-0 text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {product.code}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r transition-all duration-700 ${
                          index < 3
                            ? `${rankColors[index]}`
                            : 'from-primary-500 to-primary-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                      {product.quantity} <span className="text-xs font-normal text-gray-400">uds</span>
                    </p>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                      {fmt(product.revenue)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700/40">
            <p className="text-sm text-gray-400">No hay datos de ventas en el período</p>
          </div>
        )}
      </div>

      {/* ── Hidden print component ───────────────────────────────────────── */}
      <PrintTicket
        ref={printRef}
        type="report"
        reportDate={dateFilter.from === dateFilter.to ? dateFilter.from : undefined}
        data={{
          ...dailySales,
          topProducts: topProducts?.products,
        }}
        tenant={user?.tenant}
      />
    </div>
  );
}
