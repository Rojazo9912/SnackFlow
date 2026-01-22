import { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { reportsApi } from '../services/api';
import toast from 'react-hot-toast';

interface DashboardData {
  dailySales: {
    totalSales: number;
    ticketCount: number;
    averageTicket: number;
  };
  comparison: {
    percentChange: string;
  };
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockCount: number;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await reportsApi.getDashboard();
      setData(response);
    } catch (error: any) {
      toast.error('Error cargando dashboard');
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

  const stats = [
    {
      name: 'Ventas del dia',
      value: `$${data?.dailySales.totalSales.toLocaleString() || 0}`,
      change: data?.comparison.percentChange || '0%',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      name: 'Tickets',
      value: data?.dailySales.ticketCount || 0,
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      name: 'Ticket promedio',
      value: `$${data?.dailySales.averageTicket.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      name: 'Stock bajo',
      value: data?.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-lg ${stat.color} text-white`}
              >
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                {stat.change && (
                  <p className="text-xs text-green-600">{stat.change} vs ayer</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top products */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Productos mas vendidos (7 dias)
        </h2>
        <div className="space-y-3">
          {data?.topProducts.map((product, index) => (
            <div
              key={product.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{product.quantity} uds</p>
                <p className="text-sm text-gray-500">
                  ${product.revenue.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {(!data?.topProducts || data.topProducts.length === 0) && (
            <p className="text-gray-500 text-center py-4">
              No hay datos de ventas
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
