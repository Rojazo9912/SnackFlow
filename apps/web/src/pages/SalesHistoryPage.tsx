import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { ordersApi } from '../services/api';
import { showToast } from '../utils/toast';
import { Search, Filter, Printer, Eye, Calendar } from 'lucide-react';
import { PrintTicket } from '../components/PrintTicket';
import { useRef } from 'react';
import { getStartOfDayISO, getEndOfDayISO } from '../utils/date';

interface Order {
    id: string;
    total: number;
    status: string;
    payment_method: string;
    created_at: string;
    user: { name: string };
    order_items: Array<{
        id: string;
        quantity: number;
        product: { name: string };
    }>;
}

export function SalesHistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({
        from: new Date().toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    });

    // Printing
    const printRef = useRef<HTMLDivElement>(null);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

    useEffect(() => {
        loadOrders();
    }, [dateFilter]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            // Assuming API supports date filtering
            const data = await ordersApi.getAll({
                status: 'paid',
                fromDate: getStartOfDayISO(dateFilter.from),
                toDate: getEndOfDayISO(dateFilter.to)
            });
            setOrders(data);
        } catch (error) {
            showToast.error('Error cargando historial');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = (order: Order) => {
        setOrderToPrint(order);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const filteredOrders = orders.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <Header
                title="Historial de Ventas"
                subtitle="Consulta y reimprime tickets anteriores"
            />

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por ID ticket o vendedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-10"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <input
                            type="date"
                            value={dateFilter.from}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                            className="bg-transparent border-none text-sm focus:ring-0 text-gray-900 dark:text-white"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateFilter.to}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                            className="bg-transparent border-none text-sm focus:ring-0 text-gray-900 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={loadOrders}
                        className="btn-secondary"
                        title="Actualizar"
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Ticket ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Items
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Método
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                            Cargando historial...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron tickets en este rango
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900 dark:text-white">
                                            #{order.id.slice(0, 8).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(order.created_at).toLocaleString('es-MX')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            <div className="max-w-xs truncate">
                                                {order.order_items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                            ${order.total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.payment_method === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                order.payment_method === 'card' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {order.payment_method === 'cash' ? 'Efectivo' :
                                                    order.payment_method === 'card' ? 'Tarjeta' :
                                                        order.payment_method === 'transfer' ? 'Transferencia' : 'Mixto'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handlePrint(order)}
                                                className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-1"
                                                title="Reimprimir Ticket"
                                            >
                                                <Printer className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PrintTicket
                ref={printRef}
                type="ticket"
                data={orderToPrint}
                tenant={{} as any} // Should pass tenant info here ideally context
            />
        </div>
    );
}
