
import React, { useState, useMemo, useEffect } from 'react';
import { Sale, SaleStatus, PaymentStatus } from '../types.ts';
import { Search, Box, ClipboardPaste, Sparkles, Truck, Copy, ExternalLink, Filter } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface LbcBookingProps {
  sales: Sale[];
  setSales: (sales: Sale[]) => void;
  preselectedCustomer: string | null;
  clearPreselection: () => void;
}

const LbcBooking: React.FC<LbcBookingProps> = ({ sales, setSales, preselectedCustomer, clearPreselection }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLbcCustomer, setSelectedLbcCustomer] = useState<string | null>(null);
  const [detailsInput, setDetailsInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDetails, setParsedDetails] = useState<any>(null);
  
  // Default show everything that isn't shipped (hold+ready) for booking purposes
  // To stick to request "Remove Ready to ship filter", we show all active.
  const showOnlyReady = false; 

  // Handle incoming pre-selection (e.g. from Shipping Center)
  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedLbcCustomer(preselectedCustomer);
      const normName = preselectedCustomer.trim().toLowerCase();
      const group = sales.filter(s => s.customerName.trim().toLowerCase() === normName);
      
      if (group && group.length > 0 && group[0].shippingDetails) {
          setDetailsInput(group[0].shippingDetails);
      }
      clearPreselection();
    }
  }, [preselectedCustomer, sales, clearPreselection]);

  // Group by Customer
  const groupedSales = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    sales.forEach(sale => {
      // Logic: Show everything NOT shipped (Hold + To Ship)
      if (sale.status === SaleStatus.SHIPPED) return;

      const normalizedName = sale.customerName.trim().toLowerCase();
      if (searchQuery === '' || sale.customerName.toLowerCase().includes(searchQuery.toLowerCase())) {
         if (!groups[normalizedName]) groups[normalizedName] = [];
         groups[normalizedName].push(sale);
      }
    });
    return groups;
  }, [sales, searchQuery]);

  const customerKeys = Object.keys(groupedSales).sort();

  const selectLbcCustomer = (customerName: string) => {
      setSelectedLbcCustomer(customerName);
      const normName = customerName.trim().toLowerCase();
      const group = groupedSales[normName];
      if (group && group.length > 0 && group[0].shippingDetails) {
          setDetailsInput(group[0].shippingDetails);
      } else {
          setDetailsInput('');
          setParsedDetails(null);
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const handleParse = async () => {
      if (!detailsInput.trim()) return;
      setIsParsing(true);
      try {
          const apiKey = process.env.API_KEY;
          if (!apiKey) {
            alert("API Key not configured");
            setIsParsing(false);
            return;
          }

          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
            Extract the following shipping details from this text into a JSON object: 
            receiverName, phoneNumber, streetAddress, barangay, city, province, zipCode.
            If a field is missing, use empty string.
            
            Text: "${detailsInput}"
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });

          const json = JSON.parse(response.text || '{}');
          setParsedDetails(json);
          
          if (selectedLbcCustomer) {
             const normName = selectedLbcCustomer.trim().toLowerCase();
             const updatedSales = sales.map(s => {
                 if (s.customerName.trim().toLowerCase() === normName) {
                     return { ...s, shippingDetails: detailsInput };
                 }
                 return s;
             });
             setSales(updatedSales);
          }

      } catch (e) {
          console.error(e);
          alert("Failed to parse details. Please try again.");
      } finally {
          setIsParsing(false);
      }
  };

  const activeGroup = selectedLbcCustomer ? groupedSales[selectedLbcCustomer.trim().toLowerCase()] : null;
  const safeActiveGroup = activeGroup || (selectedLbcCustomer ? sales.filter(s => s.customerName.trim().toLowerCase() === selectedLbcCustomer.trim().toLowerCase()) : null);

  const totalAmount = safeActiveGroup ? safeActiveGroup.reduce((sum, s) => sum + s.totalAmount, 0) : 0;
  const isUnpaid = safeActiveGroup ? safeActiveGroup.some(s => s.paymentStatus === PaymentStatus.UNPAID) : false;
  const codAmount = isUnpaid ? totalAmount : 0;
  const itemsList = safeActiveGroup ? (safeActiveGroup.map(s => `${s.quantity}x ${s.itemName}`).join(', ') + ' Cards') : '';

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-none">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-500" /> LBC Booking
           </h2>
           <p className="text-slate-500 text-sm">Automated form filler for LBC Express.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
                <input 
                    type="text" 
                    placeholder="Search customers..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500/50 outline-none placeholder-slate-400 transition-all shadow-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-500">
                  Customers
              </div>
              {customerKeys.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">
                    No active orders found.
                 </div>
              ) : (
                <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                    {customerKeys.map(key => {
                        const group = groupedSales[key];
                        const name = group[0].customerName;
                        const isSelected = selectedLbcCustomer === name;
                        const hasReadyItems = group.some(s => s.status === SaleStatus.TO_SHIP);
                        
                        return (
                            <div 
                              key={key}
                              onClick={() => selectLbcCustomer(name)}
                              className={`p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>{name}</div>
                                    {hasReadyItems && <span className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shadow-sm" title="Ready to Ship"></span>}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">{group.length} items • ₱{group.reduce((a,b)=>a+b.totalAmount,0).toFixed(2)}</div>
                            </div>
                        )
                    })}
                </div>
              )}
          </div>

          <div className="md:col-span-2 flex flex-col gap-6 h-full overflow-y-auto pr-1 custom-scrollbar">
              {!selectedLbcCustomer ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                      <Box className="w-16 h-16 mb-4 opacity-30 text-slate-300" />
                      <p className="font-medium">Select a customer to start booking</p>
                  </div>
              ) : (
                  <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <ClipboardPaste className="w-4 h-4 text-emerald-500" /> Shipping Details
                            </h3>
                            <button 
                                onClick={handleParse}
                                disabled={isParsing || !detailsInput}
                                className="bg-emerald-500 hover:bg-emerald-600 transition-all text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-sm"
                            >
                                <Sparkles className="w-3 h-3" /> {isParsing ? 'Parsing...' : 'Auto-Fill Details'}
                            </button>
                        </div>
                        <textarea 
                            value={detailsInput}
                            onChange={e => setDetailsInput(e.target.value)}
                            placeholder="Paste raw address string here..."
                            className="w-full h-32 p-4 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none placeholder-slate-400 font-mono"
                        />
                    </div>

                    {parsedDetails && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-emerald-500" /> Booking Fields
                            </h3>
                            <div className="grid grid-cols-2 gap-5">
                                {['receiverName', 'phoneNumber', 'streetAddress', 'barangay', 'city', 'province', 'zipCode'].map(field => (
                                    <div key={field} className={field === 'streetAddress' ? 'col-span-2' : ''}>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block tracking-wider">{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                                        <div className="flex gap-2">
                                            <input 
                                                readOnly 
                                                value={parsedDetails[field] || ''} 
                                                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900"
                                            />
                                            <button onClick={() => copyToClipboard(parsedDetails[field])} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">COD Amount</label>
                                 <div className="flex gap-2">
                                     <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-emerald-600 font-bold text-xl">
                                         ₱{codAmount.toFixed(2)}
                                     </div>
                                     <button onClick={() => copyToClipboard(codAmount.toFixed(2))} className="px-4 text-emerald-600 hover:bg-emerald-50 rounded-xl border border-emerald-100 transition-colors">
                                        <Copy className="w-5 h-5" />
                                     </button>
                                 </div>
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Item Description</label>
                                 <div className="flex gap-2">
                                     <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-700 text-sm h-14 overflow-y-auto custom-scrollbar flex items-center">
                                         {itemsList}
                                     </div>
                                     <button onClick={() => copyToClipboard(itemsList)} className="px-4 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors">
                                        <Copy className="w-5 h-5" />
                                     </button>
                                 </div>
                             </div>
                         </div>
                         <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                             <a 
                                href="https://lbconline.lbcexpress.com/Dashboard" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-red-500 hover:bg-red-600 transition-all text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm"
                             >
                                 Open LBC Online <ExternalLink className="w-4 h-4" />
                             </a>
                         </div>
                    </div>
                  </>
              )}
          </div>
      </div>
    </div>
  );
};

export default LbcBooking;
