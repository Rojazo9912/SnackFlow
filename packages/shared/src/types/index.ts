// Shared TypeScript types for SnackFlow

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: 'basic' | 'pro' | 'enterprise';
    settings?: {
        logo?: string;
        address?: string;
        phone?: string;
        ticketHeader?: string;
        ticketFooter?: string;
    };
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    role: 'admin' | 'supervisor' | 'cashier' | 'seller';
    pin?: string;
    is_active: boolean;
    tenant?: Tenant;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: string;
    tenant_id: string;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    tenant_id: string;
    category_id?: string;
    name: string;
    description?: string;
    sku?: string;
    price: number;
    cost?: number;
    stock: number;
    min_stock?: number;
    image_url?: string;
    is_favorite: boolean;
    is_active: boolean;
    is_composite: boolean;
    category?: Category;
    calculated_stock?: number;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    notes?: string;
    product?: Product;
}

export type OrderStatus = 'draft' | 'pending' | 'in_cashier' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface Order {
    id: string;
    tenant_id: string;
    seller_id: string;
    cashier_id?: string;
    status: OrderStatus;
    total: number;
    payment_method?: PaymentMethod;
    payment_details?: Record<string, any>;
    notes?: string;
    cancelled_reason?: string;
    items?: OrderItem[];
    seller?: User;
    cashier?: User;
    created_at: string;
    updated_at: string;
}

export interface CashRegister {
    id: string;
    tenant_id: string;
    user_id: string;
    opening_amount: number;
    closing_amount?: number;
    expected_amount?: number;
    difference?: number;
    opened_at: string;
    closed_at?: string;
    user?: User;
}

export interface InventoryMovement {
    id: string;
    tenant_id: string;
    product_id: string;
    type: 'in' | 'out' | 'waste' | 'sale';
    quantity: number;
    reason?: string;
    user_id?: string;
    order_id?: string;
    product?: Product;
    user?: User;
    created_at: string;
}

export interface DailySalesReport {
    totalSales: number;
    ticketCount: number;
    averageTicket: number;
    byPaymentMethod?: Record<string, { total: number; count: number }>;
}

export interface DashboardData {
    dailySales: DailySalesReport;
    comparison: {
        percentChange: number;
        previousTotal: number;
    };
    topProducts: Array<{
        id: string;
        name: string;
        quantity: number;
        revenue: number;
    }>;
    lowStockCount: number;
    salesByHour?: Record<string, { total: number; count: number }>;
}

export interface ApiResponse<T> {
    data?: T;
    message?: string;
    error?: string;
}
