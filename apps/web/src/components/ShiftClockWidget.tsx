import { useEffect, useState, useCallback } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { shiftsApi } from '../services/api';
import { showToast } from '../utils/toast';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ShiftClockWidget() {
  const [shift, setShift] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const loadShift = useCallback(async () => {
    try {
      const data = await shiftsApi.getMyShift();
      setShift(data);
      if (data?.clock_in) {
        setElapsed(Math.floor((Date.now() - new Date(data.clock_in).getTime()) / 1000));
      }
    } catch {
      setShift(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    loadShift();
  }, [loadShift]);

  // Ticker
  useEffect(() => {
    if (!shift) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [shift]);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      await shiftsApi.clockIn();
      showToast.success('Turno iniciado');
      await loadShift();
    } catch (err: any) {
      showToast.error(err.message || 'Error al iniciar turno');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      await shiftsApi.clockOut();
      showToast.success('Turno cerrado');
      setShift(null);
      setElapsed(0);
    } catch (err: any) {
      showToast.error(err.message || 'Error al cerrar turno');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) return null;

  if (!shift) {
    return (
      <button
        onClick={handleClockIn}
        disabled={loading}
        title="Iniciar turno"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Iniciar turno</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        <span className="font-mono tracking-wider">{formatElapsed(elapsed)}</span>
      </div>
      <button
        onClick={handleClockOut}
        disabled={loading}
        title="Cerrar turno"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Salida</span>
      </button>
    </div>
  );
}
