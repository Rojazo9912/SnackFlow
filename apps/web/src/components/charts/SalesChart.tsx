interface SalesChartProps {
    data: Array<{ date: string; total: number; orders: number }>;
}

export function SalesChart({ data }: SalesChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No hay datos disponibles
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.total));
    const chartHeight = 200;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Ventas Últimos 7 Días
            </h3>

            <div className="relative" style={{ height: chartHeight + 40 }}>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-xs text-gray-500">
                    <span>${maxValue.toFixed(0)}</span>
                    <span>${(maxValue / 2).toFixed(0)}</span>
                    <span>$0</span>
                </div>

                {/* Chart area */}
                <div className="ml-12 h-full flex items-end justify-between gap-2">
                    {data.map((item, index) => {
                        const heightPercent = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
                        const date = new Date(item.date);
                        const dayName = date.toLocaleDateString('es-MX', { weekday: 'short' });

                        return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                {/* Bar */}
                                <div className="w-full flex flex-col justify-end" style={{ height: chartHeight }}>
                                    <div
                                        className="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer relative group"
                                        style={{ height: `${heightPercent}%` }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                                                <div className="font-semibold">${item.total.toFixed(2)}</div>
                                                <div className="text-gray-300">{item.orders} pedidos</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* X-axis label */}
                                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                                    {dayName}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
