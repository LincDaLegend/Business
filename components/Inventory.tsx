import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ShippingBatch } from '../types.ts';
import { Plus, Trash2, Edit2, Package, BoxSelect, Calculator, Container, X, Search, ChevronDown, Check, FileSpreadsheet, Clipboard, Globe, Lock, RefreshCw, Link as LinkIcon, DownloadCloud, Sparkles, AlertCircle } from 'lucide-react';
import { parseInventoryImport } from '../services/importService.ts';
import { loadState } from '../services/storageService.ts';
import { parseSmartImport } from '../services/geminiService.ts';

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
  
  // Smart Source State
  const [isSmartSourceOpen, setIsSmartSourceOpen] = useState(false);
  const [smartInput, setSmartInput] = useState('');
  const [isProcessingSmart, setIsProcessingSmart] = useState(false);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Item Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [price, setPrice] = useState(0);
  const [batchCode, setBatchCode] = useState('');
  const [category, setCategory] = useState('General');
  
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
    if (cleanName && (!editingItem || !sku)) {
        const initials = cleanName.split(' ').filter(part => part.length > 0).map(part => part[0]).join('').toUpperCase();
        const shipmentPart = batchCode ? batchCode : '000';
        
        const sameTypeCount = items.filter(i => {
             if (editingItem && i.id === editingItem.id) return false;
             if ((i.batchCode || '') !== batchCode) return false;
             const iInitials = i.name.trim().split(' ').filter(p => p.length > 0).map(p => p[0]).join('').toUpperCase();
             return iInitials === initials;
        }).length;
        
        const nextCount = sameTypeCount + 1;
        if (!editingItem) {
             setSku(`${shipmentPart}${initials}${nextCount}`);
        }
    }
  }, [name, batchCode]);

  const openModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setSku(item.sku);
      setCostPrice(item.costPrice || 0);
      setPrice(item.price);
      setBatchCode(item.batchCode || '');
      setCategory(item.category || 'General');
    } else {
      setEditingItem(null);
      setName('');
      setSku(''); 
      setCostPrice(0);
      setPrice(0);
      setBatchCode('');
      setCategory('General');
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
      const updatedItems = items.map(i => i.id === editingItem.id ? { ...i, name, sku, quantity: qty, costPrice, price, batchCode, category } : i);
      setItems(updatedItems);
    } else {
      const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        name,
        sku,
        quantity: qty,
        costPrice,
        price,
        category, 
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

  // --- SMART SOURCE LOGIC (One-Click) ---
  const processSmartImport = async (textToProcess: string) => {
     try {
        if (!textToProcess.trim()) {
            throw new Error("Empty text");
        }

        // 1. Detect if it's a list of Item IDs (Numbers)
        const ids = textToProcess.match(/\b\d{12}\b/g);
        const state = loadState();

        // PATH A: API BULK FETCH (If IDs found + Token exists)
        if (ids && ids.length > 0 && state.ebayUserToken && state.googleSheetsUrl) {
             const idList = [...new Set(ids)].slice(0, 20).join(',');
             
             try {
                const response = await fetch(state.googleSheetsUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        proxyUrl: `https://api.ebay.com/buy/browse/v1/item?item_ids=${idList}`,
                        method: 'get',
                        headers: {
                            'Authorization': `Bearer ${state.ebayUserToken}`,
                            'Content-Type': 'application/json'
                        }
                    })
                });

                const json = await response.json();
                
                if (json.items && Array.isArray(json.items)) {
                    const newItems: InventoryItem[] = json.items.map((item: any) => {
                        const priceVal = parseFloat(item.price?.value || '0');
                        return {
                            id: crypto.randomUUID(),
                            name: item.title,
                            sku: `EB-${item.itemId.split('|')[0] || item.itemId}`, 
                            quantity: 1,
                            costPrice: priceVal,
                            price: priceVal * 1.3, // Auto markup 30%
                            category: item.categoryPath ? item.categoryPath.split('|').pop() : 'eBay Import',
                            batchCode: ''
                        };
                    });
                    
                    setItems([...items, ...newItems]);
                    alert(`✅ Imported ${newItems.length} items from eBay!`);
                    setIsSmartSourceOpen(false);
                    setSmartInput('');
                    return; 
                }
             } catch (e) {
                 console.error("API Fallback failed, trying AI...", e);
             }
        }

        // PATH B: GEMINI AI EXTRACTION (Fallback)
        const aiItems = await parseSmartImport(textToProcess, 'inventory');
        
        if (aiItems && aiItems.length > 0) {
             const newItems: InventoryItem[] = aiItems.map((item: any) => ({
                id: crypto.randomUUID(),
                name: item.name || "Unknown Item",
                sku: item.sku || `IMP-${Date.now()}`,
                quantity: item.quantity || 1,
                costPrice: item.costPrice || 0,
                price: item.price || 0,
                category: item.category || "Imported",
                batchCode: ''
             }));

             setItems([...items, ...newItems]);
             alert(`✨ Processed ${newItems.length} items from text!`);
             setIsSmartSourceOpen(false);
             setSmartInput('');
        } else {
            alert("Could not detect items. Ensure you copied your 'Purchase History' or 'Order Details'.");
        }
    } catch (e) {
        console.error(e);
        alert("Processing failed. Please try manually.");
    }
  };

  const handleSmartSourceClick = async () => {
      setIsProcessingSmart(true);
      try {
          // Attempt to read clipboard directly first (One-Click Flow)
          let text = '';
          try {
              text = await navigator.clipboard.readText();
          } catch (e) {
              console.warn("Clipboard access denied or not supported");
          }

          if (text && text.trim().length > 5) {
               // If clipboard has content, process it immediately
               await processSmartImport(text);
          } else {
               // If clipboard empty, open modal for manual paste
               setIsSmartSourceOpen(true);
          }
      } catch (e) {
          setIsSmartSourceOpen(true);
      } finally {
          setIsProcessingSmart(false);
      }
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
                onClick={handleSmartSourceClick}
                disabled={isProcessingSmart}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70"
                title="Copies from clipboard automatically"
            >
                <Sparkles className={`w-4 h-4 text-blue-500 ${isProcessingSmart ? 'animate-spin' : ''}`} /> 
                <span className="hidden sm:inline">{isProcessingSmart ? 'Processing...' : 'Smart Source'}</span>
            </button>
            <button 
                onClick={() => openModal()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all"
            >
                <Plus className="w-5 h-5" /> Add Item
            </button>
         </div>
       </div>

       {/* Smart Source Modal (Fallback) */}
       {isSmartSourceOpen && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            <h3 className="text-xl font-bold text-slate-900">Smart Source Inventory</h3>
                        </div>
                        <button onClick={() => setIsSmartSourceOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800 flex gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <div>
                                <p className="font-bold">Clipboard was empty or blocked.</p>
                                <p>Please manually paste your eBay Purchase History or Item IDs below.</p>
                            </div>
                        </div>
                        
                        <textarea 
                            value={smartInput}
                            onChange={(e) => setSmartInput(e.target.value)}
                            placeholder="Paste text here..."
                            className="w-full h-32 bg-slate-50 border border-slate-300 rounded-xl p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                         <button onClick={() => setIsSmartSourceOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
                         <button 
                            onClick={() => { setIsProcessingSmart(true); processSmartImport(smartInput).finally(() => setIsProcessingSmart(false)); }}
                            disabled={isProcessingSmart || !smartInput.trim()}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            <Sparkles className={`w-4 h-4 ${isProcessingSmart ? 'animate-spin' : ''}`} />
                            {isProcessingSmart ? 'Processing...' : 'Process Text'}
                        </button>
                    </div>
               </div>
           </div>
       )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Stock</span>
              <span className="text-2xl font-black text-slate-900">{items.reduce((acc, i) => acc + i.quantity, 0)} Items</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Value</span>
              <span className="text-2xl font-black text-emerald-600">₱{items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString()}</span>
          </div>
          <div 
            onClick={() => setIsSupplyModalOpen(true)}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center hover:border-emerald-400 cursor-pointer transition-colors"
          >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Supplies Left</span>
              <span className={`text-2xl font-black ${supplies.totalQuantity < 20 ? 'text-red-500' : 'text-slate-900'}`}>
                  {supplies.totalQuantity} Units
              </span>
          </div>
          <div 
             onClick={() => setIsShippingModalOpen(true)}
             className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center hover:border-blue-400 cursor-pointer transition-colors"
          >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Batches</span>
              <span className="text-2xl font-black text-blue-600">{shippingBatches.length} Batches</span>
          </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Batch</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cost</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Price</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">Inventory is empty. Add items or use Smart Source!</td></tr>
                    ) : (
                        items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                                    <div className="text-xs text-slate-400">{item.category}</div>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-slate-500">{item.sku}</td>
                                <td className="px-6 py-4 text-center">
                                    {item.batchCode && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getBatchColor(item.batchCode)}`}>
                                            {item.batchCode}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`font-bold text-sm ${item.quantity === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                        {item.quantity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-slate-500 font-medium">₱{item.costPrice ? item.costPrice.toFixed(2) : '0.00'}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">₱{item.price.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center flex justify-center gap-2">
                                    <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MODALS (Supply, Shipping, Manual Add) --- */}
      
      {/* Supply Management Modal */}
      {isSupplyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><BoxSelect className="w-5 h-5 text-emerald-500" /> Manage Supplies</h3>
                    <button onClick={() => setIsSupplyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1"><Calculator className="w-3 h-3" /> Restock Calculator</div>
                    <div className="flex gap-3 mb-3">
                        <input 
                            type="number" 
                            placeholder="Qty Added" 
                            value={calcQty}
                            onChange={e => setCalcQty(parseFloat(e.target.value))}
                            className="w-1/2 p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                        />
                        <input 
                            type="number" 
                            placeholder="Total Cost" 
                            value={calcTotalCost}
                            onChange={e => setCalcTotalCost(parseFloat(e.target.value))}
                            className="w-1/2 p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                        />
                    </div>
                    <button 
                        onClick={applyRestockCalculation}
                        disabled={!calcQty || !calcTotalCost}
                        className="w-full bg-emerald-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-emerald-600 disabled:opacity-50"
                    >
                        Add Stock & Average Cost
                    </button>
                </div>

                <form onSubmit={handleSupplySave} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Quantity</label>
                        <input type="number" value={manageTotalQty} onChange={e => setManageTotalQty(parseFloat(e.target.value))} className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-slate-800" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Cost Per Unit (₱)</label>
                        <input type="number" step="0.01" value={manageCostPerUnit} onChange={e => setManageCostPerUnit(parseFloat(e.target.value))} className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-slate-800" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Units Used Per Item</label>
                        <input type="number" value={manageAllocation} onChange={e => setManageAllocation(parseFloat(e.target.value))} className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-slate-800" />
                     </div>
                     <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-sm transition-all mt-2">Save Changes</button>
                </form>
           </div>
        </div>
      )}

      {/* Shipping Batches Modal */}
      {isShippingModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Container className="w-5 h-5 text-blue-500" /> Shipping Batches</h3>
                        <button onClick={() => setIsShippingModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="flex gap-2 mb-6">
                      <input 
                        type="text" 
                        placeholder="Batch Code (e.g. JUNE-A)" 
                        value={newBatchCode}
                        onChange={e => setNewBatchCode(e.target.value.toUpperCase())}
                        className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 uppercase font-bold"
                      />
                      <input 
                        type="number" 
                        placeholder="Fee ₱" 
                        value={newBatchFee}
                        onChange={e => setNewBatchFee(parseFloat(e.target.value))}
                        className="w-24 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 font-bold"
                      />
                      <button 
                        onClick={handleAddBatch}
                        disabled={!newBatchCode || !newBatchFee}
                        className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50"
                      >
                          <Plus className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                      {shippingBatches.length === 0 ? (
                          <div className="text-center text-slate-400 py-8 text-sm">No active shipping batches.</div>
                      ) : (
                          shippingBatches.map(batch => (
                              <div key={batch.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                                  <div>
                                      <div className={`text-xs font-bold px-2 py-0.5 rounded w-fit mb-1 ${getBatchColor(batch.code)}`}>{batch.code}</div>
                                      <div className="text-xs text-slate-400">Created {new Date(batch.date).toLocaleDateString()}</div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <div className="font-bold text-slate-700">₱{batch.totalFee}</div>
                                      <button onClick={() => handleDeleteBatch(batch.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
             </div>

             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Item Name</label>
                    <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white transition-colors" placeholder="e.g. Vintage Camera Lens" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">SKU (Auto)</label>
                        <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-mono text-sm" placeholder="Leave blank to auto-generate" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Category</label>
                        <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cost Price (₱)</label>
                        <input type="number" min="0" step="0.01" value={costPrice} onChange={e => setCostPrice(parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Selling Price (₱)</label>
                        <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                     </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Shipping Batch (Optional)</label>
                    <div className="relative">
                        <div 
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 cursor-pointer flex justify-between items-center"
                            onClick={() => setIsBatchSearchOpen(!isBatchSearchOpen)}
                        >
                            <span className={batchCode ? 'text-slate-900 font-bold' : 'text-slate-400'}>{batchCode || 'Select Batch...'}</span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                        {isBatchSearchOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                                <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        placeholder="Search batch..."
                                        value={batchSearchQuery}
                                        onChange={e => setBatchSearchQuery(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div 
                                    onClick={() => { setBatchCode(''); setIsBatchSearchOpen(false); }}
                                    className="p-3 hover:bg-slate-50 cursor-pointer text-sm text-slate-400 italic"
                                >
                                    No Batch
                                </div>
                                {filteredBatches.map(b => (
                                    <div 
                                        key={b.id} 
                                        onClick={() => { setBatchCode(b.code); setIsBatchSearchOpen(false); }}
                                        className="p-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 flex justify-between"
                                    >
                                        <span>{b.code}</span>
                                        <span className="text-slate-400 font-normal text-xs">{new Date(b.date).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all mt-4">
                    {editingItem ? 'Save Changes' : 'Add to Inventory'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;