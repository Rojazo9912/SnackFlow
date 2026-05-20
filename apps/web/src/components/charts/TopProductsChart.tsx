interface TopProductsChartProps {
    data: Array<{ name: string; quantity: number; revenue: number }>;
    days?: number;
}

const RANK_STYLES = [
    { badge: 'bg-gradient-to-br from-amber-400 to-yellow-300 text-white shadow-md', bar: 'from-amber-400 to-yellow-300' },
    { badge: 'bg-gradient-to-br from-gray-400 to-gray-300 text-white shadow', bar: 'from-gray-400 to-gray-300' },
    { badge: 'bg-gradient-to-br from-orange-600 to-orange-400 text-white shadow', bar: 'from-orange-500 to-orange-400' },
];

export function TopProductsChart({ data, days = 7 }: TopProductsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl bg-white text-gray-500 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <span className="text-2xl">📦</span>
                <p className="text-sm">No hay datos disponibles</p>
            </div>
        );
    }

    const maxQuantity = Math.max(...data.map((d) => d.quantity));

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Top Productos Más Vendidos
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Últimos {days} días
                </p>
            </div>

            <div className="space-y-3">
                {data.map((product, index) => {
                    const widthPercent = maxQuantity > 0 ? (product.quantity / maxQuantity) * 100 : 0;
                    const rank = RANK_STYLES[index] ?? null;
                    const barColor = rank?.bar ?? 'from-primary-500 to-primary-400';

                    return (
                        <div key={index} className="group">
                            <div className="flex items-center gap-3 mb-1.5">
                                {/* Rank badge */}
                                <div
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                                        rank
                                            ? rank.badge
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    {index + 1}
                                </div>

                                {/* Name */}
                                <span className="flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    {product.name}
                                </span>

                                {/* Stats always visible */}
                                <div className="flex items-center gap-3 text-right">
                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                        {product.quantity}{' '}
                                        <span className="font-normal text-gray-400 dark:text-gray-500">uds</span>
                                    </span>
                                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                                        ${product.revenue.toLocaleString('es-MX', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="ml-9 relative h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                                <div
                                    className={`h-2 rounded-full bg-gradient-to-r transition-all duration-700 ${barColor}`}
                                    style={{ width: `${widthPercent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
