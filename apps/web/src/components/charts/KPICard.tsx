import { TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from './Sparkline';

interface KPICardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    format?: 'currency' | 'number' | 'percent';
    sparkData?: number[];
    sparkColor?: string;
}

export function KPICard({ title, value, change, changeLabel, icon, format = 'number', sparkData, sparkColor }: KPICardProps) {
    const formatValue = (val: string | number) => {
        if (format === 'currency') {
            return `$${typeof val === 'number' ? val.toFixed(2) : val}`;
        }
        if (format === 'percent') {
            return `${val}%`;
        }
        return val;
    };

    const isPositive = change !== undefined && change >= 0;
    const hasChange = change !== undefined && change !== 0;

    return (
        <div className="premium-glass-card hover:-translate-y-1.5 transform rounded-2xl p-6 border border-white/40 dark:border-gray-700/40 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 relative overflow-hidden group">
            {/* decorative background pulse */}
            <div className="absolute -right-10 -bottom-10 w-28 h-28 rounded-full bg-gradient-to-tr from-amber-400/5 to-orange-500/5 blur-2xl group-hover:scale-150 transition-transform duration-500" />
            {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
            
            <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                        {title}
                    </p>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {formatValue(value)}
                    </p>
                    {hasChange && (
                        <div className="flex items-center gap-1.5 mt-3">
                            <div className={`flex items-center justify-center p-1 rounded-lg ${isPositive ? 'bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/35 text-red-600 dark:text-red-400'}`}>
                                {isPositive ? (
                                    <TrendingUp className="w-3.5 h-3.5" />
                                ) : (
                                    <TrendingDown className="w-3.5 h-3.5" />
                                )}
                            </div>
                            <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isPositive ? '+' : ''}{Math.abs(change).toFixed(1)}%
                            </span>
                            {changeLabel && (
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                                    {changeLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="p-3.5 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-500/15 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
