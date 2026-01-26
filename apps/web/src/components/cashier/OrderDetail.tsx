import { X } from 'lucide-react';

interface OrderDetailProps {
    order: any; // Using any for simplicity
    onClose: () => void;
    onCancel: (orderId: string) => void;
    onPay: () => void;
}

export function OrderDetail({ order, onClose, onCancel, onPay }: OrderDetailProps) {
    if (!order) return null;

    return (
        <div className="lg:w-96 bg-white rounded-xl shadow-sm flex flex-col">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold">Detalle del Pedido</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                    {order.order_items.map((item: any) => (
                        <div
                            key={item.id}
                            className="flex justify-between items-center py-2 border-b"
                        >
                            <div>
                                <p className="font-medium">{item.product.name}</p>
                                <p className="text-sm text-gray-500">
                                    {item.quantity} x ${item.unit_price.toFixed(2)}
                                </p>
                            </div>
                            <span className="font-semibold">
                                ${(item.quantity * item.unit_price).toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>

                {order.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            <strong>Nota:</strong> {order.notes}
                        </p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t space-y-3">
                <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-primary-600">
                        ${order.total.toFixed(2)}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onCancel(order.id)}
                        className="btn-danger flex-1"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onPay}
                        className="btn-success flex-1"
                        title="Cobrar (F2)"
                    >
                        Cobrar
                    </button>
                </div>
            </div>
        </div>
    );
}
