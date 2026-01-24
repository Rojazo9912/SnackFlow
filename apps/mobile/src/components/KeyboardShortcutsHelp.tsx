import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Shortcut {
    keys: string[];
    description: string;
    category: string;
}

const shortcuts: Shortcut[] = [
    { keys: ['Ctrl', 'N'], description: 'Nueva venta', category: 'Navegación' },
    { keys: ['Ctrl', 'F'], description: 'Buscar producto', category: 'Navegación' },
    { keys: ['F2'], description: 'Abrir/Cerrar caja', category: 'Caja' },
    { keys: ['Esc'], description: 'Cerrar modal', category: 'General' },
    { keys: ['Ctrl', '/'], description: 'Mostrar esta ayuda', category: 'General' },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
    if (!isOpen) return null;

    const categories = Array.from(new Set(shortcuts.map(s => s.category)));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Keyboard className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Atajos de Teclado
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {categories.map(category => (
                        <div key={category} className="mb-6 last:mb-0">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {shortcuts
                                    .filter(s => s.category === category)
                                    .map((shortcut, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {shortcut.description}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, i) => (
                                                    <span key={i} className="flex items-center gap-1">
                                                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                                                            {key}
                                                        </kbd>
                                                        {i < shortcut.keys.length - 1 && (
                                                            <span className="text-gray-400">+</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Presiona <kbd className="px-2 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> para cerrar
                    </p>
                </div>
            </div>
        </div>
    );
}
