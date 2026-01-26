import { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { showToast } from '../utils/toast';
import { cashRegisterApi } from '../services/api';

interface CashMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CashMovementModal({ isOpen, onClose, onSuccess }: CashMovementModalProps) {
    const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            showToast.error('El monto debe ser mayor a 0');
            return;
        }
        if (!reason.trim()) {
            showToast.error('El motivo es obligatorio');
            return;
        }

        setLoading(true);
        try {
            await cashRegisterApi.addMovement(
                type,
                parseFloat(amount),
                reason
            );
            showToast.success('Movimiento registrado correctamente');
            onSuccess();
            onClose();
            // Reset form
            setAmount('');
            setReason('');
            setType('deposit');
        } catch (error: any) {
            showToast.error(error.message || 'Error registrando movimiento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                        Registrar Movimiento
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => setType('deposit')}
                            className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${type === 'deposit'
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-gray-200 hover:border-green-200 hover:bg-green-50/50 text-gray-600'
                                }`}
                        >
                            <ArrowUpCircle className={`w-6 h-6 ${type === 'deposit' ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className="font-medium">Entrada</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('withdrawal')}
                            className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${type === 'withdrawal'
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-gray-200 hover:border-red-200 hover:bg-red-50/50 text-gray-600'
                                }`}
                        >
                            <ArrowDownCircle className={`w-6 h-6 ${type === 'withdrawal' ? 'text-red-600' : 'text-gray-400'}`} />
                            <span className="font-medium">Salida</span>
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monto
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input pl-8 text-lg font-bold"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Reason Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Motivo
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="input"
                            placeholder={type === 'deposit' ? 'Ej: Fondo de caja, Cambio extra' : 'Ej: Pago proveedor, Gastos varios'}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 btn text-white ${type === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            {loading ? 'Guardando...' : 'Guardar Movimiento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
