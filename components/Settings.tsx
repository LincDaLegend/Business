import React, { useRef, useState } from 'react';
import { AppState } from '../types.ts';
import { Download, Upload, FileSpreadsheet, Database, AlertTriangle, Save, Copy, Check, Cloud, ChevronDown, ChevronUp, Link as LinkIcon, RefreshCw } from 'lucide-react';

interface SettingsProps {
  data: AppState;
  onImport: (data: AppState) => void;
}

const Settings: React.FC<SettingsProps> = ({ data, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState(data.googleSheetsUrl || '');
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
      alert("Configuration saved!");
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

          // Using no-cors mode because Google Apps Script doesn't always handle CORS headers perfectly for simple POSTs 
          // unless handled very specifically in the script. 
          // 'no-cors' means we won't get a readable response content, but the request will send.
          await fetch(scriptUrl, {
              method: 'POST',
              mode: 'no-cors', 
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
          });
          
          // Since we use no-cors, we assume success if no network error thrown
          alert("Sync initiated! Check your Google Sheet in a few moments.");
      } catch (error) {
          console.error(error);
          alert("Sync failed. Please check the URL and your internet connection.");
      } finally {
          setIsSyncing(false);
      }
  };

  const scriptCode = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (data.sales) updateSheet(ss, 'Sales', ['Date', 'Item', 'Customer', 'Type', 'Status', 'Payment', 'Qty', 'Unit Price', 'Total'], data.sales.map(s => [s.date, s.itemName, s.customerName, s.saleType, s.status, s.paymentStatus, s.quantity, s.unitPrice, s.totalAmount]));
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

        {/* Cloud Sync Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-500" /> Cloud Sync (Google Sheets)
                </h3>
                <p className="text-sm text-slate-500 mt-1">Automatically push your Sales, Inventory, and Expenses to a Google Sheet.</p>
             </div>
             
             <div className="p-6 space-y-4">
                 <div className="flex gap-2">
                     <div className="flex-1 relative">
                        <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Paste Web App URL here..." 
                            value={scriptUrl}
                            onChange={(e) => setScriptUrl(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                     </div>
                     <button onClick={handleSaveUrl} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">
                         Save URL
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
                        <span>How to set this up? (One-time setup)</span>
                        {isInstructionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                     </button>
                     
                     {isInstructionsOpen && (
                         <div className="p-4 bg-white border-t border-blue-100 text-sm text-slate-600 space-y-4">
                             <ol className="list-decimal pl-5 space-y-2">
                                 <li>Create a new <strong>Google Sheet</strong>.</li>
                                 <li>Go to <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
                                 <li>Delete any code there and paste the script below.</li>
                                 <li>Click <strong>Deploy</strong> &gt; <strong>New deployment</strong>.</li>
                                 <li>Select type: <strong>Web app</strong>.</li>
                                 <li>Set <strong>Who has access</strong> to: <strong>Anyone</strong> (Important!).</li>
                                 <li>Click <strong>Deploy</strong> and copy the <strong>Web App URL</strong>.</li>
                                 <li>Paste the URL in the box above and click Save.</li>
                             </ol>
                             
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backup & Restore */}
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
                    <p className="text-xs text-center text-slate-400">
                        Use the .json file generated from the "Download Full Backup" button to restore your data.
                    </p>
                </div>
            </div>

            {/* Export Sheets */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Manual Export
                </h3>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => downloadCSV('sales')}
                            className="flex-1 py-3 px-3 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4 opacity-50" /> Sales CSV
                        </button>
                        <button 
                            onClick={() => copyToClipboard('sales')}
                            className="flex-1 py-3 px-3 bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                            {copyStatus === 'sales' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 
                            {copyStatus === 'sales' ? 'Copied!' : 'Copy for Sheets'}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => downloadCSV('inventory')}
                            className="flex-1 py-3 px-3 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4 opacity-50" /> Stock CSV
                        </button>
                         <button 
                            onClick={() => copyToClipboard('inventory')}
                            className="flex-1 py-3 px-3 bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                            {copyStatus === 'inventory' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 
                            {copyStatus === 'inventory' ? 'Copied!' : 'Copy for Sheets'}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => downloadCSV('expenses')}
                            className="flex-1 py-3 px-3 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4 opacity-50" /> Cost CSV
                        </button>
                         <button 
                            onClick={() => copyToClipboard('expenses')}
                            className="flex-1 py-3 px-3 bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                            {copyStatus === 'expenses' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 
                            {copyStatus === 'expenses' ? 'Copied!' : 'Copy for Sheets'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-start">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
                <h4 className="font-bold text-amber-800 text-sm">Data Storage Notice</h4>
                <p className="text-sm text-amber-700 mt-1">
                    Your data is stored locally in this browser. To prevent data loss, use the <strong>Backup</strong> or <strong>Cloud Sync</strong> features regularly.
                </p>
            </div>
        </div>
    </div>
  );
};

export default Settings;