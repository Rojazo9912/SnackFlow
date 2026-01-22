export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  CASHIER: 'cashier',
  SELLER: 'seller',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  cashier: 'Cajero',
  seller: 'Vendedor',
};

export const ROLE_PERMISSIONS = {
  admin: ['*'],
  supervisor: [
    'orders:read',
    'orders:update',
    'orders:cancel',
    'products:read',
    'inventory:read',
    'inventory:adjust',
    'reports:read',
    'cash:operate',
  ],
  cashier: [
    'orders:read',
    'orders:update',
    'orders:cancel',
    'products:read',
    'cash:operate',
  ],
  seller: ['orders:create', 'orders:read:own', 'products:read'],
} as const;
