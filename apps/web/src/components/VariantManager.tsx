import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { attributesApi, productsApi } from '../services/api';
import { showToast } from '../utils/toast';

interface Attribute {
    id: string;
    name: string;
    display_order: number;
    values: AttributeValue[];
}

interface AttributeValue {
    id: string;
    value: string;
    display_order: number;
}

interface Variant {
    id?: string;
    sku: string;
    price: number;
    stock: number;
    min_stock: number;
    attributes: Record<string, string>;
    active: boolean;
}

interface VariantManagerProps {
    productId: string;
    onClose?: () => void;
}

export function VariantManager({ productId, onClose }: VariantManagerProps) {
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [productId]);

    const loadData = async () => {
        try {
            const [attributesData, variantsData] = await Promise.all([
                attributesApi.getAll(),
                productsApi.getVariants(productId),
            ]);
            setAttributes(attributesData);
            setVariants(variantsData || []);
        } catch (error) {
            showToast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const generateVariants = () => {
        if (selectedAttributes.length === 0) {
            showToast.warning('Selecciona al menos un atributo');
            return;
        }

        const selectedAttrs = attributes.filter(a => selectedAttributes.includes(a.id));
        const combinations: Record<string, string>[] = [];

        const generate = (index: number, current: Record<string, string>) => {
            if (index === selectedAttrs.length) {
                combinations.push({ ...current });
                return;
            }

            const attr = selectedAttrs[index];
            for (const value of attr.values) {
                current[attr.name.toLowerCase()] = value.value;
                generate(index + 1, current);
            }
        };

        generate(0, {});

        const newVariants: Variant[] = combinations.map(attrs => ({
            sku: '',
            price: 0,
            stock: 0,
            min_stock: 0,
            attributes: attrs,
            active: true,
        }));

        setVariants(newVariants);
        showToast.success(`${newVariants.length} variantes generadas`);
    };

    const updateVariant = (index: number, field: keyof Variant, value: any) => {
        const updated = [...variants];
        updated[index] = { ...updated[index], [field]: value };
        setVariants(updated);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const saveVariants = async () => {
        if (variants.length === 0) {
            showToast.warning('Genera al menos una variante');
            return;
        }

        // Validate all variants have price and SKU
        const invalid = variants.some(v => !v.sku || v.price <= 0);
        if (invalid) {
            showToast.error('Todas las variantes deben tener SKU y precio válido');
            return;
        }

        setSaving(true);
        try {
            // Delete existing variants
            const existingVariants = await productsApi.getVariants(productId);
            for (const variant of existingVariants) {
                await productsApi.deleteVariant(productId, variant.id);
            }

            // Create new variants
            for (const variant of variants) {
                await productsApi.createVariant(productId, variant);
            }

            showToast.success('Variantes guardadas correctamente');
            if (onClose) onClose();
        } catch (error: any) {
            showToast.error(error.message || 'Error guardando variantes');
        } finally {
            setSaving(false);
        }
    };

    const formatVariantName = (attrs: Record<string, string>) => {
        return Object.entries(attrs).map(([key, value]) => value).join(' - ');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Attribute Selector */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    1. Selecciona Atributos
                </h3>
                <div className="flex flex-wrap gap-2">
                    {attributes.map(attr => (
                        <button
                            key={attr.id}
                            onClick={() => {
                                if (selectedAttributes.includes(attr.id)) {
                                    setSelectedAttributes(selectedAttributes.filter(id => id !== attr.id));
                                } else {
                                    setSelectedAttributes([...selectedAttributes, attr.id]);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedAttributes.includes(attr.id)
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {attr.name} ({attr.values.length})
                        </button>
                    ))}
                </div>
                <button
                    onClick={generateVariants}
                    disabled={selectedAttributes.length === 0}
                    className="mt-3 btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Generar Variantes
                </button>
            </div>

            {/* Variants Table */}
            {variants.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        2. Configura Variantes ({variants.length})
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Variante
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        SKU
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Precio
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Stock
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Stock Mín
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {variants.map((variant, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {formatVariantName(variant.attributes)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={variant.sku}
                                                onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                                className="input text-sm"
                                                placeholder="SKU"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={variant.price}
                                                onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                                                className="input text-sm w-24"
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={variant.stock}
                                                onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                                                className="input text-sm w-20"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={variant.min_stock}
                                                onChange={(e) => updateVariant(index, 'min_stock', parseInt(e.target.value) || 0)}
                                                className="input text-sm w-20"
                                                min="0"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => removeVariant(index)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-4">
                        {onClose && (
                            <button onClick={onClose} className="btn-secondary">
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={saveVariants}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Guardando...' : 'Guardar Variantes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
