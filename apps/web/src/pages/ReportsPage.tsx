import { useEffect, useState } from 'react';
import { Calendar, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '../services/api';
import { useRef } from 'react';
import { PrintTicket } from '../components/PrintTicket';
import { useAuthStore } from '../stores/authStore';

export function ReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySales, setDailySales] = useState<any>(null);
  const [salesByHour, setSalesByHour] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Printing support
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const handlePrint = () => {
    if (!dailySales) return;
    window.print();
  };

  useEffect(() => {
    loadReports();
  }, [date]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [daily, byHour, top] = await Promise.all([
        reportsApi.getDailySales(date),
        reportsApi.getSalesByHour(date),
        reportsApi.getTopProducts(7, 10),
      ]);
      setDailySales(daily);
      setSalesByHour(byHour);
      setTopProducts(top);
    } catch (error) {
      toast.error('Error cargando reportes');
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <div className="flex items-center gap-2 no-print">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input w-auto"
          />
          <button
            onClick={handlePrint}
            disabled={!dailySales}
            className="btn-secondary flex items-center gap-2"
            title="Imprimir resumen del dia"
          >
            <Printer className="w-5 h-5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Daily summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Ventas del dia</p>
          <p className="text-3xl font-bold text-primary-600">
            ${dailySales?.totalSales.toLocaleString() || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Tickets</p>
          <p className="text-3xl font-bold text-gray-900">
            {dailySales?.ticketCount || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Ticket promedio</p>
          <p className="text-3xl font-bold text-gray-900">
            ${dailySales?.averageTicket.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Payment methods breakdown */}
      {dailySales?.byPaymentMethod && (
        <div className="card">
          <h2 className="font-semibold mb-4">Ventas por metodo de pago</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(dailySales.byPaymentMethod).map(
              ([method, data]: [string, any]) => (
                <div key={method} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 capitalize">{method}</p>
                  <p className="text-xl font-bold">
                    ${data.total.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">{data.count} tickets</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Sales by hour */}
      <div className="card">
        <h2 className="font-semibold mb-4">Ventas por hora</h2>
        <div className="h-64 flex items-end gap-1">
          {salesByHour?.byHour &&
            Object.entries(salesByHour.byHour)
              .filter(([_, data]: [string, any]) => data.total > 0)
              .map(([hour, data]: [string, any]) => {
                const maxTotal = Math.max(
                  ...Object.values(salesByHour.byHour).map(
                    (d: any) => d.total || 0
                  )
                );
                const height =
                  maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;

                return (
                  <div
                    key={hour}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary-500 rounded-t transition-all"
                      style={{ height: `${height}%` }}
                      title={`$${data.total.toFixed(2)} (${data.count} tickets)`}
                    />
                    <span className="text-xs text-gray-500">{hour}h</span>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Top products */}
      <div className="card">
        <h2 className="font-semibold mb-4">
          Productos mas vendidos ({topProducts?.period})
        </h2>
        <div className="space-y-3">
          {topProducts?.products.map((product: any, index: number) => (
            <div
              key={product.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.code}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{product.quantity} uds</p>
                <p className="text-sm text-gray-500">
                  ${product.revenue.toLocaleString()}
                </p>
              </div>
            </div>
          ))}

          {(!topProducts?.products || topProducts.products.length === 0) && (
            <p className="text-center text-gray-500 py-4">
              No hay datos de ventas
            </p>
          )}
        </div>
      </div>

      {/* Printing Component */}
      <PrintTicket
        ref={printRef}
        type="report"
        data={{
          ...dailySales,
          topProducts: topProducts?.products
        }}
        tenant={user?.tenant}
      />
    </div>
  );
}
