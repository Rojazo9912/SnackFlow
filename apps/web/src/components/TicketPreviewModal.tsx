import { X, Printer } from 'lucide-react';
import { PrintTicket } from './PrintTicket';

interface TicketPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    order: any;
    tenant: any;
}

export function TicketPreviewModal({
    isOpen,
    onClose,
    onConfirm,
    order,
    tenant,
}: TicketPreviewModalProps) {
    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Vista Previa del Ticket
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Ticket Preview */}
                <div className="p-4">
                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner">
                        {/* Render ticket in preview mode */}
                        <div className="scale-95 origin-top">
                            <PrintTicket type="ticket" data={order} tenant={tenant} />
                        </div>
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Tip:</strong> Revisa que todos los datos sean correctos antes de imprimir
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 p-4 border-t bg-gray-50 sticky bottom-0">
                    <button onClick={onClose} className="btn-secondary flex-1">
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Confirmar e Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
}
