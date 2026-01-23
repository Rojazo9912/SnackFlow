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
        const paymentDetails = data.payment_details ? JSON.parse(data.payment_details) : null;

        const renderTicket = () => (
            <div className="print-content text-black font-mono text-[11px] leading-tight w-[80mm] p-3">
                {/* Header with Logo */}
                <div className="text-center mb-3">
                    {settings.logo && (
                        <div className="mb-2 flex justify-center">
                            <img src={settings.logo} alt="Logo" className="max-h-20 object-contain" />
                        </div>
                    )}
                    <h1 className="text-base font-bold uppercase tracking-wide">{tenant?.name}</h1>
                    {settings.address && <p className="text-[10px] mt-1">{settings.address}</p>}
                    {settings.phone && <p className="text-[10px]">Tel: {settings.phone}</p>}
                    {settings.rfc && <p className="text-[10px]">RFC: {settings.rfc}</p>}
                </div>

                {/* Separator */}
                <div className="border-t-2 border-dashed border-black my-2"></div>

                {/* Ticket Info */}
                <div className="text-center mb-2">
                    <p className="font-bold text-[10px]">TICKET DE VENTA</p>
                    <p className="text-[10px]">#{data.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[10px]">{new Date(data.created_at).toLocaleString('es-MX')}</p>
                    {data.cashier?.name && <p className="text-[10px]">Cajero: {data.cashier.name}</p>}
                    {data.user?.name && <p className="text-[10px]">Vendedor: {data.user.name}</p>}
                </div>

                <div className="border-t border-dashed border-black my-2"></div>

                {/* Items Header */}
                <div className="flex justify-between font-bold text-[10px] mb-1">
                    <span className="flex-1">PRODUCTO</span>
                    <span className="w-12 text-center">CANT</span>
                    <span className="w-16 text-right">PRECIO</span>
                    <span className="w-16 text-right">TOTAL</span>
                </div>

                <div className="border-t border-black mb-1"></div>

                {/* Items */}
                {data.order_items?.map((item: any) => (
                    <div key={item.id} className="mb-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="flex-1 font-medium">{item.product.name}</span>
                            <span className="w-12 text-center">{item.quantity}</span>
                            <span className="w-16 text-right">${item.unit_price.toFixed(2)}</span>
                            <span className="w-16 text-right font-bold">${item.subtotal.toFixed(2)}</span>
                        </div>
                        {item.notes && (
                            <p className="text-[9px] italic text-gray-600 ml-2">* {item.notes}</p>
                        )}
                    </div>
                ))}

                <div className="border-t border-black my-2"></div>

                {/* Totals */}
                <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${data.subtotal?.toFixed(2) || data.total.toFixed(2)}</span>
                    </div>
                    {data.tax && (
                        <div className="flex justify-between">
                            <span>IVA (16%):</span>
                            <span>${data.tax.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center border-t-2 border-black pt-1 mt-1">
                        <span className="font-bold text-[13px]">TOTAL:</span>
                        <span className="font-bold text-[15px]">${data.total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="border-t border-dashed border-black my-2"></div>

                {/* Payment Info */}
                <div className="text-[10px] space-y-1">
                    <p className="font-bold">FORMA DE PAGO:</p>
                    {data.payment_method === 'mixed' && paymentDetails?.payments ? (
                        <div className="ml-2">
                            {paymentDetails.payments.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                    <span className="capitalize">{p.method === 'cash' ? 'Efectivo' : p.method === 'card' ? 'Tarjeta' : 'Transferencia'}:</span>
                                    <span>${p.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="ml-2 capitalize">
                            {data.payment_method === 'cash' ? 'Efectivo' :
                                data.payment_method === 'card' ? 'Tarjeta' :
                                    data.payment_method === 'transfer' ? 'Transferencia' :
                                        data.payment_method}
                        </p>
                    )}

                    {paymentDetails?.amountReceived && (
                        <>
                            <div className="flex justify-between ml-2">
                                <span>Recibido:</span>
                                <span>${paymentDetails.amountReceived.toFixed(2)}</span>
                            </div>
                            {paymentDetails.change > 0 && (
                                <div className="flex justify-between ml-2 font-bold">
                                    <span>Cambio:</span>
                                    <span>${paymentDetails.change.toFixed(2)}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {data.notes && (
                    <>
                        <div className="border-t border-dashed border-black my-2"></div>
                        <div className="text-[10px]">
                            <p className="font-bold">NOTAS:</p>
                            <p className="ml-2 italic">{data.notes}</p>
                        </div>
                    </>
                )}

                <div className="border-t-2 border-dashed border-black my-3"></div>

                {/* Footer */}
                <div className="text-center text-[9px] space-y-1">
                    {settings.ticketFooter && (
                        <p className="whitespace-pre-wrap mb-2">{settings.ticketFooter}</p>
                    )}
                    <p className="font-bold">¡GRACIAS POR SU COMPRA!</p>
                    <p>www.snackflow.com</p>
                    <p className="text-[8px] text-gray-500 mt-2">
                        Powered by SnackFlow POS
                    </p>
                </div>
            </div>
        );

        const renderComanda = () => (
            <div className="print-content text-black font-mono text-[13px] leading-tight w-[80mm] p-3">
                <div className="text-center mb-3 border-b-4 border-black pb-2">
                    <h1 className="text-2xl font-bold uppercase tracking-wider">COMANDA</h1>
                    <p className="text-lg font-bold mt-1">#{data.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-base">{new Date(data.created_at).toLocaleTimeString('es-MX')}</p>
                    <p className="text-sm mt-1">Mesa/Cliente: {data.table || 'N/A'}</p>
                </div>

                <div className="space-y-3 my-4">
                    {data.order_items?.map((item: any) => (
                        <div key={item.id} className="border-b-2 border-dashed border-gray-400 pb-3">
                            <div className="flex gap-3 items-start">
                                <span className="text-3xl font-bold min-w-[50px]">{item.quantity}x</span>
                                <div className="flex-1">
                                    <p className="text-xl font-bold uppercase">{item.product.name}</p>
                                    {item.notes && (
                                        <div className="mt-1 bg-yellow-100 border-2 border-yellow-400 p-2">
                                            <p className="text-base font-bold">⚠ {item.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {data.notes && (
                    <div className="mt-4 border-4 border-black p-3 text-center bg-gray-100">
                        <p className="font-bold underline text-base mb-1">NOTAS GENERALES:</p>
                        <p className="text-lg font-bold">{data.notes}</p>
                    </div>
                )}

                <div className="text-center mt-6 pt-3 border-t-2 border-black">
                    <p className="text-sm">Mesero: <span className="font-bold">{data.user?.name}</span></p>
                    <p className="text-xs mt-1">{new Date(data.created_at).toLocaleString('es-MX')}</p>
                </div>
            </div>
        );

        const renderReport = () => (
            <div className="print-content text-black font-mono text-[11px] leading-tight w-[80mm] p-3">
                <div className="text-center mb-3 border-b-2 border-black pb-2">
                    {settings.logo && (
                        <div className="mb-2 flex justify-center">
                            <img src={settings.logo} alt="Logo" className="max-h-16 object-contain" />
                        </div>
                    )}
                    <h1 className="text-base font-bold uppercase">REPORTE DIARIO</h1>
                    <p className="text-[10px]">{new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
                    <p className="text-[10px] font-bold">{tenant?.name}</p>
                </div>

                <div className="space-y-3">
                    <div>
                        <h2 className="font-bold border-b border-black text-[11px] mb-1">RESUMEN GENERAL</h2>
                        <div className="flex justify-between text-[10px] mt-1">
                            <span>Ventas Totales:</span>
                            <span className="font-bold">${data.totalSales?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span>Núm. Tickets:</span>
                            <span>{data.ticketCount}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span>Ticket Promedio:</span>
                            <span>${data.averageTicket?.toFixed(2)}</span>
                        </div>
                    </div>

                    {data.byPaymentMethod && (
                        <div>
                            <h2 className="font-bold border-b border-black text-[11px] mb-1">POR MÉTODO DE PAGO</h2>
                            {Object.entries(data.byPaymentMethod).map(([method, val]: [string, any]) => (
                                <div key={method} className="flex justify-between text-[10px]">
                                    <span className="capitalize">{method}:</span>
                                    <span>${val.total.toFixed(2)} ({val.count})</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {data.topProducts && (
                        <div>
                            <h2 className="font-bold border-b border-black text-[11px] mb-1">TOP 5 PRODUCTOS</h2>
                            {data.topProducts.slice(0, 5).map((p: any, i: number) => (
                                <div key={p.id} className="flex justify-between text-[9px]">
                                    <span>{i + 1}. {p.name}</span>
                                    <span>{p.quantity} uds - ${p.revenue?.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center pt-3 border-t border-black text-[9px]">
                    <p>Impreso: {new Date().toLocaleString('es-MX')}</p>
                    <p className="text-[8px] text-gray-500 mt-1">SnackFlow POS</p>
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

PrintTicket.displayName = 'PrintTicket';
