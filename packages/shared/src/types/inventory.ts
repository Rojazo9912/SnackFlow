export interface InventoryMovement {
  id: string;
  tenantId: string;
  productId: string;
  userId: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

export type MovementType =
  | 'sale'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'waste'
  | 'return';

export interface InventoryMovementWithDetails extends InventoryMovement {
  product: { id: string; name: string; code?: string };
  user: { id: string; name: string };
}
