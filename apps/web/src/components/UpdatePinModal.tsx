import React, { useState } from 'react';
import { X, Key, ShieldCheck } from 'lucide-react';

interface UpdatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  userName: string;
}

export function UpdatePinModal({ isOpen, onClose, onConfirm, userName }: UpdatePinModalProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4 || pin.length > 6 || isNaN(Number(pin))) {
      setError('El PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }
    setError('');
    onConfirm(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative border border-gray-150 dark:border-gray-700 transform transition-all duration-300 scale-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cambiar PIN de Acceso</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Usuario: <span className="font-semibold text-gray-700 dark:text-gray-300">{userName}</span></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Nuevo PIN (4 a 6 dígitos)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, ''); // Numeric only
                setPin(val);
                setError('');
              }}
              placeholder="••••"
              className="w-full text-center tracking-widest px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-2xl font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              autoFocus
              required
            />
            {error && <p className="mt-1.5 text-xs text-red-500 text-center font-medium">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-750 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white rounded-xl font-semibold transition-all shadow-md shadow-primary-600/10 flex items-center justify-center gap-1.5 text-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
