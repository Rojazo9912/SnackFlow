import { useState } from 'react';
import { X, Plus, Trash2, CreditCard, Banknote, Building2 } from 'lucide-react';

interface PaymentMethod {
    method: 'cash' | 'card' | 'transfer';
    amount: number;
}

interface MixedPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onConfirm: (payments: PaymentMethod[], amountReceived?: number, change?: number) => void;
}

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Efectivo', icon: Banknote, color: 'green' },
    { id: 'card', label: 'Tarjeta', icon: CreditCard, color: 'blue' },
    { id: 'transfer', label: 'Transferencia', icon: Building2, color: 'purple' },
];

export function MixedPaymentModal({ isOpen, onClose, total, onConfirm }: MixedPaymentModalProps) {
    const [payments, setPayments] = useState<PaymentMethod[]>([{ method: 'cash', amount: total }]);
    const [amountReceived, setAmountReceived] = useState<string>('');

    if (!isOpen) return null;

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = total - totalPaid;
    const cashPayment = payments.find(p => p.method === 'cash');
    const receivedNum = parseFloat(amountReceived) || 0;
    const change = cashPayment && receivedNum > 0 ? receivedNum - cashPayment.amount : 0;

    const addPayment = () => {
        setPayments([...payments, { method: 'cash', amount: remaining > 0 ? remaining : 0 }]);
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const updatePayment = (index: number, field: keyof PaymentMethod, value: any) => {
        const newPayments = [...payments];
        newPayments[index] = { ...newPayments[index], [field]: value };
        setPayments(newPayments);
    };

    const handleConfirm = () => {
        if (Math.abs(remaining) > 0.01) {
            alert('El monto total debe coincidir con el total del pedido');
            return;
        }
        onConfirm(payments, receivedNum > 0 ? receivedNum : undefined, change > 0 ? change : undefined);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold dark:text-white">Procesar Pago</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Total */}
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total a pagar</p>
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        ${total.toFixed(2)}
                    </p>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium dark:text-white">Métodos de Pago</h4>
                        <button
                            onClick={addPayment}
                            className="btn-secondary text-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar
                        </button>
                    </div>

                    {payments.map((payment, index) => (
                        <div key={index} className="flex gap-2 items-center">
                            <select
                                value={payment.method}
                                onChange={(e) => updatePayment(index, 'method', e.target.value)}
                                className="input flex-1"
                            >
                                {PAYMENT_METHODS.map((method) => (
                                    <option key={method.id} value={method.id}>
                                        {method.label}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={payment.amount}
                                onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                                className="input w-32"
                                placeholder="Monto"
                            />

                            {payments.length > 1 && (
                                <button
                                    onClick={() => removePayment(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Cash received (if cash payment) */}
                {cashPayment && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2 dark:text-white">
                            Monto recibido (efectivo)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min={cashPayment.amount}
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="input"
                            placeholder={`Mínimo $${cashPayment.amount.toFixed(2)}`}
                        />
                        {change > 0 && (
                            <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                                Cambio: ${change.toFixed(2)}
                            </p>
                        )}
                    </div>
                )}

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="dark:text-gray-300">Total pagado:</span>
                        <span className="font-medium dark:text-white">${totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="dark:text-gray-300">Restante:</span>
                        <span className={`font-medium ${remaining > 0.01 ? 'text-red-600' : remaining < -0.01 ? 'text-orange-600' : 'text-green-600'}`}>
                            ${remaining.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button onClick={onClose} className="btn-secondary flex-1">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={Math.abs(remaining) > 0.01}
                        className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Pago
                    </button>
                </div>
            </div>
        </div>
    );
}
