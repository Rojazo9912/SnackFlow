import { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';

interface Ingredient {
  ingredientId: string;
  quantity: number;
}

interface AvailableProduct {
  id: string;
  name: string;
  code: string;
  stock: number;
  unit: string;
}

interface Props {
  productId?: string;
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
  availableProducts: AvailableProduct[];
}

export function RecipeEditor({ productId, ingredients, onChange, availableProducts }: Props) {
  const [newIngredient, setNewIngredient] = useState({ ingredientId: '', quantity: '' });

  // Filter available products (exclude current product and already added ones)
  const filteredProducts = availableProducts.filter(
    (p) => p.id !== productId && !ingredients.find((i) => i.ingredientId === p.id)
  );

  const handleAdd = () => {
    if (!newIngredient.ingredientId || !newIngredient.quantity) return;

    onChange([
      ...ingredients,
      {
        ingredientId: newIngredient.ingredientId,
        quantity: parseFloat(newIngredient.quantity),
      },
    ]);
    setNewIngredient({ ingredientId: '', quantity: '' });
  };

  const handleRemove = (ingredientId: string) => {
    onChange(ingredients.filter((i) => i.ingredientId !== ingredientId));
  };

  const handleQuantityChange = (ingredientId: string, quantity: number) => {
    onChange(
      ingredients.map((i) =>
        i.ingredientId === ingredientId ? { ...i, quantity } : i
      )
    );
  };

  const getProductInfo = (id: string) => availableProducts.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Package className="w-4 h-4" />
        <span>Ingredientes de la receta</span>
      </div>

      {/* Current ingredients list */}
      {ingredients.length > 0 && (
        <div className="space-y-2">
          {ingredients.map((ing) => {
            const product = getProductInfo(ing.ingredientId);
            return (
              <div
                key={ing.ingredientId}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{product?.name || 'Producto no encontrado'}</p>
                  <p className="text-sm text-gray-500">
                    Stock: {product?.stock ?? 0} {product?.unit}
                  </p>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={ing.quantity}
                  onChange={(e) =>
                    handleQuantityChange(ing.ingredientId, parseFloat(e.target.value) || 0)
                  }
                  className="w-24 input text-center"
                />
                <span className="text-sm text-gray-500 w-16">{product?.unit}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(ing.ingredientId)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new ingredient */}
      <div className="flex gap-2">
        <select
          value={newIngredient.ingredientId}
          onChange={(e) => setNewIngredient({ ...newIngredient, ingredientId: e.target.value })}
          className="input flex-1"
        >
          <option value="">Seleccionar ingrediente...</option>
          {filteredProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.stock} {p.unit})
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Cantidad"
          value={newIngredient.quantity}
          onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
          className="w-24 input"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newIngredient.ingredientId || !newIngredient.quantity}
          className="btn-primary px-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {ingredients.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Agrega ingredientes para crear la receta
        </p>
      )}
    </div>
  );
}
