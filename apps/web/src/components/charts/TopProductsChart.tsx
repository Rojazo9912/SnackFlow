interface TopProductsChartProps {
    data: Array<{ name: string; quantity: number; revenue: number }>;
}

export function TopProductsChart({ data }: TopProductsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No hay datos disponibles
            </div>
        );
    }

    const maxQuantity = Math.max(...data.map(d => d.quantity));

    const colors = [
        'bg-blue-500 dark:bg-blue-600',
        'bg-green-500 dark:bg-green-600',
        'bg-yellow-500 dark:bg-yellow-600',
        'bg-purple-500 dark:bg-purple-600',
        'bg-pink-500 dark:bg-pink-600',
        'bg-indigo-500 dark:bg-indigo-600',
        'bg-red-500 dark:bg-red-600',
        'bg-orange-500 dark:bg-orange-600',
        'bg-teal-500 dark:bg-teal-600',
        'bg-cyan-500 dark:bg-cyan-600',
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top 10 Productos Más Vendidos
            </h3>

            <div className="space-y-3">
                {data.map((product, index) => {
                    const widthPercent = maxQuantity > 0 ? (product.quantity / maxQuantity) * 100 : 0;
                    const colorClass = colors[index % colors.length];

                    return (
                        <div key={index} className="group">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
                                    {product.name}
                                </span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                                    {product.quantity}
                                </span>
                            </div>
                            <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                <div
                                    className={`h-full ${colorClass} transition-all duration-500 rounded-lg flex items-center justify-end pr-3`}
                                    style={{ width: `${widthPercent}%` }}
                                >
                                    <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        ${product.revenue.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
