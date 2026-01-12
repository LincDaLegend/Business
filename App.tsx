import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import Inventory from './components/Inventory.tsx';
import Sales from './components/Sales.tsx';
import Expenses from './components/Expenses.tsx';
import HeldOrders from './components/HeldOrders.tsx';
import LbcBooking from './components/LbcBooking.tsx';
import Settings from './components/Settings.tsx';
import { loadState, saveState } from './services/storageService.ts';
import { AppState, InventoryItem, Sale, Expense, ShippingBatch } from './types.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<AppState>(loadState());
  
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

  // Full state restore
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
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;