import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Minus, Trash2 } from 'lucide-react';
import { showToast } from '../utils/toast';
import { inventoryApi, productsApi } from '../services/api';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';

interface LowStockProduct {
  id: string;
  name: string;
  code: string;
  stock: number;
  min_stock: number;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
  product: { id: string; name: string };
  user: { id: string; name: string };
}

function StockThermometer({ stock, minStock }: { stock: number; minStock: number }) {
  const pct = Math.min(100, Math.max(0, ((stock ?? 0) / (minStock || 1)) * 100));

  const zone =
    pct === 0
      ? { label: 'Agotado', bar: 'bg-gradient-to-r from-red-500 to-rose-600 animate-pulse', text: 'text-red-600' }
      : pct < 10
      ? { label: 'Crítico', bar: 'bg-gradient-to-r from-red-500 to-rose-600 animate-pulse', text: 'text-red-600' }
      : pct < 50
      ? { label: 'Bajo', bar: 'bg-gradient-to-r from-orange-400 to-amber-500', text: 'text-orange-500' }
      : pct < 100
      ? { label: 'Precaución', bar: 'bg-gradient-to-r from-yellow-400 to-amber-400', text: 'text-yellow-500' }
      : { label: 'OK', bar: 'bg-gradient-to-r from-emerald-400 to-green-500', text: 'text-emerald-600' };

  return (
    <>
      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${zone.bar}`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1.5 text-[10px] font-bold uppercase tracking-wide">
        <span className={zone.text}>{zone.label}</span>
        <span className="text-gray-400">{Math.round(pct)}% del mínimo</span>
      </div>
    </>
  );
}

export function InventoryPage() {
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'waste'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lowStockData, movementsData, productsData] = await Promise.all([
        inventoryApi.getLowStock(),
        inventoryApi.getMovements({ limit: 20 }),
        productsApi.getAll(),
      ]);
      setLowStock(lowStockData);
      setMovements(movementsData);
      setProducts(productsData);
    } catch (error) {
      showToast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await inventoryApi.adjustStock(
        selectedProduct,
        adjustType,
        parseInt(quantity),
        reason
      );
      showToast.success('Stock ajustado correctamente');
      setShowAdjustModal(false);
      setSelectedProduct('');
      setQuantity('');
      setReason('');
      loadData();
    } catch (error: any) {
      showToast.error(error.message || 'Error ajustando stock');
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sale: 'Venta',
      adjustment_in: 'Entrada',
      adjustment_out: 'Salida',
      waste: 'Merma',
      return: 'Devolucion',
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: string) => {
    if (type === 'adjustment_in' || type === 'return') return 'text-green-600';
    return 'text-red-600';
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
      <Header
        title="Inventario"
        subtitle={`${lowStock.length} productos con stock bajo`}
        actions={
          <button
            onClick={() => setShowAdjustModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajustar Stock
          </button>
        }
      />

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="premium-glass-card rounded-2xl border border-red-200 dark:border-red-900/30 p-5 shadow-md shadow-red-500/5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-red-500 text-white shadow shadow-red-500/25 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="font-extrabold text-red-700 dark:text-red-400 tracking-tight">
              Alerta de Abastecimiento: Stock Bajo ({lowStock.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStock.map((product) => {
              const isCrit = product.stock === 0;

              return (
                <div
                  key={product.id}
                  className="flex flex-col p-4 bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 hover:shadow-md relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">{product.name}</p>
                      <p className="text-xs text-gray-400 font-semibold tracking-wider font-mono">{product.code}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${isCrit ? 'text-red-600 animate-pulse' : 'text-amber-500'}`}>
                        {product.stock}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                        Mínimo: {product.min_stock}
                      </p>
                    </div>
                  </div>

                  {/* Stock Thermometer — 4 zonas */}
                  <StockThermometer stock={product.stock} minStock={product.min_stock} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── Valuation Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-glass-card rounded-2xl p-5 border border-white/40 dark:border-gray-800/40 shadow-sm relative overflow-hidden group">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Valor de Almacén (A Costo)
          </p>
          <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            ${products.reduce((sum, p) => sum + (p.stock || 0) * (p.cost || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wide"> Capital Real Invertido </p>
        </div>
        <div className="premium-glass-card rounded-2xl p-5 border border-white/40 dark:border-gray-800/40 shadow-sm relative overflow-hidden group">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Valor Comercial (A Venta)
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            ${products.reduce((sum, p) => sum + (p.stock || 0) * (p.price || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wide"> Retorno Estimado Ventas </p>
        </div>
        <div className="premium-glass-card rounded-2xl p-5 border border-white/40 dark:border-gray-800/40 shadow-sm relative overflow-hidden group">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Utilidad Proyectada
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            ${(
              products.reduce((sum, p) => sum + (p.stock || 0) * (p.price || 0), 0) -
              products.reduce((sum, p) => sum + (p.stock || 0) * (p.cost || 0), 0)
            ).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wide"> Ganancia potencial bruta </p>
        </div>
      </div>

      {/* Recent movements */}
      <div className="card">
        <h2 className="font-semibold mb-4">Movimientos Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Motivo
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Usuario
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movements.map((mov) => (
                <tr key={mov.id}>
                  <td className="px-4 py-3 text-sm">
                    {new Date(mov.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{mov.product.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-medium ${getMovementTypeColor(
                        mov.type
                      )}`}
                    >
                      {getMovementTypeLabel(mov.type)}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${getMovementTypeColor(
                      mov.type
                    )}`}
                  >
                    {mov.type === 'adjustment_in' || mov.type === 'return'
                      ? '+'
                      : '-'}
                    {mov.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {mov.reason}
                  </td>
                  <td className="px-4 py-3 text-sm">{mov.user.name}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {movements.length === 0 && (
            <EmptyState
              title="No hay movimientos"
              description="Los movimientos de inventario aparecerán aquí"
            />
          )}
        </div>
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Ajustar Stock</h3>

            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Producto
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Seleccionar producto</option>
                  {products
                    .filter((p) => !p.is_composite)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.stock})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de ajuste
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'in', icon: Plus, label: 'Entrada', color: 'green' },
                    { id: 'out', icon: Minus, label: 'Salida', color: 'blue' },
                    { id: 'waste', icon: Trash2, label: 'Merma', color: 'red' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setAdjustType(type.id as any)}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 ${adjustType === type.id
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : 'border-gray-200'
                        }`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input"
                  placeholder="Ej: Compra de mercancia"
                  required
                  minLength={5}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Ajustar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
