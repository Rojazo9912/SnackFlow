import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Minus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryApi, productsApi } from '../services/api';

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
      toast.error('Error cargando datos');
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
      toast.success('Stock ajustado correctamente');
      setShowAdjustModal(false);
      setSelectedProduct('');
      setQuantity('');
      setReason('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Error ajustando stock');
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <button
          onClick={() => setShowAdjustModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ajustar Stock
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="card border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-red-700">
              Productos con Stock Bajo ({lowStock.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((product) => (
              <div
                key={product.id}
                className="flex justify-between items-center p-3 bg-red-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.code}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{product.stock}</p>
                  <p className="text-xs text-gray-500">
                    Min: {product.min_stock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <p className="text-center text-gray-500 py-8">
              No hay movimientos registrados
            </p>
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
                  {products.map((p) => (
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
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 ${
                        adjustType === type.id
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
