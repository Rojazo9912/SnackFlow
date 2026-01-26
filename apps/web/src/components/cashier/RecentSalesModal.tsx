import { X, Printer } from 'lucide-react';

interface RecentSalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    sales: any[]; // Using any for simplicity as Order type is complex
    onPrint: (type: 'ticket', order: any) => void;
}

export function RecentSalesModal({ isOpen, onClose, sales, onPrint }: RecentSalesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-print">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Últimas Ventas de Hoy</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {sales.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p>No hay ventas registradas hoy</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sales.map((sale) => (
                                <div
                                    key={sale.id}
                                    className="card hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-xs font-mono text-gray-500">
                                                    #{sale.id.slice(0, 8).toUpperCase()}
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    {new Date(sale.created_at).toLocaleTimeString('es-MX')}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {sale.user?.name}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                                {sale.order_items?.slice(0, 3).map((item: any) => (
                                                    <span key={item.id} className="bg-gray-100 px-2 py-1 rounded">
                                                        {item.quantity}x {item.product.name}
                                                    </span>
                                                ))}
                                                {sale.order_items?.length > 3 && (
                                                    <span className="text-gray-500">
                                                        +{sale.order_items.length - 3} más
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-primary-600">
                                                    ${sale.total.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-gray-500 capitalize">
                                                    {sale.payment_method === 'cash' ? 'Efectivo' :
                                                        sale.payment_method === 'card' ? 'Tarjeta' :
                                                            sale.payment_method === 'transfer' ? 'Transferencia' :
                                                                sale.payment_method === 'mixed' ? 'Mixto' :
                                                                    sale.payment_method}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    onPrint('ticket', sale);
                                                    onClose();
                                                }}
                                                className="btn-primary flex items-center gap-2"
                                                title="Imprimir ticket"
                                            >
                                                <Printer className="w-4 h-4" />
                                                Imprimir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="btn-secondary w-full"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
