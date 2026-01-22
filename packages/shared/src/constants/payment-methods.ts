export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  MIXED: 'mixed',
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Mixto',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  cash: 'banknote',
  card: 'credit-card',
  transfer: 'smartphone',
  mixed: 'wallet',
};
