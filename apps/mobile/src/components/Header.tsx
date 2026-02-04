import { useAuthStore } from '../stores/authStore';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useEffect } from 'react';
import { showToast } from '../utils/toast';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
    const user = useAuthStore((state) => state.user);
    const { theme, toggleTheme } = useTheme();
    const tenantLogo = user?.tenant?.settings?.logo;
    const tenantName = user?.tenant?.name;

    useEffect(() => {
        const handleLowStock = (e: CustomEvent) => {
            const product = e.detail;
            showToast.warning(`⚠️ Stock bajo: ${product.name} (${product.stock} disponibles)`);
        };

        window.addEventListener('low-stock-alert' as any, handleLowStock);
        return () => window.removeEventListener('low-stock-alert' as any, handleLowStock);
    }, []);

    return (
        <div className="mb-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {tenantLogo && (
                        <img
                            src={tenantLogo}
                            alt={tenantName || 'Logo'}
                            className="h-12 w-auto object-contain"
                        />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        ) : (
                            <Moon className="w-5 h-5 text-gray-600" />
                        )}
                    </button>
                    {actions}
                </div>
            </div>
        </div>
    );
}
