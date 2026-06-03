import React, { useState } from 'react';
import { X, CreditCard, Landmark, CheckCircle } from 'lucide-react';

interface OpenRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

export function OpenRegisterModal({ isOpen, onClose, onConfirm }: OpenRegisterModalProps) {
  const [amount, setAmount] = useState<string>('200');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const quickAmounts = [100, 200, 500, 1000, 1500];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError('Por favor, ingresa un monto de apertura válido.');
      return;
    }
    setError('');
    onConfirm(numericAmount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-100 dark:border-gray-700 transform transition-all duration-300 scale-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Apertura de Caja</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ingresa el fondo inicial en efectivo para comenzar el turno</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Monto Inicial de Caja ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-2xl font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Selección Rápida (Billetes)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((qAmount) => (
                <button
                  key={qAmount}
                  type="button"
                  onClick={() => {
                    setAmount(qAmount.toString());
                    setError('');
                  }}
                  className={`flex flex-col items-center justify-center py-3 px-2 border-2 rounded-xl transition-all ${
                    parseFloat(amount) === qAmount
                      ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-bold shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-xs opacity-60">💵</span>
                  <span className="text-base font-semibold">${qAmount}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setAmount('0');
                  setError('');
                }}
                className={`flex flex-col items-center justify-center py-3 px-2 border-2 rounded-xl transition-all ${
                  parseFloat(amount) === 0
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-bold shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-xs opacity-60">✖</span>
                <span className="text-base font-semibold">$0.00</span>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-xl font-medium transition-all shadow-md shadow-green-600/10 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Abrir Caja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
