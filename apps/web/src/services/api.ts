import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, logout } = useAuthStore.getState();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    window.location.href = '/login';
    throw new ApiError(401, 'Sesion expirada');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.message || 'Error en la solicitud');
  }

  return data;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, {
      method: 'DELETE',
    }),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: any }>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),
};

// Products
export const productsApi = {
  getAll: (params?: { categoryId?: string; search?: string; favoritesOnly?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.favoritesOnly) searchParams.set('favoritesOnly', 'true');
    const query = searchParams.toString();
    return api.get<any[]>(`/products${query ? `?${query}` : ''}`);
  },
  getOne: (id: string) => api.get<any>(`/products/${id}`),
  create: (data: any) => api.post<any>('/products', data),
  update: (id: string, data: any) => api.patch<any>(`/products/${id}`, data),
  toggleActive: (id: string) => api.patch<any>(`/products/${id}/toggle-active`),
  toggleFavorite: (id: string) => api.patch<any>(`/products/${id}/toggle-favorite`),
  getLowStock: () => api.get<any[]>('/products/low-stock'),
};

// Categories
export const categoriesApi = {
  getAll: (includeInactive = false) =>
    api.get<any[]>(`/categories${includeInactive ? '?includeInactive=true' : ''}`),
  create: (data: any) => api.post<any>('/categories', data),
  update: (id: string, data: any) => api.patch<any>(`/categories/${id}`, data),
  toggleActive: (id: string) => api.patch<any>(`/categories/${id}/toggle-active`),
};

// Orders
export const ordersApi = {
  getAll: (params?: { status?: string; fromDate?: string; toDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    const query = searchParams.toString();
    return api.get<any[]>(`/orders${query ? `?${query}` : ''}`);
  },
  getPending: () => api.get<any[]>('/orders/pending'),
  getMyOrders: () => api.get<any[]>('/orders/my-orders'),
  getOne: (id: string) => api.get<any>(`/orders/${id}`),
  create: (data: { items: { productId: string; quantity: number; notes?: string }[]; notes?: string }) =>
    api.post<any>('/orders', data),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch<any>(`/orders/${id}/status`, { status, reason }),
  processPayment: (id: string, paymentMethod: string, paymentDetails?: any) =>
    api.post<any>(`/orders/${id}/pay`, { paymentMethod, paymentDetails }),
  cancel: (id: string, reason: string) =>
    api.post<any>(`/orders/${id}/cancel`, { reason }),
};

// Cash Register
export const cashRegisterApi = {
  getCurrent: () => api.get<any>('/cash-register/current'),
  open: (openingAmount: number) =>
    api.post<any>('/cash-register/open', { openingAmount }),
  close: (closingAmount: number) =>
    api.post<any>('/cash-register/close', { closingAmount }),
  addMovement: (type: 'deposit' | 'withdrawal', amount: number, reason: string) =>
    api.post<any>('/cash-register/movement', { type, amount, reason }),
  getMovements: () => api.get<any[]>('/cash-register/movements'),
  getHistory: (limit = 10) => api.get<any[]>(`/cash-register/history?limit=${limit}`),
};

// Inventory
export const inventoryApi = {
  getMovements: (params?: { productId?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.productId) searchParams.set('productId', params.productId);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return api.get<any[]>(`/inventory/movements${query ? `?${query}` : ''}`);
  },
  getKardex: (productId: string) => api.get<any[]>(`/inventory/kardex/${productId}`),
  adjustStock: (productId: string, type: 'in' | 'out' | 'waste', quantity: number, reason: string) =>
    api.post<any>('/inventory/adjust', { productId, type, quantity, reason }),
  getLowStock: () => api.get<any[]>('/inventory/low-stock'),
};

// Reports
export const reportsApi = {
  getDashboard: () => api.get<any>('/reports/dashboard'),
  getDailySales: (date?: string) =>
    api.get<any>(`/reports/daily-sales${date ? `?date=${date}` : ''}`),
  getSalesByHour: (date?: string) =>
    api.get<any>(`/reports/sales-by-hour${date ? `?date=${date}` : ''}`),
  getTopProducts: (days = 7, limit = 10) =>
    api.get<any>(`/reports/top-products?days=${days}&limit=${limit}`),
  getComparison: () => api.get<any>('/reports/comparison'),
};

// Users
export const usersApi = {
  getAll: () => api.get<any[]>('/users'),
  getOne: (id: string) => api.get<any>(`/users/${id}`),
  create: (data: any) => api.post<any>('/users', data),
  update: (id: string, data: any) => api.patch<any>(`/users/${id}`, data),
  updatePin: (id: string, pin: string) =>
    api.patch<any>(`/users/${id}/pin`, { pin }),
  toggleActive: (id: string) => api.patch<any>(`/users/${id}/toggle-active`),
};

// Tenants
export const tenantsApi = {
  getCurrent: () => api.get<any>('/tenants/current'),
  update: (data: any) => api.patch<any>('/tenants/current', data),
  getSettings: () => api.get<any>('/tenants/current/settings'),
  updateSettings: (settings: any) =>
    api.patch<any>('/tenants/current/settings', settings),
};
