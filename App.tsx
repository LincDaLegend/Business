import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import Inventory from './components/Inventory.tsx';
import Sales from './components/Sales.tsx';
import Expenses from './components/Expenses.tsx';
import HeldOrders from './components/HeldOrders.tsx';
import LbcBooking from './components/LbcBooking.tsx';
import Settings from './components/Settings.tsx';
import Customers from './components/Customers.tsx';
import Analytics from './components/Analytics.tsx';
import Invoices from './components/Invoices.tsx';
import ProfitCalculator from './components/ProfitCalculator.tsx';
import { loadState, saveState } from './services/storageService.ts';
import { analyzeBusinessData } from './services/geminiService.ts';
import { AppState, InventoryItem, Sale, Expense, ShippingBatch, SaleStatus, Customer, Invoice, Notification } from './types.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<AppState>(loadState());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const isFirstRender = useRef(true);
  
  // State to handle deep-linking to LBC Booking for a specific customer
  const [lbcPreselectedCustomer, setLbcPreselectedCustomer] = useState<string | null>(null);



  // Check URL params for deep linking actions on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action === 'new_sale') {
      setActiveTab('sales');
    } else if (action === 'booking') {
      setActiveTab('lbc-booking');
    }
  }, []);

  // Save to local storage whenever data changes
  useEffect(() => {
    saveState(data);
  }, [data]);

  // Generate low stock notifications
  useEffect(() => {
    const lowStockItems = data.inventory.filter(i => i.quantity < 5);
    
    if (lowStockItems.length > 0) {
      const existingIds = new Set(data.notifications.filter(n => n.type === 'low_stock').map(n => n.id));
      
      lowStockItems.forEach(item => {
        const notifId = `low_stock_${item.id}`;
        if (!existingIds.has(notifId)) {
          addNotification({
            id: notifId,
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${item.name} has only ${item.quantity} left in stock.`,
            read: false,
            createdAt: new Date().toISOString(),
            actionUrl: 'inventory'
          });
        }
      });
    }
  }, [data.inventory]);

  const updateInventory = (newInventory: InventoryItem[]) => {
    setData(prev => ({ ...prev, inventory: newInventory }));
  };

  const updateSales = (newSales: Sale[]) => {
    setData(prev => ({ ...prev, sales: newSales }));
  };

  const updateExpenses = (newExpenses: Expense[]) => {
    setData(prev => ({ ...prev, expenses: newExpenses }));
  };

  const updateBudgets = (newBudgets: Record<string, number>) => {
    setData(prev => ({ ...prev, budgets: newBudgets }));
  };

  const updateSupplies = (newSupplies: { totalQuantity: number; costPerUnit: number; unitsPerItem: number }) => {
    setData(prev => ({ ...prev, supplies: newSupplies }));
  };
  
  const updateShippingBatches = (newBatches: ShippingBatch[]) => {
    setData(prev => ({ ...prev, shippingBatches: newBatches }));
  }

  const updateCategories = (newCategories: string[]) => {
    setData(prev => ({ ...prev, categories: newCategories }));
  };

  const updateCustomers = (newCustomers: Customer[]) => {
    setData(prev => ({ ...prev, customers: newCustomers }));
  };

  const updateInvoices = (newInvoices: Invoice[]) => {
    setData(prev => ({ ...prev, invoices: newInvoices }));
  };

  const updateNotifications = (newNotifications: Notification[]) => {
    setData(prev => ({ ...prev, notifications: newNotifications }));
  };

  const addNotification = (notification: Notification) => {
    setData(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications.slice(0, 49)] // Keep max 50
    }));
  };

  const setDarkMode = (value: boolean) => {
    setData(prev => ({ ...prev, darkMode: value }));
  };

  // Full state restore/update from Settings
  const handleImport = (importedData: AppState) => {
      setData(importedData);
      saveState(importedData); // Force immediate save
  };

  const updateInventoryStock = (itemId: string, qtyDelta: number) => {
    setData(prev => {
        const updatedInventory = prev.inventory.map(item => {
            if (item.id === itemId) {
                return { ...item, quantity: item.quantity + qtyDelta };
            }
            return item;
        });
        return { ...prev, inventory: updatedInventory };
    });
  };

  // Atomic delete operation to ensure consistency
  const deleteSale = (saleId: string) => {
    setData(prevData => {
        const saleToDelete = prevData.sales.find(s => s.id === saleId);
        
        if (!saleToDelete) return prevData;

        const updatedInventory = prevData.inventory.map(item => {
            if (item.id === saleToDelete.itemId) {
                return { ...item, quantity: item.quantity + saleToDelete.quantity };
            }
            return item;
        });

        const updatedSales = prevData.sales.filter(s => s.id !== saleId);

        return {
            ...prevData,
            inventory: updatedInventory,
            sales: updatedSales
        };
    });
  };

  const handleSync = async () => {
    const scriptUrl = data.googleSheetsUrl;
    if (!scriptUrl) {
        if (!data.autoSyncEnabled) {
             alert("Please configure the Google Apps Script URL in Settings first.");
             setActiveTab('settings');
        }
        return;
    }
    
    setIsSyncing(true);
    try {
        const payload = {
            sales: data.sales.map(s => ({
                date: new Date(s.date).toLocaleDateString(),
                itemName: s.itemName,
                customerName: s.customerName,
                saleType: s.saleType,
                status: s.status,
                paymentStatus: s.paymentStatus,
                quantity: s.quantity,
                unitPrice: s.unitPrice,
                totalAmount: s.totalAmount
            })),
            shipped: data.sales.filter(s => s.status === SaleStatus.SHIPPED).map(s => ({
                date: new Date(s.date).toLocaleDateString(),
                itemName: s.itemName,
                customerName: s.customerName,
                quantity: s.quantity,
                shippingDetails: s.shippingDetails || ''
            })),
            inventory: data.inventory.map(i => ({
                name: i.name,
                sku: i.sku,
                category: i.category,
                quantity: i.quantity,
                costPrice: i.costPrice,
                price: i.price,
                batchCode: i.batchCode || ''
            })),
            expenses: data.expenses.map(e => ({
                date: new Date(e.date).toLocaleDateString(),
                description: e.description,
                category: e.category,
                amount: e.amount
            }))
        };

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        if (!data.autoSyncEnabled) {
            addNotification({
              id: `sync_${Date.now()}`,
              type: 'success',
              title: 'Sync Complete',
              message: 'Your data has been synced to Google Sheets.',
              read: false,
              createdAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(error);
        if (!data.autoSyncEnabled) {
            alert("Sync failed. Check console for details.");
        }
    } finally {
        setIsSyncing(false);
    }
  };

  // AI Analysis
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAiInsights(null);
    
    try {
      const insights = await analyzeBusinessData(data);
      setAiInsights(insights);
      setActiveTab('dashboard');
      
      addNotification({
        id: `ai_${Date.now()}`,
        type: 'info',
        title: 'AI Analysis Complete',
        message: 'Your business insights are ready.',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      setAiInsights('Unable to generate insights. Please check your API key in Settings.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto Sync Logic
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    if (data.autoSyncEnabled && data.googleSheetsUrl) {
        const timeoutId = setTimeout(() => {
            console.log("Auto-syncing data...");
            handleSync();
        }, 4000);

        return () => clearTimeout(timeoutId);
    }
  }, [data]); 

  // Handler to navigate to LBC booking with a customer selected
  const handleNavigateToLbc = (customerName: string) => {
    setLbcPreselectedCustomer(customerName);
    setActiveTab('lbc-booking');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* AI Insights Banner */}
            {aiInsights && (
              <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-6 text-white shadow-soft">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-white font-bold flex items-center gap-1">✨ AI Insights</span>
                  <button 
                    onClick={() => setAiInsights(null)}
                    className="ml-auto text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-purple-100 font-sans">{aiInsights}</pre>
                </div>
              </div>
            )}
            {isAnalyzing && (
              <div className="bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-6 text-center">
                <div className="animate-spin w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-brand-700 font-medium">Analyzing your business data...</p>
              </div>
            )}
            <Dashboard data={data} setActiveTab={setActiveTab} />
          </div>
        );
      case 'inventory':
        return <Inventory 
          items={data.inventory} 
          setItems={updateInventory} 
          supplies={data.supplies}
          setSupplies={updateSupplies}
          shippingBatches={data.shippingBatches}
          setShippingBatches={updateShippingBatches}
        />;
      case 'sales':
        return <Sales 
          sales={data.sales} 
          inventory={data.inventory} 
          setSales={updateSales} 
          updateInventoryStock={updateInventoryStock}
          deleteSale={deleteSale}
          supplies={data.supplies}
          setSupplies={updateSupplies}
          shippingBatches={data.shippingBatches}
        />;
      case 'held-orders':
        return <HeldOrders 
          sales={data.sales}
          setSales={updateSales}
          onBookLbc={handleNavigateToLbc}
        />;
      case 'lbc-booking':
        return <LbcBooking 
          sales={data.sales}
          setSales={updateSales}
          preselectedCustomer={lbcPreselectedCustomer}
          clearPreselection={() => setLbcPreselectedCustomer(null)}
        />;
      case 'expenses':
        return <Expenses 
          expenses={data.expenses} 
          setExpenses={updateExpenses} 
          budgets={data.budgets}
          setBudgets={updateBudgets}
          categories={data.categories}
          setCategories={updateCategories}
        />;
      case 'customers':
        return <Customers
          customers={data.customers}
          setCustomers={updateCustomers}
          sales={data.sales}
        />;
      case 'analytics':
        return <Analytics data={data} />;
      case 'invoices':
        return <Invoices
          invoices={data.invoices}
          setInvoices={updateInvoices}
          customers={data.customers}
          sales={data.sales}
        />;
      case 'calculator':
        return (
          <div className="max-w-md mx-auto">
            <ProfitCalculator 
              currency={data.currency} 
              exchangeRate={data.exchangeRate} 
            />
          </div>
        );
      case 'settings':
        return <Settings 
          data={data}
          onImport={handleImport}
        />;
      default:
        return <Dashboard data={data} setActiveTab={setActiveTab} />;
    }
  };
  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSync={handleSync} 
        isSyncing={isSyncing} 
        autoSyncEnabled={data.autoSyncEnabled}
        notifications={data.notifications}
        setNotifications={updateNotifications}
        onAnalyze={handleAnalyze}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;