import { forwardRef } from 'react';

interface PrintTicketProps {
    type: 'ticket' | 'comanda' | 'report';
    data: any;
    tenant: any;
}

export const PrintTicket = forwardRef<HTMLDivElement, PrintTicketProps>(
    ({ type, data, tenant }, ref) => {
        if (!data) return null;

        const settings = tenant?.settings || {};

        const renderTicket = () => (
            <div className="print-content text-black font-mono text-[12px] leading-tight w-[80mm] p-2">
                <div className="text-center mb-4">
                    {settings.logo && (
                        <div className="mb-2 flex justify-center">
                            <img src={settings.logo} alt="Logo" className="max-h-16 object-contain" />
                        </div>
                    )}
                    <h1 className="text-lg font-bold uppercase">{tenant?.name}</h1>
                    {settings.address && <p>{settings.address}</p>}
                    {settings.phone && <p>Tel: {settings.phone}</p>}

                    <div className="my-2 py-1 border-t border-b border-dashed border-black">
                        <p className="font-bold">{new Date(data.created_at).toLocaleString()}</p>
                        <p>Ticket: #{data.id.slice(0, 8)}</p>
                    </div>

                    {settings.ticketHeader && (
                        <p className="mt-2 italic whitespace-pre-wrap">{settings.ticketHeader}</p>
                    )}
                </div>

                <div className="border-b border-black py-2 mb-2">
                    <div className="flex justify-between font-bold mb-1">
                        <span>Prod</span>
                        <div className="flex gap-4">
                            <span>Cant</span>
                            <span>Total</span>
                        </div>
                    </div>
                    {data.order_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between mb-1">
                            <span className="truncate max-w-[150px]">{item.product.name}</span>
                            <div className="flex gap-4">
                                <span>{item.quantity}</span>
                                <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-right space-y-1 mb-4">
                    <div className="flex justify-between items-center border-t border-black pt-1">
                        <span className="font-bold">TOTAL:</span>
                        <span className="text-lg font-bold">${data.total.toFixed(2)}</span>
                    </div>
                    {data.payment_method && (
                        <p className="text-sm italic">Metodo: {data.payment_method}</p>
                    )}
                </div>

                <div className="text-center text-[10px] mt-4 space-y-1">
                    {settings.ticketFooter && (
                        <p className="whitespace-pre-wrap mb-2">{settings.ticketFooter}</p>
                    )}
                    <p>SnackFlow POS</p>
                </div>
            </div>
        );

        const renderComanda = () => (
            <div className="print-content text-black font-mono text-[14px] leading-tight w-[80mm] p-2">
                <div className="text-center mb-2 border-b-2 border-black pb-2">
                    <h1 className="text-xl font-bold uppercase">COMANDA</h1>
                    <p>#{data.id.slice(0, 8)}</p>
                    <p>{new Date(data.created_at).toLocaleTimeString()}</p>
                </div>

                <div className="space-y-4 my-4">
                    {data.order_items.map((item: any) => (
                        <div key={item.id} className="flex gap-4 border-b border-dashed border-gray-400 pb-2">
                            <span className="text-2xl font-bold">{item.quantity}x</span>
                            <div className="flex-1">
                                <p className="text-xl font-bold">{item.product.name}</p>
                                {item.notes && (
                                    <p className="text-lg bg-gray-100 p-1">*** {item.notes} ***</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {data.notes && (
                    <div className="mt-4 border-2 border-black p-2 text-center">
                        <p className="font-bold underline mb-1">NOTAS GENERALES:</p>
                        <p className="text-lg">{data.notes}</p>
                    </div>
                )}

                <div className="text-center mt-6 pt-4 border-t border-black">
                    <p className="text-sm">Mesero: {data.user?.name}</p>
                </div>
            </div>
        );

        const renderReport = () => (
            <div className="print-content text-black font-mono text-[12px] leading-tight w-[80mm] p-2">
                <div className="text-center mb-4 border-b-2 border-black pb-2">
                    {settings.logo && (
                        <div className="mb-2 flex justify-center">
                            <img src={settings.logo} alt="Logo" className="max-h-16 object-contain" />
                        </div>
                    )}
                    <h1 className="text-lg font-bold uppercase">REPORTE DIARIO</h1>
                    <p>{new Date().toLocaleDateString()}</p>
                    <p>{tenant?.name}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <h2 className="font-bold border-b border-black">RESUMEN GENERAL</h2>
                        <div className="flex justify-between mt-1">
                            <span>Ventas Totales:</span>
                            <span className="font-bold">${data.totalSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Num. Tickets:</span>
                            <span>{data.ticketCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Corte Promedio:</span>
                            <span>${data.averageTicket.toFixed(2)}</span>
                        </div>
                    </div>

                    {data.byPaymentMethod && (
                        <div>
                            <h2 className="font-bold border-b border-black">POR METODO</h2>
                            {Object.entries(data.byPaymentMethod).map(([method, val]: [string, any]) => (
                                <div key={method} className="flex justify-between">
                                    <span className="capitalize">{method}:</span>
                                    <span>${val.total.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {data.topProducts && (
                        <div>
                            <h2 className="font-bold border-b border-black">TOP PRODUCTOS</h2>
                            {data.topProducts.slice(0, 5).map((p: any) => (
                                <div key={p.id} className="flex justify-between text-[10px]">
                                    <span>{p.name}</span>
                                    <span>{p.quantity} uds</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center pt-4 border-t border-black text-[10px]">
                    <p>Impreso el: {new Date().toLocaleString()}</p>
                </div>
            </div>
        );

        return (
            <div ref={ref} className="hidden print:block">
                {type === 'ticket' && renderTicket()}
                {type === 'comanda' && renderComanda()}
                {type === 'report' && renderReport()}
            </div>
        );
    }
);
