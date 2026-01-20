
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  batchCode?: string;
  costPrice: number;
  price: number;
  category: string;
}

export enum SaleStatus {
  SHIPPED = 'Shipped',
  ON_HOLD = 'On Hold',
  TO_SHIP = 'To Ship'
}

export enum PaymentStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid'
}

export type SaleType = 'Sale' | 'Auction' | 'Firesale';

export interface Sale {
  id: string;
  itemId: string;
  itemName: string; 
  customerName: string;
  quantity: number;
  unitPrice: number; 
  costPrice: number; 
  supplyCost?: number; 
  shippingCost?: number;
  totalAmount: number;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  saleType: SaleType;
  date: string;
  shippingDetails?: string;
  customerId?: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string; 
}

export interface ShippingBatch {
  id: string;
  code: string;
  totalFee: number;
  date: string;
}

// NEW: Customer Interface for CRM
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
  createdAt: string;
  tags?: string[];
}

// NEW: Invoice Interface
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// NEW: Notification Interface
export interface Notification {
  id: string;
  type: 'low_stock' | 'payment_received' | 'shipping_reminder' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// NEW: Analytics Types
export interface ProductAnalytics {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  averageDaysToSell: number;
}

export interface AppState {
  inventory: InventoryItem[];
  sales: Sale[];
  expenses: Expense[];
  shippingBatches: ShippingBatch[];
  budgets: Record<string, number>;
  categories: string[];
  supplies: {
    totalQuantity: number;
    costPerUnit: number;
    unitsPerItem: number; 
  };
  googleSheetsUrl?: string;
  ebayUserToken?: string;
  autoSyncEnabled: boolean;
  
  // NEW: Additional state
  customers: Customer[];
  invoices: Invoice[];
  notifications: Notification[];
  darkMode: boolean;
  currency: 'PHP' | 'USD';
  exchangeRate: number; // PHP to USD
}