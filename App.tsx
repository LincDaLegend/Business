import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import Inventory from './components/Inventory.tsx';
import Sales from './components/Sales.tsx';
import Expenses from './components/Expenses.tsx';
import HeldOrders from './components/HeldOrders.tsx';
import LbcBooking from './components/LbcBooking.tsx';
import Settings from './components/Settings.tsx';
import { loadState, saveState } from './services/storageService.ts';
import { AppState, InventoryItem, Sale, Expense, ShippingBatch, SaleStatus } from './types.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<AppState>(loadState());
  const [isSyncing, setIsSyncing] = useState(false);
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
  // Uses functional update pattern to avoid stale state closures
  const deleteSale = (saleId: string) => {
    setData(prevData => {
        const saleToDelete = prevData.sales.find(s => s.id === saleId);
        
        // If sale not found, return previous state without changes
        if (!saleToDelete) return prevData;

        // Restore inventory
        const updatedInventory = prevData.inventory.map(item => {
            if (item.id === saleToDelete.itemId) {
                return { ...item, quantity: item.quantity + saleToDelete.quantity };
            }
            return item;
        });

        // Remove sale
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
            alert("Sync sent! Please check your Google Sheet.");
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

  // --- Auto Sync Logic ---
  useEffect(() => {
    // Skip the first render to prevent syncing on initial load
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    if (data.autoSyncEnabled && data.googleSheetsUrl) {
        // Debounce: Wait 4 seconds after last change before syncing
        const timeoutId = setTimeout(() => {
            console.log("Auto-syncing data...");
            handleSync();
        }, 4000);

        return () => clearTimeout(timeoutId);
    }
  }, [data]); 
  // Dependency on 'data' ensures this runs whenever inventory, sales, etc change.
  // Note: 'handleSync' closes over the current 'data' scope, which is correct.

  // Handler to navigate to LBC booking with a customer selected
  const handleNavigateToLbc = (customerName: string) => {
    setLbcPreselectedCustomer(customerName);
    setActiveTab('lbc-booking');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={data} setActiveTab={setActiveTab} />;
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
    >
      {renderContent()}
    </Layout>
  );
};

export default App;