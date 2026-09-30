export type UserRole = 'admin' | 'manager' | 'staff';

export interface User extends Record<string, unknown> {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface Category extends Record<string, unknown> {
  id: number;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier extends Record<string, unknown> {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Warehouse extends Record<string, unknown> {
  id: number;
  name: string;
  code: string;
  address?: string;
  manager?: string;
  contact_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Product extends Record<string, unknown> {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category_id: number;
  supplier_id?: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
  max_stock_level: number;
  barcode?: string;
  status: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  supplier_name?: string;
  total_quantity: number;
  stock_status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Over Stock';
}

export interface WarehouseStockDetail extends Record<string, unknown> {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  stock_status: string;
}

export interface ProductDetail extends Product {
  warehouse_stocks: WarehouseStockDetail[];
}

export interface InventoryItem extends Record<string, unknown> {
  id: number;
  product_id: number;
  sku: string;
  product_name: string;
  category_id: number;
  category_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  stock_status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Over Stock';
  updated_at: string;
}

export type TransactionType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT';

export interface InventoryTransaction extends Record<string, unknown> {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  warehouse_id: number;
  warehouse_name: string;
  transaction_type: TransactionType;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  reference_number?: string;
  user_id?: number;
  user_name?: string;
  notes?: string;
  created_at: string;
}

export type POStatus =
  | 'Draft'
  | 'Pending'
  | 'Approved'
  | 'Partially Received'
  | 'Received'
  | 'Cancelled';

export interface PurchaseOrderItem extends Record<string, unknown> {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  total: number;
}

export interface PurchaseOrder extends Record<string, unknown> {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  warehouse_id: number;
  warehouse_name: string;
  order_date: string;
  expected_delivery_date?: string;
  status: POStatus;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

export interface DashboardKPIs {
  total_products: intOrNumber;
  total_categories: number;
  total_stock_quantity: number;
  low_stock_products_count: number;
  out_of_stock_products_count: number;
  total_warehouses: number;
  stock_in_this_month: number;
  stock_out_this_month: number;
}

type intOrNumber = number;

export interface StockMovementPoint {
  date: string;
  stock_in: number;
  stock_out: number;
  transfers: number;
}

export interface LowStockAlert extends Record<string, unknown> {
  product_id: number;
  product_name: string;
  sku: string;
  current_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  is_out_of_stock: boolean;
}

export interface WarehouseDistribution extends Record<string, unknown> {
  warehouse_id: number;
  warehouse_name: string;
  total_items: number;
  total_quantity: number;
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  low_stock_alerts: LowStockAlert[];
  stock_movements: StockMovementPoint[];
  warehouse_distribution: WarehouseDistribution[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  success: boolean;
  message: string;
  error_code: string;
  details?: unknown;
}
