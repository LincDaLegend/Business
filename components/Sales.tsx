import React, { useState, useMemo } from 'react';
import { Sale, InventoryItem, SaleStatus, PaymentStatus, SaleType, ShippingBatch } from '../types.ts';
import { 
  ShoppingCart, Plus, Search, 
  Filter, CheckCircle2, XCircle, ChevronDown,
  ArrowRightLeft, Box, DollarSign, Calendar, Trash2
} from 'lucide-react';

interface SalesProps {
  sales: Sale[];
  inventory: InventoryItem[];
  setSales: (sales: Sale[]) => void;
  updateInventoryStock: (itemId: string, qtyDelta: number) => void;
  deleteSale: (saleId: string) => void;
  supplies: { totalQuantity: number; costPerUnit: number; unitsPerItem: number };
  setSupplies: (supplies: { totalQuantity: number; costPerUnit: number; unitsPerItem: number }) => void;
  shippingBatches: ShippingBatch[];
}

const Sales: React.FC<SalesProps> = ({ sales, inventory, setSales, updateInventoryStock, deleteSale }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filters
  const [filterQuery, setFilterQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [soldPrice, setSoldPrice] = useState<number | ''>('');
  const [saleType, setSaleType] = useState<SaleType>('Sale');
  const [initialPayment, setInitialPayment] = useState<PaymentStatus>(PaymentStatus.UNPAID);
  const [initialStatus, setInitialStatus] = useState<SaleStatus>(SaleStatus.ON_HOLD);
  const [searchItemQuery, setSearchItemQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // --- FILTER LOGIC ---
  const displayedSales = useMemo(() => {
    return sales.filter(s => {
      const matchesSearch = s.itemName.toLowerCase().includes(filterQuery.toLowerCase()) || 
                            s.customerName.toLowerCase().includes(filterQuery.toLowerCase());
      const matchesPayment = filterPayment === 'All' || s.paymentStatus === filterPayment;
      return matchesSearch && matchesPayment;
    });
  }, [sales, filterQuery, filterPayment]);

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchItemQuery.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchItemQuery.toLowerCase())
  );

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchItemQuery(item.name);
    setSoldPrice(item.price);
    setIsSearchOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || typeof soldPrice !== 'number') return;

    const newSale: Sale = {
      id: crypto.randomUUID(),
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      customerName,
      quantity: 1, 
      unitPrice: soldPrice,
      costPrice: selectedItem.costPrice || 0,
      totalAmount: soldPrice,
      status: initialStatus,
      paymentStatus: initialPayment,
      saleType: saleType,
      date: new Date().toISOString()
    };

    setSales([newSale, ...sales]);
    updateInventoryStock(selectedItem.id, -1);
    setIsModalOpen(false);
    
    // Reset form
    setCustomerName('');
    setSelectedItem(null);
    setSearchItemQuery('');
    setSoldPrice('');
    setSaleType('Sale');
    setInitialPayment(PaymentStatus.UNPAID);
    setInitialStatus(SaleStatus.ON_HOLD);
  };

  // --- UPDATERS ---

  const togglePayment = (id: string, current: PaymentStatus) => {
      const newStatus = current === PaymentStatus.PAID ? PaymentStatus.UNPAID : PaymentStatus.PAID;
      setSales(sales.map(s => s.id === id ? { ...s, paymentStatus: newStatus } : s));
  };

  const updateSaleType = (id: string, newType: SaleType) => {
      setSales(sales.map(s => s.id === id ? { ...s, saleType: newType } : s));
  };

  const updateStatus = (id: string, newStatus: SaleStatus) => {
      setSales(sales.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const handleDelete = (sale: Sale) => {
    if (window.confirm(`Are you sure you want to delete the sale for "${sale.itemName}"? This will restore ${sale.quantity} unit(s) to inventory.`)) {
      deleteSale(sale.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <ShoppingCart className="w-6 h-6 text-emerald-500" /> Sales
           </h2>
           <p className="text-slate-500 text-sm">Record new sales and manage transaction details.</p>
        </div>
        
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all"
        >
            <Plus className="w-5 h-5" /> New Sale
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative flex-1">
             <input 
               type="text" 
               placeholder="Search sales..." 
               value={filterQuery}
               onChange={e => setFilterQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50"
             />
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <div className="flex gap-2">
              {(['All', 'Paid', 'Unpaid'] as const).map(p => (
                  <button 
                    key={p}
                    onClick={() => setFilterPayment(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${filterPayment === p ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                      {p}
                  </button>
              ))}
          </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Item & Customer</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Type</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Payment</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Shipping</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayedSales.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">No sales found matching your filters.</td></tr>
                    ) : (
                        displayedSales.map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-5 text-sm text-slate-500 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-300" />
                                        {new Date(sale.date).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="font-bold text-slate-900 text-base">{sale.itemName}</div>
                                    <div className="text-sm text-slate-500 flex items-center gap-1">
                                        Sold to <span className="font-semibold text-slate-700">{sale.customerName}</span>
                                    </div>
                                </td>
                                
                                {/* TYPE BUTTONS */}
                                <td className="px-6 py-5 text-center">
                                    <div className="flex justify-center gap-1">
                                        <button 
                                            onClick={() => updateSaleType(sale.id, 'Sale')}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${sale.saleType === 'Sale' ? 'bg-blue-500 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                                            title="Sale"
                                        >
                                            S
                                        </button>
                                        <button 
                                            onClick={() => updateSaleType(sale.id, 'Auction')}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${sale.saleType === 'Auction' ? 'bg-violet-500 text-white border-violet-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                                            title="Auction"
                                        >
                                            A
                                        </button>
                                        <button 
                                            onClick={() => updateSaleType(sale.id, 'Firesale')}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${sale.saleType === 'Firesale' ? 'bg-orange-500 text-white border-orange-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                                            title="Firesale"
                                        >
                                            F
                                        </button>
                                    </div>
                                </td>

                                {/* PAYMENT TOGGLE */}
                                <td className="px-6 py-5 text-center">
                                     <button 
                                        onClick={() => togglePayment(sale.id, sale.paymentStatus)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center justify-center gap-1 min-w-[80px] mx-auto hover:scale-105 active:scale-95
                                            ${sale.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}
                                        `}
                                     >
                                        {sale.paymentStatus === PaymentStatus.PAID ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {sale.paymentStatus}
                                     </button>
                                </td>

                                {/* SHIPPING BUTTONS (2 Options) */}
                                <td className="px-6 py-5 text-center">
                                    <div className="flex justify-center bg-slate-100 rounded-lg p-1 w-fit mx-auto border border-slate-200">
                                        <button 
                                            onClick={() => updateStatus(sale.id, SaleStatus.ON_HOLD)}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${sale.status === SaleStatus.ON_HOLD ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Hold
                                        </button>
                                        <button 
                                            onClick={() => updateStatus(sale.id, SaleStatus.TO_SHIP)}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${sale.status !== SaleStatus.ON_HOLD ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {sale.status === SaleStatus.SHIPPED ? 'Shipped' : 'Ship'}
                                        </button>
                                    </div>
                                </td>

                                <td className="px-6 py-5 text-right font-black text-slate-900 text-lg">
                                    ₱{sale.totalAmount.toLocaleString()}
                                </td>

                                <td className="px-6 py-5 text-center">
                                    <button 
                                        onClick={() => handleDelete(sale)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Record"
                                    >
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

      {/* Record Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Record New Sale</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
             </div>

             <form onSubmit={handleSubmit} className="space-y-5">
                {/* Item Search */}
                <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Item</label>
                    <div 
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 cursor-pointer flex justify-between items-center hover:border-emerald-500 transition-colors"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                    >
                        <span>{selectedItem ? selectedItem.name : 'Select from inventory...'}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                    
                    {isSearchOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                            <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                    value={searchItemQuery}
                                    onChange={e => setSearchItemQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            {filteredInventory.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-400">No items found.</div>
                            ) : (
                                filteredInventory.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => handleItemSelect(item)}
                                        className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                                            <div className="text-xs text-slate-400">{item.sku}</div>
                                        </div>
                                        <div className="text-emerald-600 font-bold text-sm">₱{item.price}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Customer</label>
                        <input 
                            required 
                            type="text" 
                            value={customerName} 
                            onChange={e => setCustomerName(e.target.value)} 
                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" 
                            placeholder="Name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Price (₱)</label>
                        <input 
                            required 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={soldPrice} 
                            onChange={e => setSoldPrice(parseFloat(e.target.value))} 
                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" 
                        />
                    </div>
                </div>

                {/* Toggles Group */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-200">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sale Type</label>
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                            {(['Sale', 'Auction', 'Firesale'] as SaleType[]).map(type => (
                                <button
                                    type="button"
                                    key={type}
                                    onClick={() => setSaleType(type)}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${saleType === type ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Payment</label>
                            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setInitialPayment(PaymentStatus.PAID)}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${initialPayment === PaymentStatus.PAID ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}
                                >
                                    Paid
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInitialPayment(PaymentStatus.UNPAID)}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${initialPayment === PaymentStatus.UNPAID ? 'bg-red-500 text-white' : 'text-slate-500'}`}
                                >
                                    Unpaid
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Shipping</label>
                            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setInitialStatus(SaleStatus.ON_HOLD)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${initialStatus === SaleStatus.ON_HOLD ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                >
                                    Hold
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInitialStatus(SaleStatus.TO_SHIP)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${initialStatus === SaleStatus.TO_SHIP ? 'bg-cyan-500 text-white' : 'text-slate-500'}`}
                                >
                                    To Ship
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-3 text-white bg-emerald-500 hover:bg-emerald-600 transition-all rounded-xl font-bold shadow-sm">Save Sale</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;