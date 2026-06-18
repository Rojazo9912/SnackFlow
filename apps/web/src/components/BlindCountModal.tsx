import { useState } from 'react';
import { X, Calculator } from 'lucide-react';
import { cashRegisterApi } from '../services/api';
import { showToast } from '../utils/toast';

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];

interface Props {
  onClose: () => void;
  onConfirmed: (blindTotal: number) => void;
}

export function BlindCountModal({ onClose, onConfirmed }: Props) {
  const [counts, setCounts] = useState<Record<number, number>>(
    Object.fromEntries(DENOMINATIONS.map((d) => [d, 0]))
  );
  const [loading, setLoading] = useState(false);

  const total = DENOMINATIONS.reduce((sum, d) => sum + d * (counts[d] || 0), 0);

  const update = (denom: number, delta: number) => {
    setCounts((prev) => ({ ...prev, [denom]: Math.max(0, (prev[denom] || 0) + delta) }));
  };

  const handleInput = (denom: number, val: string) => {
    const n = parseInt(val, 10);
    setCounts((prev) => ({ ...prev, [denom]: isNaN(n) || n < 0 ? 0 : n }));
  };

  const handleConfirm = async () => {
    const denominations = DENOMINATIONS.filter((d) => counts[d] > 0).map((d) => ({
      denomination: d,
      quantity: counts[d],
    }));

    setLoading(true);
    try {
      const result = await cashRegisterApi.submitBlindCount(denominations);
      showToast.success('Arqueo registrado');
      onConfirmed(result.blindTotal);
    } catch (err: any) {
      showToast.error(err.message || 'Error registrando arqueo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow shadow-amber-500/20">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
              Arqueo Ciego de Caja
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Denomination grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {DENOMINATIONS.map((denom) => (
            <div
              key={denom}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
            >
              <span className="w-20 text-sm font-bold text-gray-700 dark:text-gray-300 shrink-0">
                ${denom % 1 === 0 ? denom : denom.toFixed(2)}
              </span>

              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => update(denom, -1)}
                  className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 font-bold text-lg leading-none flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={counts[denom] || 0}
                  onChange={(e) => handleInput(denom, e.target.value)}
                  className="w-16 text-center text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={() => update(denom, 1)}
                  className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-gray-300 font-bold text-lg leading-none flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>

              <span className="w-24 text-right text-sm font-semibold text-gray-600 dark:text-gray-400 shrink-0">
                = ${(denom * (counts[denom] || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>

        {/* Footer with total */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Total contado
            </span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || total === 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Confirmar Arqueo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
