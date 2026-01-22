import { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { reportsApi } from '../services/api';
import toast from 'react-hot-toast';

interface DashboardData {
  dailySales: {
    totalSales: number;
    ticketCount: number;
    averageTicket: number;
    byPaymentMethod?: Record<string, { total: number; count: number }>;
  };
  comparison: {
    percentChange: number;
    previousTotal: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockCount: number;
  salesByHour?: Record<string, { total: number; count: number }>;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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
      const [dashboard, salesByHour] = await Promise.all([
        reportsApi.getDashboard(),
        reportsApi.getSalesByHour(),
      ]);
      setData({ ...dashboard, salesByHour: salesByHour?.byHour });
    } catch (error: any) {
      if (!silent) toast.error('Error cargando dashboard');
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

  const percentChange = typeof data?.comparison?.percentChange === 'number'
    ? data.comparison.percentChange
    : parseFloat(String(data?.comparison?.percentChange || '0'));
  const isPositiveChange = percentChange >= 0;

  const hourlyData = data?.salesByHour
    ? Object.entries(data.salesByHour)
        .map(([hour, info]) => ({
          hour: `${hour}:00`,
          ventas: info.total,
          tickets: info.count,
        }))
        .filter((d) => d.ventas > 0)
    : [];

  const topProductsData = data?.topProducts?.slice(0, 5).map((p) => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    cantidad: p.quantity,
    ingresos: p.revenue,
  })) || [];

  const paymentMethodData = data?.dailySales?.byPaymentMethod
    ? Object.entries(data.dailySales.byPaymentMethod).map(([method, info], i) => ({
        name: method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'transfer' ? 'Transferencia' : method,
        value: info.total,
        count: info.count,
        fill: COLORS[i % COLORS.length],
      }))
    : [];

  const stats = [
    {
      name: 'Ventas del día',
      value: `$${(data?.dailySales?.totalSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      change: `${isPositiveChange ? '+' : ''}${percentChange.toFixed(1)}%`,
      changeType: isPositiveChange ? 'positive' : 'negative',
      icon: DollarSign,
      color: 'bg-gradient-to-br from-green-400 to-green-600',
    },
    {
      name: 'Tickets',
      value: data?.dailySales?.ticketCount || 0,
      icon: ShoppingBag,
      color: 'bg-gradient-to-br from-blue-400 to-blue-600',
    },
    {
      name: 'Ticket promedio',
      value: `$${(data?.dailySales?.averageTicket || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-purple-400 to-purple-600',
    },
    {
      name: 'Stock bajo',
      value: data?.lowStockCount || 0,
      icon: AlertTriangle,
      color: data?.lowStockCount ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-gray-400 to-gray-500',
      alert: (data?.lowStockCount || 0) > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => loadDashboard()}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className={`card relative overflow-hidden ${stat.alert ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                {stat.change && (
                  <div className={`flex items-center gap-1 mt-1 text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.changeType === 'positive' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{stat.change} vs ayer</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-xl ${stat.color} text-white shadow-lg`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Hora</h2>
          {hourlyData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVentas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay ventas registradas hoy</p>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h2>
          {paymentMethodData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 -mt-4">
                {paymentMethodData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              <p>Sin datos</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Productos</h2>
          {topProductsData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="cantidad" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No hay datos</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h2>
          <div className="space-y-3">
            {data?.topProducts?.slice(0, 5).map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-primary-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{product.quantity} uds</p>
                  <p className="text-sm text-gray-500">${product.revenue.toLocaleString('es-MX')}</p>
                </div>
              </div>
            ))}
            {(!data?.topProducts || data.topProducts.length === 0) && (
              <p className="text-gray-500 text-center py-8">No hay datos de ventas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
