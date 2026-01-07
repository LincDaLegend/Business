import React, { useState, useMemo } from 'react';
import { AppState, SaleStatus, PaymentStatus, SaleType } from '../types.ts';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Target,
  TrendingUp,
  PieChart as PieChartIcon,
  DollarSign,
  BarChart as BarChartIcon,
  Percent,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Package,
  ShoppingCart,
  Receipt
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface DashboardProps {
  data: AppState;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, setActiveTab }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Profit Target State (Default 30%)
  const [targetMargin, setTargetMargin] = useState(30.0);

  // Helper to change months
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // --- YEARLY DATA CALCULATIONS ---

  const yearlyIncome = useMemo(() => {
    return data.sales
      .filter(s => new Date(s.date).getFullYear() === currentYear && s.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [data.sales, currentYear]);

  const yearlyCOGS = useMemo(() => {
    return data.sales
      .filter(s => new Date(s.date).getFullYear() === currentYear && s.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, s) => sum + ((s.costPrice + (s.supplyCost || 0) + (s.shippingCost || 0)) * s.quantity), 0);
  }, [data.sales, currentYear]);

  const yearlyGrossProfit = yearlyIncome - yearlyCOGS;

  // --- FILTER DATA FOR SELECTED MONTH ---

  const monthlyIncome = useMemo(() => {
    return data.sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && 
             d.getFullYear() === currentYear && 
             s.paymentStatus === PaymentStatus.PAID;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.sales, currentMonth, currentYear]);

  const monthlyExpenses = useMemo(() => {
    return data.expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && 
             d.getFullYear() === currentYear;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.expenses, currentMonth, currentYear]);

  // Calculations
  const totalRevenue = monthlyIncome.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCOGS = monthlyIncome.reduce((sum, s) => sum + ((s.costPrice + (s.supplyCost || 0) + (s.shippingCost || 0)) * s.quantity), 0);
  const totalOpExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const grossProfit = totalRevenue - totalCOGS;
  const netEarnings = grossProfit - totalOpExpenses; // Bottom line
  
  const aggregateMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // --- MARGIN VARIANCE CHART DATA ---
  const marginVarianceData = useMemo(() => {
      const types: SaleType[] = ['Sale', 'Auction', 'Firesale'];
      
      return types.map(type => {
          const salesOfType = monthlyIncome.filter(s => s.saleType === type);
          const revenue = salesOfType.reduce((sum, s) => sum + s.totalAmount, 0);
          const cogs = salesOfType.reduce((sum, s) => sum + ((s.costPrice + (s.supplyCost || 0) + (s.shippingCost || 0)) * s.quantity), 0);
          const profit = revenue - cogs;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
          
          return {
              name: type,
              margin: parseFloat(margin.toFixed(1)),
              target: targetMargin,
              revenue: revenue // for tooltips
          };
      });
  }, [monthlyIncome, targetMargin]);

  return (
    <div className="space-y-6">

        {/* --- QUICK ACTIONS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
                onClick={() => setActiveTab('inventory')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group text-left"
            >
                <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="font-bold text-slate-700">Add Inventory</div>
                <div className="text-xs text-slate-400">Record new stock</div>
            </button>

            <button 
                onClick={() => setActiveTab('sales')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group text-left"
            >
                <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <div className="font-bold text-slate-700">New Sale</div>
                <div className="text-xs text-slate-400">Record transaction</div>
            </button>

            <button 
                onClick={() => setActiveTab('expenses')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-red-500 hover:shadow-md transition-all group text-left"
            >
                <div className="bg-red-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Receipt className="w-5 h-5 text-red-600" />
                </div>
                <div className="font-bold text-slate-700">Log Expense</div>
                <div className="text-xs text-slate-400">Track spending</div>
            </button>

             <button 
                onClick={() => setActiveTab('held-orders')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-500 hover:shadow-md transition-all group text-left"
            >
                <div className="bg-amber-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div className="font-bold text-slate-700">Held Orders</div>
                <div className="text-xs text-slate-400">To ship & book</div>
            </button>
        </div>

       {/* --- TOP: YEARLY SUMMARY --- */}
       <div className="bg-white rounded-2xl p-8 text-slate-900 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
             <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                <PieChartIcon className="w-5 h-5" />
             </div>
             <span className="text-xl font-bold tracking-tight">{currentYear} Annual Performance</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="px-4">
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Total Revenue (YTD)</p>
               <p className="text-4xl font-semibold text-emerald-500 tracking-tight">₱{yearlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               <p className="text-xs text-slate-400 mt-2 font-medium">Paid Sales Only</p>
            </div>
            <div className="px-4 pt-6 md:pt-0">
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Cost of Goods Sold (YTD)</p>
               <div className="flex flex-col">
                 <p className="text-4xl font-semibold text-red-400 tracking-tight">₱{yearlyCOGS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                 <span className="text-[10px] text-slate-400 mt-2 font-medium uppercase">
                   (Base Cost + Supply + Shipping)
                 </span>
               </div>
            </div>
            <div className="px-4 pt-6 md:pt-0">
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Product Profit (Gross)</p>
               <p className={`text-4xl font-semibold tracking-tight ${yearlyGrossProfit >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                 ₱{yearlyGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
               <p className="text-xs text-slate-400 mt-2 font-medium">Before Operating Expenses</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* --- CONTROLS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Date Selector */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <h2 className="text-slate-700 font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" /> Period
            </h2>
            <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-200 rounded-md transition-all text-slate-500 hover:text-slate-800">
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-32 text-center font-bold text-slate-700 text-sm">{monthLabel}</span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-200 rounded-md transition-all text-slate-500 hover:text-slate-800">
                <ChevronRight className="w-4 h-4" />
            </button>
            </div>
        </div>

        {/* Target Slider */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col justify-center relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-500" />
                    <span className="font-bold text-slate-700">Product Margin Target</span>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                        className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-semibold text-emerald-600 outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <span className="text-lg font-bold text-emerald-500">%</span>
                </div>
            </div>
            <input 
                type="range" 
                min="5" 
                max="80" 
                step="0.1"
                value={targetMargin} 
                onChange={(e) => setTargetMargin(parseFloat(e.target.value))} 
                className="w-full mt-3 h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-600 transition-all"
            />
        </div>
      </div>

      {/* --- VISUAL OVERVIEW SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Margin Variance Chart + Net Total */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-80 flex flex-row gap-6">
             <div className="flex-1 flex flex-col">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                    <BarChartIcon className="w-4 h-4 text-emerald-500" /> Margin Variance by Sale Type
                </h3>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marginVarianceData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
                            <YAxis unit="%" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                            <Tooltip 
                                cursor={{fill: '#f1f5f9', opacity: 0.5}}
                                contentStyle={{backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                itemStyle={{color: '#334155'}}
                            />
                            <ReferenceLine y={targetMargin} label={{ value: 'Target', position: 'insideTopRight', fill: '#34d399', fontSize: 10, fontWeight: 700 }} stroke="#10b981" strokeDasharray="3 3" />
                            <Bar dataKey="margin" name="Actual Margin %" radius={[4, 4, 0, 0]}>
                                {
                                marginVarianceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.margin >= entry.target ? '#10b981' : '#f43f5e'} />
                                ))
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>
             
             {/* Net Total Margin Card - Clean Emerald Theme */}
             <div className="w-48 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-center items-center text-center p-4">
                 <div className="flex flex-col gap-1 mb-2">
                     <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Net Total Margin</span>
                 </div>
                 
                 <div className="flex flex-col items-center justify-center my-auto">
                     <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-semibold tracking-tighter text-emerald-600">
                            {aggregateMargin.toFixed(2)}
                        </span>
                        <span className="text-xl font-bold text-emerald-600/60">%</span>
                     </div>
                     <span className="text-[10px] text-emerald-600/70 mt-1 font-medium">(Combined Types)</span>
                 </div>

                 <div className="mt-4 pt-4 border-t border-emerald-200/50 w-full flex justify-center">
                    {aggregateMargin >= targetMargin ? (
                        <div className="text-xs font-bold px-3 py-1.5 rounded-full inline-block bg-white text-emerald-600 shadow-sm border border-emerald-200">
                            On Track
                        </div>
                    ) : (
                        <div className="text-xs font-bold px-3 py-1.5 rounded-full inline-block bg-white text-red-500 shadow-sm border border-red-200">
                            Below Target
                        </div>
                    )}
                 </div>
             </div>
        </div>

        {/* 2. Financial Health Cards (Progress Bars) */}
        <div className="grid grid-rows-3 gap-4 h-80">
            {/* Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Product Costs (COGS)</span>
                    <span className="text-lg font-medium text-slate-900">₱{totalCOGS.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-slate-400 h-2.5 rounded-full" 
                        style={{ width: totalRevenue > 0 ? `${Math.min(100, (totalCOGS/totalRevenue)*100)}%` : '0%' }}
                    ></div>
                </div>
            </div>
            
            {/* Costs & Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Operating Expenses</span>
                    <span className="text-lg font-medium text-slate-900">₱{totalOpExpenses.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-red-400 h-2.5 rounded-full" 
                        style={{ width: totalRevenue > 0 ? `${Math.min(100, (totalOpExpenses/totalRevenue)*100)}%` : '0%' }}
                    ></div>
                </div>
            </div>

            {/* Net Profit - Cleaned */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
                <div className="flex-1 flex flex-col justify-center items-center relative z-10 px-5">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Earnings</span>
                        {netEarnings >= 0 ? 
                            <span className="bg-emerald-100 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" /> Profit
                            </span>
                        : 
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ArrowDownRight className="w-3 h-3" /> Loss
                            </span>
                        }
                    </div>
                    <div className={`text-3xl font-bold tracking-tight ${netEarnings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        ₱{netEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                
                {/* Background Decoration */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-slate-50 rounded-full z-0 opacity-50" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;