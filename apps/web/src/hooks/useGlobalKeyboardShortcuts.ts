import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcutConfig {
    onNewSale?: () => void;
    onSearch?: () => void;
    onOpenCashRegister?: () => void;
    onProcessPayment?: () => void;
    onReprintTicket?: () => void;
    onShowHelp?: () => void;
}

export function useGlobalKeyboardShortcuts(config: KeyboardShortcutConfig = {}) {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                // Allow Esc to close modals even when in input
                if (event.key !== 'Escape') {
                    return;
                }
            }

            // Ctrl+N - New Sale
            if (event.ctrlKey && event.key === 'n') {
                event.preventDefault();
                if (config.onNewSale) {
                    config.onNewSale();
                } else {
                    navigate('/sales');
                }
            }

            // Ctrl+F - Focus Search
            if (event.ctrlKey && event.key === 'f') {
                event.preventDefault();
                if (config.onSearch) {
                    config.onSearch();
                } else {
                    // Try to focus first input with type="search" or placeholder containing "buscar"
                    const searchInput = document.querySelector<HTMLInputElement>(
                        'input[type="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]'
                    );
                    searchInput?.focus();
                }
            }

            // F2 - Open/Close Cash Register
            if (event.key === 'F2') {
                event.preventDefault();
                if (config.onOpenCashRegister) {
                    config.onOpenCashRegister();
                }
            }

            // Ctrl+/ - Show Keyboard Shortcuts Help
            if (event.ctrlKey && event.key === '/') {
                event.preventDefault();
                if (config.onShowHelp) {
                    config.onShowHelp();
                }
            }

            // F3 - New Sale (Clear cart)
            if (event.key === 'F3') {
                event.preventDefault();
                if (config.onNewSale) {
                    config.onNewSale();
                }
            }

            // F4 - Process Payment
            if (event.key === 'F4') {
                event.preventDefault();
                if (config.onProcessPayment) {
                    config.onProcessPayment();
                }
            }

            // F9 - Reprint Last Ticket
            if (event.key === 'F9') {
                event.preventDefault();
                if (config.onReprintTicket) {
                    config.onReprintTicket();
                }
            }

            // Esc - Close modals (handled by modal components)
            if (event.key === 'Escape') {
                // This will be handled by individual modal components
                // Just prevent default to ensure consistent behavior
                event.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, config]);
}
