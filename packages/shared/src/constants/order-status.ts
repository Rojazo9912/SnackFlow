export const ORDER_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  IN_CASHIER: 'in_cashier',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  in_cashier: 'En Caja',
  paid: 'Cobrado',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'gray',
  pending: 'yellow',
  in_cashier: 'blue',
  paid: 'green',
  cancelled: 'red',
};

// Valid status transitions
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['in_cashier', 'cancelled'],
  in_cashier: ['paid', 'pending', 'cancelled'],
  paid: [],
  cancelled: [],
};
