import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface SalesChartProps {
    data: Array<{ date: string; total: number; orders: number }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
                <p className="text-primary-600 font-bold">
                    ${payload[0].value.toFixed(2)}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {payload[0].payload.orders} pedidos
                </p>
            </div>
        );
    }
    return null;
};

export function SalesChart({ data }: SalesChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                No hay datos disponibles
            </div>
        );
    }

    // Format dates for display
    const formattedData = data.map((item) => ({
        ...item,
        dayName: new Date(item.date).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
        }),
    }));



    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-[400px]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Ventas Últimos 7 Días
            </h3>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis
                        dataKey="dayName"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar
                        dataKey="total"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
