export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  pin?: string;
  active: boolean;
  createdAt: string;
}

export type UserRole = 'admin' | 'supervisor' | 'cashier' | 'seller';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  settings: TenantSettings;
  createdAt: string;
}

export type TenantPlan = 'basic' | 'pro' | 'enterprise';

export interface TenantSettings {
  currency?: string;
  timezone?: string;
  taxRate?: number;
  receiptHeader?: string;
  receiptFooter?: string;
}
