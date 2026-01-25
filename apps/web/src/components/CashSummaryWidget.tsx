import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Receipt, CreditCard } from 'lucide-react';
import { reportsApi } from '../services/api';

interface CashSummaryWidgetProps {
    sessionId: string;
}

interface CashSummary {
    totalSales: number;
    transactionCount: number;
    averageTicket: number;
    byPaymentMethod: {
        cash: number;
        card: number;
        transfer: number;
        mixed: number;
    };
}

export function CashSummaryWidget({ sessionId }: CashSummaryWidgetProps) {
    const [summary, setSummary] = useState<CashSummary>({
        totalSales: 0,
        transactionCount: 0,
        averageTicket: 0,
        byPaymentMethod: {
            cash: 0,
            card: 0,
            transfer: 0,
            mixed: 0,
        },
    });
    const [loading, setLoading] = useState(true);

    const loadSummary = async () => {
        try {
            const data = await reportsApi.getCashSessionSummary(sessionId);
            setSummary(data);
        } catch (error) {
            console.error('Error loading cash summary:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionId) return;

        loadSummary();

        // Actualizar cada 30 segundos
        const interval = setInterval(loadSummary, 30000);
        return () => clearInterval(interval);
    }, [sessionId]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Ventas */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">Total Ventas</span>
                    <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-900">
                    ${summary.totalSales.toFixed(2)}
                </p>
            </div>

            {/* Transacciones */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Transacciones</span>
                    <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900">
                    {summary.transactionCount}
                </p>
            </div>

            {/* Ticket Promedio */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700">Ticket Promedio</span>
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-900">
                    ${summary.averageTicket.toFixed(2)}
                </p>
            </div>

            {/* Efectivo */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-700">Efectivo</span>
                    <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-900">
                    ${summary.byPaymentMethod.cash.toFixed(2)}
                </p>
                <div className="mt-1 text-xs text-amber-600 space-y-0.5">
                    {summary.byPaymentMethod.card > 0 && (
                        <div>Tarjeta: ${summary.byPaymentMethod.card.toFixed(2)}</div>
                    )}
                    {summary.byPaymentMethod.transfer > 0 && (
                        <div>Transfer: ${summary.byPaymentMethod.transfer.toFixed(2)}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
