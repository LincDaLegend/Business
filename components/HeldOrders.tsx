import React, { useMemo, useState } from 'react';
import { Sale, SaleStatus } from '../types.ts';
import { PackageOpen, ArrowRight, Truck, Trash2, Box, AlertTriangle } from 'lucide-react';

interface ShippingProps {
  sales: Sale[];
  setSales: (sales: Sale[]) => void;
  onBookLbc: (customerName: string) => void;
}

interface CustomerCardProps {
  name: string;
  items: Sale[];
  onBookLbc: (name: string) => void;
  onDeleteCustomer: (name: string) => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ name, items, onBookLbc, onDeleteCustomer }) => {
    const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0);
    const hasReadyItems = items.some(i => i.status === SaleStatus.TO_SHIP);
    
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-lg text-slate-800">{name}</h4>
                    <p className="text-sm text-slate-500">{items.length} items • <span className="font-semibold text-emerald-600">₱{totalAmount.toLocaleString()}</span></p>
                </div>
                {hasReadyItems && <span className="bg-cyan-100 text-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Ready</span>}
            </div>
            
            <div className="flex-1 space-y-2 mb-4 overflow-y-auto max-h-40 custom-scrollbar pr-1">
                {items.map(item => (
                    <div key={item.id} className="text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center text-slate-700">
                        <span className="truncate flex-1 mr-2">{item.itemName}</span>
                        <span className="font-mono font-bold text-slate-500">₱{item.unitPrice}</span>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-50 mt-auto">
                 <button 
                  onClick={() => onDeleteCustomer(name)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                  title="Remove Package"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => onBookLbc(name)}
                  className="flex-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 p-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-2"
                  title="Ship with LBC"
                >
                    <Truck className="w-5 h-5" /> Ship via LBC
                </button>
            </div>
        </div>
    );
};

const Shipping: React.FC<ShippingProps> = ({ sales, setSales, onBookLbc }) => {
  
  // Filter logic: Show anything NOT shipped (On Hold + To Ship)
  const activeSales = useMemo(() => sales.filter(s => s.status === SaleStatus.ON_HOLD || s.status === SaleStatus.TO_SHIP), [sales]);

  // Grouping helper
  const groupSales = (list: Sale[]) => {
      const groups: Record<string, Sale[]> = {};
      list.forEach(s => {
          const name = s.customerName.trim();
          if (!groups[name]) groups[name] = [];
          groups[name].push(s);
      });
      return groups;
  };

  const activeGroups = groupSales(activeSales);
  const customerNames = Object.keys(activeGroups).sort();

  // Handle Delete: Removes all sales that are 'On Hold' or 'To Ship' for a specific customer name.
  // This effectively removes them from the "Packages on Hold" view (and the app generally, if that's the intent of "delete").
  const handleDeleteCustomer = (name: string) => {
      if (confirm(`Are you sure you want to remove all held items for ${name}? This will permanently delete these ${activeGroups[name]?.length || 0} sales records.`)) {
          const normalizedNameToDelete = name.trim().toLowerCase();
          
          const newSales = sales.filter(s => {
              // Keep the sale if it's NOT the customer we are deleting 
              // OR if the sale status is SHIPPED (we only want to delete the pending stuff)
              const isTargetCustomer = s.customerName.trim().toLowerCase() === normalizedNameToDelete;
              const isPendingStatus = s.status === SaleStatus.ON_HOLD || s.status === SaleStatus.TO_SHIP;
              
              // If it matches target customer AND is pending, filter it out (return false)
              if (isTargetCustomer && isPendingStatus) {
                  return false;
              }
              return true;
          });
          
          setSales(newSales);
      }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
       <div className="mb-6 flex-none">
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PackageOpen className="w-6 h-6 text-emerald-500" /> Packages on Hold
           </h2>
           <p className="text-slate-500 text-sm">Active build piles and shipping queues.</p>
       </div>

       <div className="flex-1 bg-slate-100/50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
           <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
               <div className="flex items-center gap-2">
                   <Box className="w-4 h-4 text-slate-500" />
                   <h3 className="font-bold text-slate-700">Active Customers</h3>
               </div>
               <span className="bg-emerald-100 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full">{customerNames.length} Active</span>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
               {customerNames.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-400">
                       <Box className="w-16 h-16 mb-4 opacity-20" />
                       <p>No active packages on hold.</p>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                       {customerNames.map(name => (
                           <CustomerCard 
                             key={name} 
                             name={name} 
                             items={activeGroups[name]} 
                             onBookLbc={onBookLbc} 
                             onDeleteCustomer={handleDeleteCustomer}
                           />
                       ))}
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default Shipping;