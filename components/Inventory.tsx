import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, ShippingBatch } from '../types.ts';
import { Plus, Trash2, Edit2, Package, BoxSelect, Calculator, Container, X, Search, ChevronDown, Check, FileSpreadsheet, Clipboard, Globe, Lock, RefreshCw, Link as LinkIcon, DownloadCloud, Sparkles, AlertCircle, UploadCloud, FileText, Image as ImageIcon, DollarSign, RefreshCcw, Equal, ArrowRight, Settings2 } from 'lucide-react';
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
  const [smartFiles, setSmartFiles] = useState<{name: string, data: string, type: string}[]>([]);
  const [isProcessingSmart, setIsProcessingSmart] = useState(false);
  const [importCostUSD, setImportCostUSD] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>('58.00');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smart Preview State (For Proportion Editing)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewTotalCostUSD, setPreviewTotalCostUSD] = useState<number | ''>(0); // Now strictly USD

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Item Form State - Using number | '' to allow clearing inputs
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(''); // Default empty
  const [costPrice, setCostPrice] = useState<number | ''>(''); // Default empty
  const [price, setPrice] = useState<number | ''>(''); // Default empty
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

  // Helper to sum up costs (e.g. "100 + 50")
  const calculateTotalUSDCost = () => {
    try {
        if (!importCostUSD) return 0;
        // Split by +, clean whitespace, parse float, sum
        return importCostUSD.split('+').reduce((acc, curr) => {
            const val = parseFloat(curr.trim());
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
    } catch {
        return 0;
    }
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
      setQuantity(item.quantity);
      setCostPrice(item.costPrice || '');
      setPrice(item.price);
      setBatchCode(item.batchCode || '');
      setCategory(item.category || 'General');
    } else {
      setEditingItem(null);
      setName('');
      setSku(''); 
      setQuantity('');
      setCostPrice('');
      setPrice('');
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
    const finalQty = quantity === '' ? 0 : quantity;
    const finalCost = costPrice === '' ? 0 : costPrice;
    const finalPrice = price === '' ? 0 : price;

    if (editingItem) {
      const updatedItems = items.map(i => i.id === editingItem.id ? { ...i, name, sku, quantity: finalQty, costPrice: finalCost, price: finalPrice, batchCode, category } : i);
      setItems(updatedItems);
    } else {
      const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        name,
        sku,
        quantity: finalQty,
        costPrice: finalCost,
        price: finalPrice,
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

  // --- SMART SOURCE LOGIC (Multiple Files / Paste) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach((file: File) => {
          const reader = new FileReader();
          reader.onload = (event) => {
              const result = event.target?.result as string;
              setSmartFiles(prev => [...prev, {
                  name: file.name,
                  type: file.type,
                  data: result
              }]);
          };
          reader.readAsDataURL(file);
      });
      // Reset input so same file can be selected again if needed
      e.target.value = '';
  };

  const removeFile = (index: number) => {
      setSmartFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processSmartImport = async () => {
     if (!smartInput.trim() && smartFiles.length === 0) return;

     setIsProcessingSmart(true);
     try {
        const textToProcess = smartInput;
        
        // 1. Detect if it's a list of Item IDs (Numbers) - Only applies to text
        const ids = textToProcess.match(/\b\d{12}\b/g);
        const state = loadState();

        // PATH A: API BULK FETCH (If IDs found + Token exists + No File)
        if (smartFiles.length === 0 && ids && ids.length > 0 && state.ebayUserToken && state.googleSheetsUrl) {
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
                    setSmartFiles([]);
                    setImportCostUSD('');
                    return; 
                }
             } catch (e) {
                 console.error("API Fallback failed, trying AI...", e);
             }
        }

        // PATH B: GEMINI AI EXTRACTION (Fallback / File)
        const mappedFiles = smartFiles.map(f => ({
            data: f.data,
            mimeType: f.type
        }));

        // Calculate Cost Initial (USD)
        const usdTotal = calculateTotalUSDCost();

        const aiItems = await parseSmartImport({ 
            text: smartInput, 
            files: mappedFiles,
            type: 'inventory',
            totalCost: usdTotal
        });
        
        if (aiItems && aiItems.length > 0) {
             // Prepare for Preview Modal
             const mappedPreviewItems = aiItems.map((item: any) => ({
                id: crypto.randomUUID(),
                name: item.name || "Unknown Item",
                sku: item.sku || `IMP-${Date.now()}-${Math.floor(Math.random()*100)}`,
                quantity: item.quantity || 1,
                // Note: We ignore AI valuation for weighting as per request, just init structure
                manualCostUSD: undefined,
                isManualCost: false,
                costUSD: 0, // Will be calculated
                costPrice: 0, // Will be calculated
                price: 0, // Sell Price
                category: item.category || "Imported",
                batchCode: ''
             }));
             
             setPreviewItems(mappedPreviewItems);
             setPreviewTotalCostUSD(usdTotal);
             setIsSmartSourceOpen(false);
             setIsPreviewOpen(true);
             
             // Cleanup inputs
             setSmartInput('');
             setSmartFiles([]);
        } else {
            alert("Could not detect items. Ensure you copied your 'Purchase History' or uploaded a clear invoice/screenshot.");
        }
    } catch (e: any) {
        console.error(e);
        // Show the actual error message (e.g., API Key missing)
        alert(`Processing failed: ${e.message || "Please check your API Key and try again."}`);
    } finally {
        setIsProcessingSmart(false);
    }
  };

  // --- PREVIEW MODAL LOGIC (Peanut Butter Spread) ---
  const supplyCostPerItem = supplies.costPerUnit * supplies.unitsPerItem;

  // Effect to recalculate costs whenever Total Cost or Rate or Items (manual changes) change
  // Note: We avoid circular dependency by not putting 'previewItems' in the dependency if we are just updating derived values
  // But here we need to trigger recalc on mount and when inputs change.
  useEffect(() => {
     if (isPreviewOpen) {
         // We do this via the specific update functions to avoid infinite loop
         // But initially we need one pass.
         recalculateAllCosts(previewTotalCostUSD, previewItems, exchangeRate);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewOpen]); 

  // Core Logic: Peanut Butter Spread
  const recalculateAllCosts = (totalUSD: number | '', items: any[], rateStr: string) => {
      const rate = parseFloat(rateStr) || 0;
      const tUSD = totalUSD === '' ? 0 : totalUSD;
      
      // 1. Calculate allocated manual costs (Unit Cost * Quantity)
      let manualUsedUSD = 0;
      let autoUnitCount = 0;
      
      items.forEach(i => {
          if (i.isManualCost) {
              manualUsedUSD += (i.manualCostUSD || 0) * (i.quantity || 1);
          } else {
              autoUnitCount += (i.quantity || 1);
          }
      });
      
      const remainderUSD = Math.max(0, tUSD - manualUsedUSD);
      const autoUnitCostUSD = autoUnitCount > 0 ? remainderUSD / autoUnitCount : 0;
      
      const updatedList = items.map(i => {
          const unitCostUSD = i.isManualCost ? (i.manualCostUSD || 0) : autoUnitCostUSD;
          // Calculate Net Cost PHP = (UnitUSD * Rate) + SupplyCost
          const netCostPHP = (unitCostUSD * rate) + supplyCostPerItem;
          
          return {
              ...i,
              costUSD: unitCostUSD, // Store effective USD cost
              costPrice: parseFloat(netCostPHP.toFixed(2)),
              // Ensure these persist
              manualCostUSD: i.manualCostUSD, 
              isManualCost: i.isManualCost
          };
      });
      
      setPreviewItems(updatedList);
  };

  const handleTotalCostChange = (val: string) => {
      const num = parseFloat(val);
      const newVal = isNaN(num) ? '' : num;
      setPreviewTotalCostUSD(newVal);
      recalculateAllCosts(newVal, previewItems, exchangeRate);
  };
  
  const handleRateChange = (val: string) => {
      setExchangeRate(val);
      recalculateAllCosts(previewTotalCostUSD, previewItems, val);
  };

  const handleManualCostChange = (id: string, val: string) => {
      // Logic: If user clears input, revert to auto. If user types 0, it is manual 0.
      const isManual = val !== ''; 
      const numVal = isManual ? parseFloat(val) : 0;
      
      const newItems = previewItems.map(item => {
          if (item.id === id) {
              return {
                  ...item,
                  manualCostUSD: isManual ? numVal : undefined,
                  isManualCost: isManual
              };
          }
          return item;
      });
      
      // We pass newItems to recalc
      recalculateAllCosts(previewTotalCostUSD, newItems, exchangeRate);
  };

  const addManualPreviewItem = () => {
    const newItem = {
        id: crypto.randomUUID(),
        name: "New Item",
        sku: `MAN-${Date.now()}`,
        quantity: 1,
        manualCostUSD: undefined,
        isManualCost: false,
        costUSD: 0,
        costPrice: 0,
        price: 0,
        category: 'Imported',
        batchCode: ''
    };
    const updated = [...previewItems, newItem];
    setPreviewItems(updated);
    recalculateAllCosts(previewTotalCostUSD, updated, exchangeRate);
  };

  const removePreviewItem = (index: number) => {
      const updated = [...previewItems];
      updated.splice(index, 1);
      setPreviewItems(updated);
      recalculateAllCosts(previewTotalCostUSD, updated, exchangeRate);
  };

  const confirmImport = () => {
      // Ensure we save the calculated values
      const finalItems = previewItems.map(i => ({
          ...i,
          // Strip temporary fields before saving if desired, strictly InventoryItem type usually doesn't have these
          // but JS is flexible. We'll map to clean object to be safe.
          id: i.id,
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          costPrice: i.costPrice,
          price: i.price, // Will be 0 unless user edited it or we have logic
          category: i.category,
          batchCode: i.batchCode
      }));

      setItems([...items, ...finalItems]);
      setIsPreviewOpen(false);
      setPreviewItems([]);
      setPreviewTotalCostUSD(0);
      setImportCostUSD('');
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
                onClick={() => setIsSmartSourceOpen(true)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-brand-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
                <Sparkles className="w-4 h-4 text-brand-500" /> 
                <span className="hidden sm:inline">Smart Source</span>
            </button>
            <button 
                onClick={() => openModal()}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-200 transition-all"
            >
                <Plus className="w-5 h-5" /> Add Item
            </button>
         </div>
       </div>

       {/* --- SMART IMPORT PREVIEW MODAL --- */}
       {isPreviewOpen && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl p-6 border border-slate-200 flex flex-col max-h-[90vh]">
                   <div className="flex justify-between items-center mb-6">
                       <div>
                           <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                               <Sparkles className="w-5 h-5 text-brand-500" /> Import Breakdown
                           </h3>
                           <p className="text-sm text-slate-500">Verify items and distribute costs (Peanut Butter Spread).</p>
                       </div>
                       <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                   </div>

                   {/* Header Stats / Inputs */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                       
                       {/* 1. Total Batch Cost USD */}
                       <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Batch Cost (USD)</label>
                           <div className="relative">
                               <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                               <input 
                                    type="number" 
                                    value={previewTotalCostUSD}
                                    onChange={(e) => handleTotalCostChange(e.target.value)}
                                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-lg font-bold text-blue-600 focus:border-blue-500 outline-none"
                                />
                           </div>
                       </div>

                       {/* 2. Exchange Rate */}
                       <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Exchange Rate (PHP)</label>
                           <div className="relative">
                               <RefreshCcw className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                               <input 
                                    type="number" 
                                    value={exchangeRate}
                                    onChange={(e) => handleRateChange(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-lg font-bold text-slate-700 focus:border-blue-500 outline-none"
                                />
                           </div>
                       </div>
                       
                       {/* 3. Supplies Cost */}
                       <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supplies (Added to Net)</label>
                           <div className="text-xl font-bold text-slate-700 py-2 flex items-center gap-2">
                                ₱{supplyCostPerItem.toFixed(2)} <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 uppercase">Per Item</span>
                           </div>
                       </div>
                   </div>

                   {/* Editable Table */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl mb-4 bg-white relative">
                       <table className="w-full text-left">
                           <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                               <tr>
                                   <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-1/3">Item Name</th>
                                   <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center w-16">Qty</th>
                                   <th className="px-4 py-3 text-xs font-bold text-brand-600 uppercase w-32">Item Cost ($)</th>
                                   <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center w-8"><ArrowRight className="w-4 h-4 mx-auto"/></th>
                                   <th className="px-4 py-3 text-xs font-bold text-brand-600 uppercase w-36 text-right">Net Unit Cost (₱)</th>
                                   <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center w-10"></th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {previewItems.map((item, idx) => (
                                   <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                       <td className="px-4 py-2">
                                           <input 
                                               type="text" 
                                               value={item.name}
                                               onChange={(e) => {
                                                   const copy = [...previewItems];
                                                   copy[idx].name = e.target.value;
                                                   setPreviewItems(copy);
                                               }}
                                               className="w-full bg-transparent outline-none font-medium text-slate-700 text-sm border-b border-transparent focus:border-brand-300"
                                           />
                                       </td>
                                       <td className="px-4 py-2 text-center">
                                           <input 
                                               type="number" 
                                               value={item.quantity}
                                               onChange={(e) => {
                                                   const copy = [...previewItems];
                                                   copy[idx].quantity = parseInt(e.target.value) || 1;
                                                   recalculateAllCosts(previewTotalCostUSD, copy, exchangeRate);
                                               }}
                                               className="w-12 text-center bg-transparent outline-none font-bold text-slate-700 text-sm border-b border-slate-200 focus:border-blue-300"
                                           />
                                       </td>
                                       
                                       {/* Manual Cost Input */}
                                       <td className="px-4 py-2">
                                           <div className="relative">
                                               <span className="absolute left-0 top-1.5 text-xs text-blue-400">$</span>
                                               <input 
                                                   type="number" 
                                                   // If manual, show value. If auto, show empty string (placeholder will show value)
                                                   value={item.isManualCost ? item.manualCostUSD : ''}
                                                   placeholder={item.costUSD.toFixed(2)}
                                                   onChange={(e) => handleManualCostChange(item.id, e.target.value)}
                                                   className={`w-full pl-3 bg-transparent border-b-2 rounded px-2 py-1 outline-none font-bold text-sm focus:border-blue-500 ${item.isManualCost ? 'border-blue-500 text-blue-700' : 'border-slate-200 text-slate-400'}`}
                                               />
                                           </div>
                                       </td>

                                       <td className="px-4 py-2 text-center text-slate-300"><Equal className="w-3 h-3 mx-auto"/></td>
                                       
                                       {/* Final Net Cost PHP */}
                                       <td className="px-4 py-2 text-right">
                                           <div className="font-bold text-emerald-600 text-sm">₱{item.costPrice.toFixed(2)}</div>
                                            <div className="text-[9px] text-slate-400">Rate: {exchangeRate} + Sup</div>
                                       </td>

                                       <td className="px-4 py-2 text-center">
                                           <button 
                                                onClick={() => removePreviewItem(idx)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                title="Remove Item"
                                           >
                                               <X className="w-4 h-4" />
                                           </button>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                       
                       {/* Add Item Button */}
                       <div className="p-2 border-t border-slate-100 bg-slate-50 sticky bottom-0">
                           <button 
                                onClick={addManualPreviewItem}
                                className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm font-bold hover:bg-white hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                           >
                               <Plus className="w-4 h-4" /> Add Item Row
                           </button>
                       </div>
                   </div>

                   <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                       <button onClick={() => setIsPreviewOpen(false)} className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">Discard</button>
                       <button 
                           onClick={confirmImport}
                           className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                       >
                           <Check className="w-5 h-5" /> Confirm Import
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Smart Source Modal (Robust: Paste + Upload) */}
       {isSmartSourceOpen && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200 flex flex-col max-h-[85vh]">
                    <div className="flex justify-between items-center mb-6 flex-none">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            <h3 className="text-xl font-bold text-slate-900">Smart Source Inventory</h3>
                        </div>
                        <button onClick={() => setIsSmartSourceOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-4 mb-6 flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                             <p className="font-bold">Import from anywhere:</p>
                             <ul className="list-disc list-inside mt-1 space-y-1">
                                 <li><strong>Paste Text:</strong> Copy item IDs, eBay purchase history, or invoice text.</li>
                                 <li><strong>Upload Files:</strong> Upload multiple screenshots (e.g., overlapping pages) or PDFs.</li>
                             </ul>
                        </div>

                        {/* Cost Override Section */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Lot Cost(s) (USD)</label>
                                <div className="relative">
                                    <DollarSign className="w-3 h-3 absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="e.g. 100 or 100+50"
                                        value={importCostUSD}
                                        onChange={e => setImportCostUSD(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-brand-500"
                                    />
                                    {importCostUSD.includes('+') && (
                                        <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                                            <Equal className="w-3 h-3" /> {calculateTotalUSDCost()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Exchange Rate (PHP)</label>
                                <div className="relative">
                                    <RefreshCcw className="w-3 h-3 absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        type="number"
                                        value={exchangeRate}
                                        onChange={e => setExchangeRate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* 1. File Upload Area */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-brand-400 transition-colors cursor-pointer"
                        >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*,application/pdf"
                                    multiple
                                    onChange={handleFileUpload}
                                />
                                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm font-bold text-slate-600">Click to upload PDFs or Images</p>
                                <p className="text-xs text-slate-400 mt-1">Supports multiple files</p>
                        </div>
                        
                        {/* File List */}
                        {smartFiles.length > 0 && (
                            <div className="space-y-2">
                                {smartFiles.map((file, idx) => (
                                    <div key={idx} className="bg-slate-100 rounded-xl p-3 flex justify-between items-center border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            {file.type.includes('image') ? <ImageIcon className="w-5 h-5 text-purple-500"/> : <FileText className="w-5 h-5 text-red-500"/>}
                                            <div className="text-xs">
                                                <p className="font-bold text-slate-700 truncate max-w-[200px]">{file.name}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-wider">- OR -</div>

                        {/* 2. Text Area */}
                        <textarea 
                            value={smartInput}
                            onChange={(e) => setSmartInput(e.target.value)}
                            placeholder="Paste text or item IDs here..."
                            className="w-full h-24 bg-slate-50 border border-slate-300 rounded-xl p-4 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 flex-none pt-2 border-t border-slate-100">
                         <button onClick={() => setIsSmartSourceOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
                         <button 
                            onClick={processSmartImport}
                            disabled={isProcessingSmart || (!smartInput.trim() && smartFiles.length === 0)}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            <Sparkles className={`w-4 h-4 ${isProcessingSmart ? 'animate-spin' : ''}`} />
                            {isProcessingSmart ? 'Analyzing...' : 'Process'}
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
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center hover:border-brand-400 cursor-pointer transition-colors"
          >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Supplies Left</span>
              <span className={`text-2xl font-black ${supplies.totalQuantity < 20 ? 'text-red-500' : 'text-slate-900'}`}>
                  {supplies.totalQuantity} Units
              </span>
          </div>
          <div 
             onClick={() => setIsShippingModalOpen(true)}
             className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center hover:border-brand-400 cursor-pointer transition-colors"
          >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Batches</span>
              <span className="text-2xl font-black text-brand-600">{shippingBatches.length} Batches</span>
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
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Inventory is empty. Add items or use Smart Source!</td></tr>
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
                                <td className="px-6 py-4 text-center flex justify-center gap-2">
                                    <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
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
                            onChange={e => setCalcQty(parseFloat(e.target.value) || '')}
                            className="w-1/2 p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-brand-500"
                        />
                        <input 
                            type="number" 
                            placeholder="Total Cost" 
                            value={calcTotalCost}
                            onChange={e => setCalcTotalCost(parseFloat(e.target.value) || '')}
                            className="w-1/2 p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-brand-500"
                        />
                    </div>
                    <button 
                        onClick={applyRestockCalculation}
                        disabled={!calcQty || !calcTotalCost}
                        className="w-full bg-brand-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
                    >
                        Add Stock & Average Cost
                    </button>
                </div>

                <form onSubmit={handleSupplySave} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Quantity</label>
                        <input type="number" value={manageTotalQty} onChange={e => setManageTotalQty(parseFloat(e.target.value))} className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-brand-500 font-bold text-slate-800" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Cost Per Unit (₱)</label>
                        <input type="number" step="0.01" value={manageCostPerUnit} onChange={e => setManageCostPerUnit(parseFloat(e.target.value))} className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-brand-500 font-bold text-slate-800" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Units Used Per Item</label>
                        <input type="number" value={manageAllocation} onChange={e => setManageAllocation(parseFloat(e.target.value))} className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-brand-500 font-bold text-slate-800" />
                     </div>
                     <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-sm transition-all mt-2">Save Changes</button>
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
                        className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 uppercase font-bold"
                      />
                      <input 
                        type="number" 
                        placeholder="Fee ₱" 
                        value={newBatchFee}
                        onChange={e => setNewBatchFee(parseFloat(e.target.value) || '')}
                        className="w-24 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 font-bold"
                      />
                      <button 
                        onClick={handleAddBatch}
                        disabled={!newBatchCode || newBatchFee === ''}
                        className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50"
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

                <div className="grid grid-cols-3 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Stock Qty</label>
                        <input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-bold" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cost (₱)</label>
                        <input type="number" min="0" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Price (₱)</label>
                        <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
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

                <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-200 transition-all mt-4">
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