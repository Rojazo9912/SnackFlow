import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { reportsApi } from '../services/api';
import { showToast } from '../utils/toast';
import { Header } from '../components/Header';
import { KPICard } from '../components/charts/KPICard';
import { SalesChart } from '../components/charts/SalesChart';
import { TopProductsChart } from '../components/charts/TopProductsChart';

interface KPIsData {
  todaySales: number;
  averageTicket: number;
  lowStockProducts: number;
  pendingOrders: number;
  yesterdaySales: number;
  percentChange: string;
}

interface SalesTrendData {
  date: string;
  total: number;
  orders: number;
}

interface TopProductData {
  name: string;
  quantity: number;
  revenue: number;
}

export function DashboardPage() {
  const [kpis, setKpis] = useState<KPIsData | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(true), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [kpisData, trendData, productsData] = await Promise.all([
        reportsApi.getKPIs(),
        reportsApi.getSalesTrend(7),
        reportsApi.getTopProducts(7, 10),
      ]);

      setKpis(kpisData);
      setSalesTrend(trendData);
      setTopProducts(productsData.products || []);
    } catch (error: any) {
      if (!silent) showToast.error('Error cargando dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const percentChange = parseFloat(kpis?.percentChange?.replace('%', '') || '0');

  return (
    <div className="space-y-6">
      <Header
        title="Dashboard"
        subtitle="Resumen de ventas y métricas clave"
        actions={
          <button
            onClick={() => loadDashboard()}
            disabled={refreshing}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
      />

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Ventas del Día"
          value={kpis?.todaySales || 0}
          format="currency"
          change={percentChange}
          changeLabel="vs ayer"
          icon={<DollarSign className="w-6 h-6 text-primary-600" />}
        />
        <KPICard
          title="Ticket Promedio"
          value={kpis?.averageTicket || 0}
          format="currency"
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
        />
        <KPICard
          title="Pedidos Pendientes"
          value={kpis?.pendingOrders || 0}
          icon={<ShoppingBag className="w-6 h-6 text-blue-600" />}
        />
        <KPICard
          title="Productos Sin Stock"
          value={kpis?.lowStockProducts || 0}
          icon={<AlertTriangle className={`w-6 h-6 ${(kpis?.lowStockProducts || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`} />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={salesTrend} />
        <TopProductsChart data={topProducts} />
      </div>

      {/* Additional Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Información Adicional
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ventas de Ayer</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              ${(kpis?.yesterdaySales || 0).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cambio Porcentual</p>
            <p className={`text-xl font-bold ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Última Actualización</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
