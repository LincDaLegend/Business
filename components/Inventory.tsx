import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ShippingBatch } from '../types.ts';
import { Plus, Trash2, Edit2, Package, RefreshCw, BoxSelect, Calculator, Container, X, Search, ChevronDown, Check } from 'lucide-react';

interface InventoryProps {
  items: InventoryItem[];
  setItems: (items: InventoryItem[]) => void;
  supplies: { totalQuantity: number; costPerUnit: number; unitsPerItem: number };
  setSupplies: (supplies: { totalQuantity: number; costPerUnit: number; unitsPerItem: number }) => void;
  shippingBatches: ShippingBatch[];
  setShippingBatches: (batches: ShippingBatch[]) => void;
}

const Inventory: React.FC<InventoryProps> = ({ items, setItems, supplies, setSupplies, shippingBatches, setShippingBatches }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Item Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [price, setPrice] = useState(0);
  const [batchCode, setBatchCode] = useState('');
  
  // Batch Search State
  const [isBatchSearchOpen, setIsBatchSearchOpen] = useState(false);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');

  // Supply Management Form State
  const [manageTotalQty, setManageTotalQty] = useState(0);
  const [manageCostPerUnit, setManageCostPerUnit] = useState(0);
  const [manageAllocation, setManageAllocation] = useState(1);
  
  // Supply Calculator State
  const [calcQty, setCalcQty] = useState<number | ''>('');
  const [calcTotalCost, setCalcTotalCost] = useState<number | ''>('');

  // Shipping Batch State
  const [newBatchCode, setNewBatchCode] = useState('');
  const [newBatchFee, setNewBatchFee] = useState<number | ''>('');

  // Helper for Inventory Colors (Light Mode Adapted)
  const getBatchColor = (code: string) => {
    const colors = [
        'bg-red-50 text-red-600 border border-red-200',
        'bg-orange-50 text-orange-600 border border-orange-200',
        'bg-amber-50 text-amber-600 border border-amber-200',
        'bg-yellow-50 text-yellow-600 border border-yellow-200',
        'bg-lime-50 text-lime-600 border border-lime-200',
        'bg-green-50 text-green-600 border border-green-200',
        'bg-emerald-50 text-emerald-600 border border-emerald-200',
        'bg-teal-50 text-teal-600 border border-teal-200',
        'bg-cyan-50 text-cyan-600 border border-cyan-200',
        'bg-sky-50 text-sky-600 border border-sky-200',
        'bg-blue-50 text-blue-600 border border-blue-200',
        'bg-indigo-50 text-indigo-600 border border-indigo-200',
        'bg-violet-50 text-violet-600 border border-violet-200',
        'bg-purple-50 text-purple-600 border border-purple-200',
        'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200',
        'bg-pink-50 text-pink-600 border border-pink-200',
        'bg-rose-50 text-rose-600 border border-rose-200',
    ];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const filteredBatches = useMemo(() => {
      return shippingBatches.filter(b => b.code.toLowerCase().includes(batchSearchQuery.toLowerCase()));
  }, [shippingBatches, batchSearchQuery]);

  // --- LOGIC: Auto-SKU Generation ---
  useEffect(() => {
    const cleanName = name.trim();
    if (cleanName) {
        const initials = cleanName.split(' ').filter(part => part.length > 0).map(part => part[0]).join('').toUpperCase();
        const shipmentPart = batchCode ? batchCode : '000';
        const sameTypeCount = items.filter(i => {
             if (editingItem && i.id === editingItem.id) return false;
             if ((i.batchCode || '') !== batchCode) return false;
             const iInitials = i.name.trim().split(' ').filter(p => p.length > 0).map(p => p[0]).join('').toUpperCase();
             return iInitials === initials;
        }).length;
        const nextCount = sameTypeCount + 1;
        setSku(`${shipmentPart}${initials}${nextCount}`);
    } else {
        setSku('');
    }
  }, [name, batchCode, items, editingItem]);

  const openModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setSku(item.sku);
      setCostPrice(item.costPrice || 0);
      setPrice(item.price);
      setBatchCode(item.batchCode || '');
    } else {
      setEditingItem(null);
      setName('');
      setSku(''); 
      setCostPrice(0);
      setPrice(0);
      setBatchCode('');
    }
    setBatchSearchQuery('');
    setIsModalOpen(true);
  };

  const openSupplyModal = () => {
    setManageTotalQty(supplies.totalQuantity);
    setManageCostPerUnit(supplies.costPerUnit);
    setManageAllocation(supplies.unitsPerItem);
    setCalcQty('');
    setCalcTotalCost('');
    setIsSupplyModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = 1;
    if (editingItem) {
      const updatedItems = items.map(i => i.id === editingItem.id ? { ...i, name, sku, quantity: qty, costPrice, price, batchCode } : i);
      setItems(updatedItems);
    } else {
      const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        name,
        sku,
        quantity: qty,
        costPrice,
        price,
        category: 'General', 
        batchCode
      };
      setItems([...items, newItem]);
    }
    setIsModalOpen(false);
  };

  const handleSupplySave = (e: React.FormEvent) => {
    e.preventDefault();
    setSupplies({
      totalQuantity: manageTotalQty,
      costPerUnit: manageCostPerUnit,
      unitsPerItem: manageAllocation
    });
    setIsSupplyModalOpen(false);
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof newBatchFee !== 'number') return;
    const existingIndex = shippingBatches.findIndex(b => b.code === newBatchCode);
    if (existingIndex >= 0) {
      const updated = [...shippingBatches];
      updated[existingIndex] = { ...updated[existingIndex], totalFee: newBatchFee };
      setShippingBatches(updated);
    } else {
      setShippingBatches([...shippingBatches, { id: crypto.randomUUID(), code: newBatchCode, totalFee: newBatchFee, date: new Date().toISOString() }]);
    }
    setNewBatchCode('');
    setNewBatchFee('');
  };
  
  const handleDeleteBatch = (id: string) => {
    setShippingBatches(shippingBatches.filter(b => b.id !== id));
  }

  const applyRestockCalculation = () => {
    if (typeof calcQty !== 'number' || typeof calcTotalCost !== 'number') return;
    const currentVal = manageTotalQty * manageCostPerUnit;
    const newVal = calcTotalCost;
    const totalQty = manageTotalQty + calcQty;
    const newAvgCost = totalQty > 0 ? (currentVal + newVal) / totalQty : 0;
    setManageTotalQty(totalQty);
    setManageCostPerUnit(newAvgCost);
    setCalcQty('');
    setCalcTotalCost('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const simulateEbaySync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const newItems: InventoryItem[] = [
        {
          id: crypto.randomUUID(),
          name: 'Vintage Camera Lens ' + Math.floor(Math.random() * 100),
          sku: 'EBAY-' + Math.floor(Math.random() * 10000),
          quantity: 1,
          costPrice: 50,
          price: 150,
          category: 'Photography',
          batchCode: ''
        },
        {
           id: crypto.randomUUID(),
           name: 'Rare Vinyl Record ' + Math.floor(Math.random() * 100),
           sku: 'EBAY-' + Math.floor(Math.random() * 10000),
           quantity: 1,
           costPrice: 20,
           price: 80,
           category: 'Music',
           batchCode: ''
        }
      ];
      setItems([...items, ...newItems]);
      setIsSyncing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-emerald-500" /> Inventory
            </h2>
            <p className="text-slate-500 text-sm">Manage stock, supplies, and shipping batches.</p>
         </div>
         <div className="flex gap-2">
            <button 
                onClick={simulateEbaySync} 
                disabled={isSyncing}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
                {isSyncing ? 'Syncing...' : 'Sync eBay'}
            </button>
            <button 
                onClick={() => openModal()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all"
            >
                <Plus className="w-5 h-5" /> Add Item
            </button>
         </div>
       </div>

       {/* Supplies & Batches Summary Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Supplies Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Packaging Supplies</h3>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{supplies.totalQuantity} <span className="text-sm font-medium text-slate-400">units</span></div>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                      <BoxSelect className="w-5 h-5" />
                  </div>
              </div>
              <div className="text-xs text-slate-400 mb-4">
                  Cost per unit: ₱{supplies.costPerUnit.toFixed(2)}
              </div>
              <button 
                  onClick={openSupplyModal}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-bold transition-colors"
              >
                  Manage Supplies
              </button>
          </div>

          {/* Batches Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Batches</h3>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{shippingBatches.length} <span className="text-sm font-medium text-slate-400">active</span></div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                      <Container className="w-5 h-5" />
                  </div>
              </div>
              <div className="flex -space-x-2 mb-4 overflow-hidden py-1">
                  {shippingBatches.slice(0, 5).map(b => (
                      <div key={b.id} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${getBatchColor(b.code)}`}>
                          {b.code.substring(0, 2)}
                      </div>
                  ))}
                  {shippingBatches.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                          +{shippingBatches.length - 5}
                      </div>
                  )}
              </div>
              <button 
                   onClick={() => setIsShippingModalOpen(true)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-bold transition-colors"
              >
                  Manage Batches
              </button>
          </div>
       </div>

       {/* Items List */}
       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cost / Price</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                No items in inventory. Add one to get started.
                            </td>
                        </tr>
                    ) : (
                        items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-5 text-base">
                                    <div className="font-bold text-slate-900">{item.name}</div>
                                </td>
                                <td className="px-6 py-5 text-sm font-mono text-slate-600">{item.sku}</td>
                                <td className="px-6 py-5">
                                    <span className={`px-2 py-1 rounded text-sm font-bold ${item.quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {item.quantity} units
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="text-base font-bold text-slate-900">₱{item.price.toLocaleString()}</div>
                                    <div className="text-xs text-slate-400">Cost: ₱{item.costPrice?.toLocaleString() ?? 0}</div>
                                </td>
                                <td className="px-6 py-5">
                                    {item.batchCode ? (
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getBatchColor(item.batchCode)}`}>
                                            {item.batchCode}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300 text-xs italic">None</span>
                                    )}
                                </td>
                                <td className="px-6 py-5 flex justify-center gap-2">
                                    <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
       </div>

       {/* --- MODALS --- */}

       {/* Item Modal */}
       {isModalOpen && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="e.g. Rare Jordans" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Price</label>
                                <input required type="number" min="0" step="0.01" value={costPrice} onChange={e => setCostPrice(parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selling Price</label>
                                <input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU (Auto-Generated)</label>
                            <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 outline-none font-mono text-sm" />
                        </div>
                        
                        {/* Searchable Batch Selector */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Batch / Shipment</label>
                            <div 
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none flex justify-between items-center cursor-pointer hover:border-emerald-500 transition-colors"
                                onClick={() => setIsBatchSearchOpen(!isBatchSearchOpen)}
                            >
                                <span className={batchCode ? "text-slate-900 font-medium" : "text-slate-400"}>
                                    {batchCode || "Select or search batch..."}
                                </span>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </div>

                            {isBatchSearchOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="Search batch codes..."
                                                value={batchSearchQuery}
                                                onChange={(e) => setBatchSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500"
                                                autoFocus
                                            />
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-1 p-1">
                                        <div 
                                            onClick={() => {
                                                setBatchCode('');
                                                setIsBatchSearchOpen(false);
                                            }}
                                            className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm text-slate-500 font-medium flex items-center gap-2"
                                        >
                                            <div className="w-4 h-4 rounded-full border border-slate-300"></div> No Batch
                                        </div>
                                        {filteredBatches.length > 0 ? (
                                            filteredBatches.map(b => (
                                                <div 
                                                    key={b.id}
                                                    onClick={() => {
                                                        setBatchCode(b.code);
                                                        setIsBatchSearchOpen(false);
                                                    }}
                                                    className="p-2 hover:bg-emerald-50 rounded-lg cursor-pointer flex justify-between items-center group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full border ${getBatchColor(b.code)}`}></div>
                                                        <span className="text-sm font-bold text-slate-700">{b.code}</span>
                                                    </div>
                                                    {batchCode === b.code && <Check className="w-4 h-4 text-emerald-500" />}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-xs text-slate-400">No matching batches found.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
                            <button type="submit" className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">Save Item</button>
                        </div>
                    </form>
               </div>
           </div>
       )}

       {/* Supplies Modal */}
       {isSupplyModalOpen && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Manage Supplies</h3>
                        <button onClick={() => setIsSupplyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Calculator Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                            <Calculator className="w-4 h-4 text-emerald-500" /> Restock Calculator
                        </h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input type="number" placeholder="Qty Bought" value={calcQty} onChange={e => setCalcQty(parseFloat(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                            <input type="number" placeholder="Total Cost (₱)" value={calcTotalCost} onChange={e => setCalcTotalCost(parseFloat(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <button onClick={applyRestockCalculation} className="w-full bg-white border border-slate-300 text-slate-600 font-bold text-sm py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                            Apply Restock (Updates Avg Cost)
                        </button>
                    </div>

                    <form onSubmit={handleSupplySave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Stock</label>
                                <input type="number" value={manageTotalQty} onChange={e => setManageTotalQty(parseFloat(e.target.value))} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Cost / Unit</label>
                                <input type="number" step="0.01" value={manageCostPerUnit} onChange={e => setManageCostPerUnit(parseFloat(e.target.value))} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 outline-none" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usage per Sale</label>
                             <div className="flex items-center gap-2">
                                <input type="number" value={manageAllocation} onChange={e => setManageAllocation(parseFloat(e.target.value))} className="w-20 bg-white border border-slate-300 rounded-xl px-4 py-2.5 outline-none" />
                                <span className="text-sm text-slate-500">units deducted per item sold</span>
                             </div>
                        </div>
                        <div className="pt-4">
                            <button type="submit" className="w-full px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">Update Supplies</button>
                        </div>
                    </form>
               </div>
           </div>
       )}

       {/* Shipping Batch Modal */}
       {isShippingModalOpen && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Shipping Batches</h3>
                        <button onClick={() => setIsShippingModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="space-y-6">
                        {/* List */}
                        <div className="max-h-60 overflow-y-auto space-y-2">
                             {shippingBatches.map(batch => {
                                 const itemCount = items.filter(i => i.batchCode === batch.code).length;
                                 const costPerItem = itemCount > 0 ? (batch.totalFee / itemCount) : 0;

                                 return (
                                     <div key={batch.id} className="p-3 border border-slate-200 rounded-xl flex justify-between items-center bg-slate-50">
                                         <div>
                                             <div className="font-bold text-slate-700 flex items-center gap-2">
                                                 {batch.code}
                                                 <span className={`w-3 h-3 rounded-full ${getBatchColor(batch.code).split(' ')[0]}`}></span>
                                             </div>
                                             <div className="text-xs text-slate-500">Fee: ₱{batch.totalFee} • {itemCount} Items • ₱{costPerItem.toFixed(2)}/item</div>
                                         </div>
                                         <button onClick={() => handleDeleteBatch(batch.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                     </div>
                                 )
                             })}
                             {shippingBatches.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No batches defined.</p>}
                        </div>

                        {/* Add New */}
                        <div className="pt-4 border-t border-slate-100">
                             <h4 className="text-sm font-bold text-slate-700 mb-3">Add / Update Batch</h4>
                             <form onSubmit={handleAddBatch} className="flex gap-3">
                                 <input required type="text" placeholder="Batch Code (e.g. DEC-2023)" value={newBatchCode} onChange={e => setNewBatchCode(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none" />
                                 <input required type="number" placeholder="Total Fee" value={newBatchFee} onChange={e => setNewBatchFee(parseFloat(e.target.value))} className="w-24 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none" />
                                 <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold"><Plus className="w-5 h-5"/></button>
                             </form>
                             <p className="text-[10px] text-slate-400 mt-2">
                                 Tip: Assign items to a batch to automatically calculate their "Shipping Cost" share (Peanut Butter Spread method).
                             </p>
                        </div>
                    </div>
               </div>
           </div>
       )}

    </div>
  );
};

export default Inventory;