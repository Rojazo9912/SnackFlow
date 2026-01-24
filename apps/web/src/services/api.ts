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
    const { logout } = useAuthStore.getState();
    logout();
    if (!window.location.pathname.includes('/login') && !endpoint.includes('/auth/login')) {
      window.location.href = '/login';
    }
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
  getAll: (params?: { categoryId?: string; search?: string; favoritesOnly?: boolean; includeInactive?: boolean; calculateCompositeStock?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.favoritesOnly) searchParams.set('favoritesOnly', 'true');
    if (params?.includeInactive) searchParams.set('includeInactive', 'true');
    if (params?.calculateCompositeStock) searchParams.set('calculateCompositeStock', 'true');
    const query = searchParams.toString();
    return api.get<any[]>(`/products${query ? `?${query}` : ''}`);
  },
  getOne: (id: string) => api.get<any>(`/products/${id}`),
  create: (data: any) => api.post<any>('/products', data),
  update: (id: string, data: any) => api.patch<any>(`/products/${id}`, data),
  toggleActive: (id: string) => api.patch<any>(`/products/${id}/toggle-active`),
  toggleFavorite: (id: string) => api.patch<any>(`/products/${id}/toggle-favorite`),
  getLowStock: () => api.get<any[]>('/products/low-stock'),
  getIngredients: (id: string) => api.get<any[]>(`/products/${id}/ingredients`),
  updateIngredients: (id: string, ingredients: { ingredientId: string; quantity: number }[]) =>
    api.patch<any>(`/products/${id}/ingredients`, { ingredients }),
  getCalculatedStock: (id: string) => api.get<any>(`/products/${id}/calculated-stock`),
  // Variants
  getVariants: (id: string) => api.get<any[]>(`/products/${id}/variants`),
  createVariant: (id: string, data: any) => api.post<any>(`/products/${id}/variants`, data),
  updateVariant: (productId: string, variantId: string, data: any) =>
    api.patch<any>(`/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId: string, variantId: string) =>
    api.delete<any>(`/products/${productId}/variants/${variantId}`),
};

// Attributes
export const attributesApi = {
  getAll: () => api.get<any[]>('/attributes'),
  create: (data: { name: string; display_order?: number }) =>
    api.post<any>('/attributes', data),
  update: (id: string, data: { name?: string; display_order?: number }) =>
    api.patch<any>(`/attributes/${id}`, data),
  delete: (id: string) => api.delete<any>(`/attributes/${id}`),
  createValue: (data: { attribute_id: string; value: string; display_order?: number }) =>
    api.post<any>('/attributes/values', data),
  deleteValue: (id: string) => api.delete<any>(`/attributes/values/${id}`),
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
  processPayment: (
    id: string,
    payments: Array<{ method: string; amount: number }>,
    amountReceived?: number,
    change?: number
  ) =>
    api.post<any>(`/orders/${id}/pay`, {
      payments,
      amountReceived,
      change,
    }),
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
  getSalesTrend: (days = 7) => api.get<any>(`/reports/sales-trend?days=${days}`),
  getKPIs: () => api.get<any>('/reports/kpis'),
  exportDailySales: async (params?: { date?: string; format?: 'excel' | 'pdf' }) => {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.format) searchParams.set('format', params.format);

    const response = await fetch(`${API_URL}/reports/daily-sales/export?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sf_token')}`,
      },
    });

    if (!response.ok) throw new Error('Error exportando reporte');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_ventas_${params?.date || new Date().toISOString().split('T')[0]}.${params?.format === 'pdf' ? 'pdf' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  exportTopProducts: async (params?: { days?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.set('days', params.days.toString());

    const response = await fetch(`${API_URL}/reports/top-products/export?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sf_token')}`,
      },
    });

    if (!response.ok) throw new Error('Error exportando reporte');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top_productos_${params?.days || 7}dias.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
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
  getPublic: (slug: string) => api.get<any>(`/tenants/public/${slug}`),
  getCurrent: () => api.get<any>('/tenants/current'),
  update: (data: any) => api.patch<any>('/tenants/current', data),
  getSettings: () => api.get<any>('/tenants/current/settings'),
  updateSettings: (settings: any) =>
    api.patch<any>('/tenants/current/settings', settings),
};

// Files
export const filesApi = {
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const { accessToken } = useAuthStore.getState();
    const response = await fetch(`${API_URL}/files/upload-logo`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(response.status, data.message || 'Error subiendo logo');
    }

    return response.json() as Promise<{ url: string }>;
  },
};
