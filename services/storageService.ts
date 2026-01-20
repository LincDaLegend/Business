import { AppState, InventoryItem, Sale, Expense, SaleStatus, PaymentStatus } from '../types.ts';

const STORAGE_KEY = 'biztrack_data_v4'; // Bumped version for new features

// The user provided Google Apps Script Web App URL
const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyuUUUwB6SLKvI9Vayv-DDTux-Mt1JyVYsdkxj41niHRMBshjkEHNyhp7aQGpFDmdNYbw/exec';

const defaultState: AppState = {
  inventory: [
    { id: '1', name: 'Vintage Lens 50mm', sku: 'VL-001', quantity: 1, costPrice: 45.00, price: 150.00, category: 'Photography', batchCode: 'BATCH-001' },
    { id: '2', name: 'Rare Vinyl Record', sku: 'VR-002', quantity: 1, costPrice: 15.50, price: 80.00, category: 'Music', batchCode: 'BATCH-001' },
  ],
  sales: [
    { 
      id: 's1', 
      itemId: '1', 
      itemName: 'Vintage Lens 50mm', 
      customerName: 'John Doe', 
      quantity: 1, 
      unitPrice: 150.00,
      costPrice: 45.00,
      totalAmount: 150.00, 
      status: SaleStatus.SHIPPED, 
      paymentStatus: PaymentStatus.PAID,
      saleType: 'Sale',
      date: new Date(Date.now() - 86400000 * 2).toISOString() 
    },
  ],
  expenses: [
    { id: 'e1', description: 'Office Rent', category: 'Operating Expenses', amount: 1200, date: new Date(Date.now() - 86400000 * 5).toISOString() },
  ],
  shippingBatches: [
    { id: 'b1', code: 'BATCH-001', totalFee: 50.00, date: new Date().toISOString() }
  ],
  budgets: {},
  categories: ['Food', 'Essentials', 'Operating Expenses', 'Investment', 'Give'],
  supplies: {
    totalQuantity: 100,
    costPerUnit: 0.50,
    unitsPerItem: 1
  },
  googleSheetsUrl: DEFAULT_SHEETS_URL,
  ebayUserToken: '',
  autoSyncEnabled: false,
  
  // NEW: Default values for new features
  customers: [],
  invoices: [],
  notifications: [
    {
      id: 'welcome',
      type: 'info',
      title: 'Welcome to Bogart Business!',
      message: 'Your dashboard is ready. Start by adding inventory or recording sales.',
      read: false,
      createdAt: new Date().toISOString()
    }
  ],
  darkMode: false,
  currency: 'PHP',
  exchangeRate: 56.50 // Default PHP to USD rate
};

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return defaultState;
    const loadedState = JSON.parse(serialized);
    
    // Migration: ensure sales and inventory have costPrice if missing from old data
    if (loadedState.inventory) {
      loadedState.inventory = loadedState.inventory.map((item: any) => ({
        ...item,
        costPrice: item.costPrice || 0,
        quantity: 1, // Force non-fungible
        batchCode: item.batchCode || ''
      }));
    }
    if (loadedState.sales) {
      loadedState.sales = loadedState.sales.map((sale: any) => ({
        ...sale,
        costPrice: sale.costPrice || 0,
        supplyCost: sale.supplyCost || 0,
        shippingCost: sale.shippingCost || 0,
        saleType: sale.saleType || 'Sale'
      }));
    }
    if (!loadedState.budgets) {
      loadedState.budgets = {};
    }
    if (!loadedState.supplies) {
      loadedState.supplies = { totalQuantity: 0, costPerUnit: 0, unitsPerItem: 1 };
    }
    if (!loadedState.shippingBatches) {
      loadedState.shippingBatches = [];
    }
    if (!loadedState.categories || !Array.isArray(loadedState.categories)) {
      loadedState.categories = ['Food', 'Essentials', 'Operating Expenses', 'Investment', 'Give'];
    }
    // Automatically set the URL if it's missing or empty
    if (!loadedState.googleSheetsUrl) {
      loadedState.googleSheetsUrl = DEFAULT_SHEETS_URL;
    }
    // Default autoSync to false if undefined
    if (loadedState.autoSyncEnabled === undefined) {
      loadedState.autoSyncEnabled = false;
    }
    // Default eBay Token
    if (loadedState.ebayUserToken === undefined) {
      loadedState.ebayUserToken = '';
    }
    
    // NEW: Migration for new features
    if (!loadedState.customers) {
      loadedState.customers = [];
    }
    if (!loadedState.invoices) {
      loadedState.invoices = [];
    }
    if (!loadedState.notifications) {
      loadedState.notifications = defaultState.notifications;
    }
    if (loadedState.darkMode === undefined) {
      loadedState.darkMode = false;
    }
    if (!loadedState.currency) {
      loadedState.currency = 'PHP';
    }
    if (!loadedState.exchangeRate) {
      loadedState.exchangeRate = 56.50;
    }
    
    return loadedState;
  } catch (e) {
    console.error("Failed to load state", e);
    return defaultState;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};

// NEW: Helper to generate unique IDs
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// NEW: Helper to generate invoice numbers
export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};