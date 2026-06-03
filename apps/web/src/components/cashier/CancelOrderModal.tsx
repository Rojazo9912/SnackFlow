import { useState } from 'react';
import { X, AlertOctagon, CornerDownLeft, Ban } from 'lucide-react';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orderId: string;
}

export function CancelOrderModal({ isOpen, onClose, onConfirm, orderId }: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const presetReasons = [
    { label: 'Error de captura', icon: '⌨️', description: 'Se tomaron productos incorrectos' },
    { label: 'Cliente canceló', icon: '🚶‍♂️', description: 'El cliente desistió de la compra' },
    { label: 'Falta de stock', icon: '🚫', description: 'Un ingrediente/producto se agotó' },
    { label: 'Espera prolongada', icon: '⏳', description: 'El pedido tardó demasiado' },
    { label: 'Error en caja', icon: '💸', description: 'Error al procesar cobro' },
    { label: 'Otro motivo', icon: '✏️', description: 'Razón personalizada' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Otro motivo' ? customReason.trim() : selectedReason;
    
    if (!finalReason) {
      setError('Por favor, selecciona o ingresa un motivo para la cancelación.');
      return;
    }
    setError('');
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-red-100 dark:border-red-950/30 transform transition-all duration-300 scale-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl animate-pulse">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cancelar Pedido</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ¿Estás seguro de cancelar el pedido <span className="font-mono font-bold text-red-600 dark:text-red-400">#{orderId.slice(0, 8).toUpperCase()}</span>?
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Selecciona el Motivo de Cancelación
            </label>
            <div className="grid grid-cols-2 gap-3">
              {presetReasons.map((reason) => (
                <button
                  key={reason.label}
                  type="button"
                  onClick={() => {
                    setSelectedReason(reason.label);
                    setError('');
                  }}
                  className={`flex items-start gap-3 p-3 border-2 rounded-xl text-left transition-all ${
                    selectedReason === reason.label
                      ? 'border-red-500 bg-red-50/30 dark:bg-red-950/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <span className="text-2xl mt-0.5">{reason.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${selectedReason === reason.label ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {reason.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5 line-clamp-1">{reason.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {(selectedReason === 'Otro motivo' || selectedReason === '') && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Especifica la razón de cancelación
              </label>
              <textarea
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setError('');
                }}
                placeholder="Escribe el motivo detallado de la cancelación..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-950 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm resize-none"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CornerDownLeft className="w-5 h-5" />
              Regresar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-xl font-medium transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-2"
            >
              <Ban className="w-5 h-5" />
              Cancelar Pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
