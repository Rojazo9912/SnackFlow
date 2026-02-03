import { useAuthStore } from '../stores/authStore';
import { addOrder, getAllOrders, updateOrder, removeOrders } from '../lib/offlineQueue';

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

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data.message;
    throw new ApiError(response.status, message || 'Error en la solicitud');
  }

  return data as T;
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

// Offline Queue Logic
export const offlineService = {
  getQueue: () => getAllOrders(),

  addToQueue: async (orderData: any) => {
    const offlineOrder = {
      ...orderData,
      tempId: `OFFLINE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    await addOrder(offlineOrder);

    return {
      id: offlineOrder.tempId,
      ...orderData,
      created_at: offlineOrder.timestamp,
      status: 'pending',
      total: orderData.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
      is_offline: true,
      user: { name: 'Offline User' },
      order_items: orderData.items.map((item: any, index: number) => ({
        id: `OFFLINE-ITEM-${Date.now()}-${index}`,
        ...item,
        product: { name: item.name || 'Producto Offline' }
      }))
    };
  },

  updateOfflineOrder: async (id: string, updates: any) => {
    return updateOrder(id, updates);
  },

  sync: async () => {
    if (!navigator.onLine) return;

    const queue = await getAllOrders();
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} offline orders...`);
    const toRemove: string[] = [];
    let syncedCount = 0;

    for (const order of queue) {
      try {
        const createData = {
          items: order.items,
          notes: order.notes
        };

        const createdOrder = await api.post<any>('/orders', createData);

        if (order.status === 'completed' && order.paymentData) {
          await api.post<any>(`/orders/${createdOrder.id}/pay`, order.paymentData);
        }

        syncedCount++;
        toRemove.push(order.tempId);
      } catch (error) {
        console.error('Error syncing order:', order, error);
      }
    }

    if (toRemove.length > 0) {
      await removeOrders(toRemove);
    }

    if (syncedCount > 0) {
      window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: { count: syncedCount } }));
      window.dispatchEvent(new CustomEvent('orders-updated'));
    }
  }
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
  getPending: async () => {
    let onlineOrders: any[] = [];
    try {
      if (navigator.onLine) {
        onlineOrders = await api.get<any[]>('/orders/pending');
      }
    } catch (e) {
      console.warn('Could not fetch online orders', e);
    }

    // Get offline orders that are pending
    const offlineQueue = await offlineService.getQueue();
    const offlinePending = offlineQueue
      .filter((o: any) => o.status === 'pending')
      .map((o: any) => ({
        id: o.tempId,
        ...o,
        created_at: o.timestamp,
        status: 'pending',
        total: o.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
        is_offline: true,
        user: { name: 'Offline User' },
        order_items: o.items.map((item: any, index: number) => ({
          id: `OFFLINE-ITEM-${Date.now()}-${index}`,
          ...item,
          product: { name: item.name || 'Producto Offline' }
        }))
      }));

    return [...offlinePending, ...onlineOrders];
  },
  getMyOrders: () => api.get<any[]>('/orders/my-orders'),
  getOne: async (id: string) => {
    if (id.toString().startsWith('OFFLINE-')) {
      const queue = await offlineService.getQueue();
      const order = queue.find((o: any) => o.tempId === id);
      if (order) {
        return {
          id: order.tempId,
          ...order,
          created_at: order.timestamp,
          status: order.status || 'pending',
          total: order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
          is_offline: true,
          user: { name: 'Offline User' },
          order_items: order.items.map((item: any, index: number) => ({
            id: `OFFLINE-ITEM-${Date.now()}-${index}`,
            ...item,
            product: { name: item.name || 'Producto Offline' }
          }))
        };
      }
      throw new Error('Order not found in offline queue');
    }
    return api.get<any>(`/orders/${id}`);
  },
  create: async (data: { items: { productId: string; quantity: number; notes?: string; price?: number; name?: string }[]; notes?: string }) => {
    if (!navigator.onLine) {
      console.log('Offline mode: Queuing order');
      return offlineService.addToQueue(data);
    }
    try {
      return await api.post<any>('/orders', data);
    } catch (error) {
      // If network error, try offline queue
      if (!navigator.onLine) {
        return offlineService.addToQueue(data);
      }
      throw error;
    }
  },
  updateStatus: async (id: string, status: string, reason?: string) => {
    if (id.toString().startsWith('OFFLINE-')) {
      await offlineService.updateOfflineOrder(id, { status });
      return { success: true, offline: true };
    }
    return api.patch<any>(`/orders/${id}/status`, { status, reason });
  },
  processPayment: async (
    id: string,
    payments: Array<{ method: string; amount: number }>,
    amountReceived?: number,
    change?: number
  ) => {
    if (id.toString().startsWith('OFFLINE-')) {
      // Handle offline payment
      await offlineService.updateOfflineOrder(id, {
        status: 'completed',
        paymentData: { payments, amountReceived, change },
        payments,
        change
      });
      return { success: true, offline: true };
    }

    try {
      return await api.post<any>(`/orders/${id}/pay`, {
        payments,
        amountReceived,
        change,
      });
    } catch (error) {
      // If we are offline but trying to pay an ONLINE order, we can't easily do it 
      // without complex sync logic (queueing the payment for an existing ID).
      // For now, only allow offline payment for offline orders.
      if (!navigator.onLine) {
        throw new Error('No se puede procesar pago de pedido online sin conexión');
      }
      throw error;
    }
  },
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
  getCashSessionSummary: (sessionId: string) => api.get<any>(`/reports/cash-session/${sessionId}/summary`),
  exportDailySales: async (params?: { date?: string; format?: 'excel' | 'pdf' }) => {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.format) searchParams.set('format', params.format);

    const token = useAuthStore.getState().accessToken;
    const response = await fetch(`${API_URL}/reports/daily-sales/export?${searchParams.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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

    const token = useAuthStore.getState().accessToken;
    const response = await fetch(`${API_URL}/reports/top-products/export?${searchParams.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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









