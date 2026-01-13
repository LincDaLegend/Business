
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
}