import React, { useRef, useState } from 'react';
import { AppState, SaleStatus } from '../types.ts';
import { Download, Upload, FileSpreadsheet, Database, AlertTriangle, Save, Copy, Check, Cloud, ChevronDown, ChevronUp, Link as LinkIcon, RefreshCw, ToggleLeft, ToggleRight, Lock, Globe } from 'lucide-react';

interface SettingsProps {
  data: AppState;
  onImport: (data: AppState) => void;
}

const Settings: React.FC<SettingsProps> = ({ data, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState(data.googleSheetsUrl || '');
  const [ebayToken, setEbayToken] = useState(data.ebayUserToken || '');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const downloadJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bogart_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.inventory && parsed.sales) {
            if(confirm("This will overwrite your current data with the backup. Are you sure?")) {
                onImport(parsed);
                alert("Data restored successfully!");
            }
        } else {
            alert("Invalid backup file format.");
        }
      } catch (error) {
        alert("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const generateRows = (type: 'sales' | 'inventory' | 'expenses') => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (type === 'sales') {
        headers = ['Date', 'Item', 'Customer', 'Type', 'Status', 'Payment', 'Qty', 'Unit Price', 'Total'];
        rows = data.sales.map(s => [
            new Date(s.date).toLocaleDateString(),
            s.itemName,
            s.customerName,
            s.saleType,
            s.status,
            s.paymentStatus,
            s.quantity,
            s.unitPrice,
            s.totalAmount
        ]);
    } else if (type === 'inventory') {
        headers = ['Item Name', 'SKU', 'Category', 'Stock', 'Cost', 'Price', 'Batch'];
        rows = data.inventory.map(i => [
            i.name,
            i.sku,
            i.category,
            i.quantity,
            i.costPrice,
            i.price,
            i.batchCode || ''
        ]);
    } else if (type === 'expenses') {
        headers = ['Date', 'Description', 'Category', 'Amount'];
        rows = data.expenses.map(e => [
             new Date(e.date).toLocaleDateString(),
             e.description,
             e.category,
             e.amount
        ]);
    }
    return { headers, rows };
  };

  const downloadCSV = (type: 'sales' | 'inventory' | 'expenses') => {
    const { headers, rows } = generateRows(type);
    
    // CSV escaping
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bogart_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (type: 'sales' | 'inventory' | 'expenses') => {
    const { headers, rows } = generateRows(type);
    
    // TSV
    const tsvContent = [
        headers.join('\t'),
        ...rows.map(row => row.map((cell: any) => String(cell).replace(/\t/g, ' ')).join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
        setCopyStatus(type);
        setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  const handleSaveUrl = () => {
      onImport({ ...data, googleSheetsUrl: scriptUrl });
      alert("Proxy URL saved!");
  };
  
  const handleSaveToken = () => {
      onImport({ ...data, ebayUserToken: ebayToken });
      alert("eBay Token saved securely.");
  };
  
  const toggleAutoSync = () => {
      onImport({ ...data, autoSyncEnabled: !data.autoSyncEnabled });
  };

  const handleSync = async () => {
      if (!scriptUrl) {
          alert("Please enter a Google Apps Script URL first.");
          return;
      }
      setIsSyncing(true);
      try {
          // Prepare payload
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

          // Use 'text/plain' to avoid CORS Preflight (OPTIONS) request which GAS doesn't handle
          await fetch(scriptUrl, {
              method: 'POST',
              mode: 'no-cors', 
              headers: {
                  'Content-Type': 'text/plain',
              },
              body: JSON.stringify(payload)
          });
          
          alert("Sync sent! Please check your Google Sheet.");
      } catch (error) {
          console.error(error);
          alert("Sync failed. Check console for details.");
      } finally {
          setIsSyncing(false);
      }
  };

  // Updated Script Code with Proxy Capability
  const scriptCode = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  
  // --- API PROXY FEATURE (For eBay/External APIs) ---
  if (data.proxyUrl) {
    var options = {
      method: data.method || 'get',
      headers: data.headers || {},
      muteHttpExceptions: true
    };
    if (data.payload) {
       options.payload = data.payload;
    }
    var response = UrlFetchApp.fetch(data.proxyUrl, options);
    return ContentService.createTextOutput(response.getContentText()).setMimeType(ContentService.MimeType.JSON);
  }
  // --------------------------------------------------

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (data.sales) updateSheet(ss, 'Sales', ['Date', 'Item', 'Customer', 'Type', 'Status', 'Payment', 'Qty', 'Unit Price', 'Total'], data.sales.map(s => [s.date, s.itemName, s.customerName, s.saleType, s.status, s.paymentStatus, s.quantity, s.unitPrice, s.totalAmount]));
  if (data.shipped) updateSheet(ss, 'Shipped Items', ['Date', 'Item', 'Customer', 'Qty', 'Shipping Details'], data.shipped.map(s => [s.date, s.itemName, s.customerName, s.quantity, s.shippingDetails]));
  if (data.inventory) updateSheet(ss, 'Inventory', ['Item Name', 'SKU', 'Category', 'Stock', 'Cost', 'Price', 'Batch'], data.inventory.map(i => [i.name, i.sku, i.category, i.quantity, i.costPrice, i.price, i.batchCode]));
  if (data.expenses) updateSheet(ss, 'Expenses', ['Date', 'Description', 'Category', 'Amount'], data.expenses.map(e => [e.date, e.description, e.category, e.amount]));

  return ContentService.createTextOutput(JSON.stringify({result: 'success'})).setMimeType(ContentService.MimeType.JSON);
}

function updateSheet(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();
  sheet.appendRow(headers);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}`;

  return (
    <div className="space-y-8 pb-10">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-500" /> Data Management
           </h2>
           <p className="text-slate-500 text-sm">Backup, sync, and export your business data.</p>
        </div>

        {/* API Configurations */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-500" /> API Configuration
                </h3>
                <p className="text-sm text-slate-500 mt-1">Configure external services for syncing and sourcing.</p>
             </div>
             
             <div className="p-6 space-y-6">
                 {/* Google Sheet URL */}
                 <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Google Apps Script URL (Proxy)</label>
                     <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="https://script.google.com/..." 
                                value={scriptUrl}
                                onChange={(e) => setScriptUrl(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <button onClick={handleSaveUrl} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">
                            Save URL
                        </button>
                     </div>
                 </div>

                 {/* eBay Token */}
                 <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <Globe className="w-3 h-3 text-blue-500" /> eBay User Access Token
                     </label>
                     <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input 
                                type="password" 
                                placeholder="Paste OAuth Token here (v^1.1...)" 
                                value={ebayToken}
                                onChange={(e) => setEbayToken(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <button onClick={handleSaveToken} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">
                            Save Token
                        </button>
                     </div>
                     <p className="text-[10px] text-slate-400 mt-1">Token is saved locally for convenience. Use a User Access Token from the eBay Developer Portal.</p>
                 </div>

                 {/* Actions */}
                 <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                     <button 
                        onClick={toggleAutoSync}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${data.autoSyncEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                    >
                        <span className="text-sm font-bold">{data.autoSyncEnabled ? 'Auto-Sync ON' : 'Auto-Sync OFF'}</span>
                        {data.autoSyncEnabled ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                    </button>

                    <button 
                        onClick={handleSync} 
                        disabled={isSyncing}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                     >
                         <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
                         {isSyncing ? 'Syncing...' : 'Sync Now'}
                     </button>
                 </div>

                 <div className="border border-blue-100 bg-blue-50 rounded-xl overflow-hidden">
                     <button 
                        onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
                        className="w-full flex justify-between items-center p-4 text-left font-bold text-blue-800 text-sm hover:bg-blue-100 transition-colors"
                     >
                        <span>View Google Apps Script Code</span>
                        {isInstructionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                     </button>
                     
                     {isInstructionsOpen && (
                         <div className="p-4 bg-white border-t border-blue-100 text-sm text-slate-600 space-y-4">
                             <div className="relative group">
                                 <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg overflow-x-auto text-xs font-mono">{scriptCode}</pre>
                                 <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(scriptCode);
                                        alert("Script copied!");
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-slate-700 text-white rounded hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                     <Copy className="w-4 h-4" />
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
        </div>

        {/* Manual Export/Backup Sections (Unchanged) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Save className="w-5 h-5 text-emerald-500" /> Backup & Restore
                </h3>
                <div className="space-y-4">
                    <button 
                        onClick={downloadJson}
                        className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Download className="w-5 h-5" /> Download Full Backup (.json)
                    </button>
                    
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".json"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-3 px-4 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-dashed"
                        >
                            <Upload className="w-5 h-5" /> Restore from Backup
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Manual Export
                </h3>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <button onClick={() => downloadCSV('sales')} className="flex-1 py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">Sales CSV</button>
                        <button onClick={() => copyToClipboard('sales')} className="flex-1 py-3 px-3 bg-emerald-500 text-white rounded-xl font-bold text-sm">Copy Sales</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => downloadCSV('inventory')} className="flex-1 py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">Stock CSV</button>
                        <button onClick={() => copyToClipboard('inventory')} className="flex-1 py-3 px-3 bg-emerald-500 text-white rounded-xl font-bold text-sm">Copy Stock</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => downloadCSV('expenses')} className="flex-1 py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">Cost CSV</button>
                        <button onClick={() => copyToClipboard('expenses')} className="flex-1 py-3 px-3 bg-emerald-500 text-white rounded-xl font-bold text-sm">Copy Cost</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Settings;