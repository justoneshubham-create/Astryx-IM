import type {
  User,
  Category,
  Supplier,
  Warehouse,
  Product,
  ProductDetail,
  InventoryItem,
  InventoryTransaction,
  PurchaseOrder,
  DashboardSummary,
  StockMovementPoint,
  LowStockAlert,
  PaginatedResponse,
  ApiError,
} from '../types';

const API_BASE = '/api';

export class ApiException extends Error {
  errorCode: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, errorCode: string = 'UNKNOWN_ERROR', statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'ApiException';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('astryx_auth_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errData: Partial<ApiError> = {};
    try {
      errData = await response.json();
    } catch {
      errData = {
        message: response.statusText || 'Network request failed',
        error_code: `HTTP_${response.status}`,
      };
    }

    const msg = errData.message || 'Request failed';
    const code = errData.error_code || `HTTP_${response.status}`;
    throw new ApiException(msg, code, response.status, errData.details);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      const data = await request<{ access_token: string; token_type: string; user: User }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      localStorage.setItem('astryx_auth_token', data.access_token);
      localStorage.setItem('astryx_user', JSON.stringify(data.user));
      return data;
    },
    register: (userData: { email: string; full_name: string; password: string; role?: string }) =>
      request<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    me: () => request<User>('/auth/me'),
    logout: () => {
      localStorage.removeItem('astryx_auth_token');
      localStorage.removeItem('astryx_user');
    },
  },

  // Dashboard
  dashboard: {
    getSummary: (days: number = 30) =>
      request<DashboardSummary>(`/dashboard/summary?days=${days}`),
    getStockMovement: (days: number = 30) =>
      request<StockMovementPoint[]>(`/dashboard/stock-movement?days=${days}`),
    getLowStock: () => request<LowStockAlert[]>('/dashboard/low-stock'),
  },

  // Products
  products: {
    getAll: (params?: {
      search?: string;
      category_id?: number;
      supplier_id?: number;
      status?: string;
      sort_by?: string;
      sort_order?: string;
      page?: number;
      page_size?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.category_id) query.append('category_id', params.category_id.toString());
      if (params?.supplier_id) query.append('supplier_id', params.supplier_id.toString());
      if (params?.status) query.append('status', params.status);
      if (params?.sort_by) query.append('sort_by', params.sort_by);
      if (params?.sort_order) query.append('sort_order', params.sort_order);
      if (params?.page) query.append('page', params.page.toString());
      if (params?.page_size) query.append('page_size', params.page_size.toString());
      return request<PaginatedResponse<Product>>(`/products?${query.toString()}`);
    },
    getById: (id: number) => request<ProductDetail>(`/products/${id}`),
    create: (data: Partial<Product>) =>
      request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Product>) =>
      request<ProductDetail>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/products/${id}`, {
        method: 'DELETE',
      }),
  },

  // Categories
  categories: {
    getAll: () => request<Category[]>('/categories'),
    create: (data: { name: string; description?: string; status?: string }) =>
      request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { name?: string; description?: string; status?: string }) =>
      request<Category>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  // Suppliers
  suppliers: {
    getAll: (params?: { search?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status) query.append('status', params.status);
      return request<Supplier[]>(`/suppliers?${query.toString()}`);
    },
    create: (data: Partial<Supplier>) =>
      request<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Supplier>) =>
      request<Supplier>(`/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/suppliers/${id}`, {
        method: 'DELETE',
      }),
  },

  // Warehouses
  warehouses: {
    getAll: () => request<Warehouse[]>('/warehouses'),
    create: (data: Partial<Warehouse>) =>
      request<Warehouse>('/warehouses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Warehouse>) =>
      request<Warehouse>(`/warehouses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/warehouses/${id}`, {
        method: 'DELETE',
      }),
  },

  // Inventory
  inventory: {
    getAll: (params?: {
      search?: string;
      warehouse_id?: number;
      category_id?: number;
      stock_status?: string;
      page?: number;
      page_size?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.warehouse_id) query.append('warehouse_id', params.warehouse_id.toString());
      if (params?.category_id) query.append('category_id', params.category_id.toString());
      if (params?.stock_status) query.append('stock_status', params.stock_status);
      if (params?.page) query.append('page', params.page.toString());
      if (params?.page_size) query.append('page_size', params.page_size.toString());
      return request<PaginatedResponse<InventoryItem>>(`/inventory?${query.toString()}`);
    },
    getByProductId: (productId: number) =>
      request<InventoryItem[]>(`/inventory/${productId}`),
    stockIn: (data: {
      warehouse_id: number;
      product_id: number;
      quantity: number;
      supplier_id?: number;
      unit_cost?: number;
      reference_number?: string;
      notes?: string;
    }) =>
      request<InventoryTransaction>('/inventory/stock-in', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    stockOut: (data: {
      warehouse_id: number;
      product_id: number;
      quantity: number;
      reason?: string;
      reference_number?: string;
      notes?: string;
    }) =>
      request<InventoryTransaction>('/inventory/stock-out', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    transfer: (data: {
      source_warehouse_id: number;
      destination_warehouse_id: number;
      product_id: number;
      quantity: number;
      reference_number?: string;
      notes?: string;
    }) =>
      request<InventoryTransaction[]>('/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    adjustment: (data: {
      warehouse_id: number;
      product_id: number;
      physical_quantity: number;
      reason: string;
      notes?: string;
    }) =>
      request<InventoryTransaction>('/inventory/adjustment', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Transactions
  transactions: {
    getAll: (params?: {
      search?: string;
      product_id?: number;
      warehouse_id?: number;
      transaction_type?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      page_size?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.product_id) query.append('product_id', params.product_id.toString());
      if (params?.warehouse_id) query.append('warehouse_id', params.warehouse_id.toString());
      if (params?.transaction_type) query.append('transaction_type', params.transaction_type);
      if (params?.start_date) query.append('start_date', params.start_date);
      if (params?.end_date) query.append('end_date', params.end_date);
      if (params?.page) query.append('page', params.page.toString());
      if (params?.page_size) query.append('page_size', params.page_size.toString());
      return request<PaginatedResponse<InventoryTransaction>>(`/transactions?${query.toString()}`);
    },
  },

  // Purchase Orders
  purchaseOrders: {
    getAll: (params?: {
      status?: string;
      supplier_id?: number;
      warehouse_id?: number;
      page?: number;
      page_size?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.supplier_id) query.append('supplier_id', params.supplier_id.toString());
      if (params?.warehouse_id) query.append('warehouse_id', params.warehouse_id.toString());
      if (params?.page) query.append('page', params.page.toString());
      if (params?.page_size) query.append('page_size', params.page_size.toString());
      return request<PaginatedResponse<PurchaseOrder>>(`/purchase-orders?${query.toString()}`);
    },
    getById: (id: number) => request<PurchaseOrder>(`/purchase-orders/${id}`),
    create: (data: {
      po_number: string;
      supplier_id: number;
      warehouse_id: number;
      order_date?: string;
      expected_delivery_date?: string;
      status?: string;
      notes?: string;
      items: Array<{
        product_id: number;
        quantity: number;
        unit_cost: number;
      }>;
    }) =>
      request<PurchaseOrder>('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: {
        status?: string;
        expected_delivery_date?: string;
        notes?: string;
      }
    ) =>
      request<PurchaseOrder>(`/purchase-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    receive: (
      id: number,
      data: {
        warehouse_id?: number;
        items: Array<{
          item_id: number;
          received_quantity: number;
        }>;
      }
    ) =>
      request<PurchaseOrder>(`/purchase-orders/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Users
  users: {
    getAll: () => request<User[]>('/users'),
    create: (data: { email: string; full_name: string; password: string; role: string; status?: string }) =>
      request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: { email?: string; full_name?: string; password?: string; role?: string; status?: string }
    ) =>
      request<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/users/${id}`, {
        method: 'DELETE',
      }),
  },
};
