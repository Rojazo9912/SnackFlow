import { useState, useEffect } from 'react';
import { Banknote, CreditCard, Smartphone, Check } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onConfirm: (payments: Array<{ method: string; amount: number }>, receivedAmount?: number, change?: number) => Promise<void>;
    processing: boolean;
}

export function PaymentModal({ isOpen, onClose, total, onConfirm, processing }: PaymentModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');
    const [amountReceived, setAmountReceived] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setPaymentMethod('cash');
            setAmountReceived('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const calculateChange = () => {
        if (!amountReceived) return 0;
        return parseFloat(amountReceived) - total;
    };

    // Calculate bill breakdown for change
    const calculateBillBreakdown = (amount: number): { [key: number]: number } => {
        const bills = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
        const breakdown: { [key: number]: number } = {};
        let remaining = Math.round(amount);

        for (const bill of bills) {
            if (remaining >= bill) {
                breakdown[bill] = Math.floor(remaining / bill);
                remaining = remaining % bill;
            }
        }

        return breakdown;
    };

    const handleProcessPayment = () => {
        // Validation: Check for suspiciously high amounts
        const received = amountReceived ? parseFloat(amountReceived) : undefined;
        if (received && received > 5000) {
            const confirm = window.confirm(
                `El monto recibido ($${received.toFixed(2)}) es muy alto. ¿Es correcto?`
            );
            if (!confirm) return;
        }

        const change = received && paymentMethod === 'cash' ? received - total : undefined;
        const paymentData = [{ method: paymentMethod, amount: total }];

        onConfirm(paymentData, received, change);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4">Procesar Pago</h3>

                <div className="mb-4">
                    <p className="text-2xl font-bold text-primary-600 text-center">
                        ${total.toFixed(2)}
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                        { id: 'cash', icon: Banknote, label: 'Efectivo' },
                        { id: 'card', icon: CreditCard, label: 'Tarjeta' },
                        { id: 'transfer', icon: Smartphone, label: 'Transferencia' },
                    ].map((method) => (
                        <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${paymentMethod === method.id
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200'
                                }`}
                        >
                            <method.icon className="w-6 h-6" />
                            <span className="text-xs">{method.label}</span>
                        </button>
                    ))}
                </div>

                {paymentMethod === 'cash' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">
                            Monto recibido
                        </label>

                        {/* Smart Denominations */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            <button
                                onClick={() => setAmountReceived(total.toString())}
                                className="px-2 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                            >
                                Exacto
                            </button>
                            {[20, 50, 100, 200, 500, 1000].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setAmountReceived(amount.toString())}
                                    className="px-2 py-1 text-xs font-medium bg-white hover:bg-green-50 text-green-700 border border-green-200 rounded transition-colors"
                                >
                                    ${amount}
                                </button>
                            ))}
                        </div>

                        <input
                            type="number"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="input text-lg font-bold"
                            placeholder="0.00"
                            autoFocus
                        />
                        {amountReceived && calculateChange() >= 0 && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-lg font-bold text-green-700 flex justify-between items-center mb-2">
                                    <span>Cambio:</span>
                                    <span>${calculateChange().toFixed(2)}</span>
                                </p>

                                {/* Bill Breakdown */}
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {Object.entries(calculateBillBreakdown(calculateChange()))
                                        .sort((a, b) => Number(b[0]) - Number(a[0]))
                                        .map(([bill, count]) => (
                                            <span
                                                key={bill}
                                                className="inline-flex items-center px-2 py-1 rounded bg-white border border-green-300 text-xs font-medium text-green-800 shadow-sm"
                                            >
                                                <span className="font-bold mr-1">{count}x</span> ${bill}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        className="btn-secondary py-3"
                        disabled={processing}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleProcessPayment}
                        disabled={processing || (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))}
                        className="btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Confirmar Pago
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
