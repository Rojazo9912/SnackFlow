import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    format?: 'currency' | 'number' | 'percent';
}

export function KPICard({ title, value, change, changeLabel, icon, format = 'number' }: KPICardProps) {
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
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatValue(value)}
                    </p>
                    {hasChange && (
                        <div className="flex items-center gap-1 mt-2">
                            {isPositive ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.abs(change).toFixed(1)}%
                            </span>
                            {changeLabel && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {changeLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
