import React, { useState, useMemo } from 'react';
import { AppState, SaleStatus, PaymentStatus, SaleType } from '../types.ts';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Target,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Package,
  ShoppingCart,
  Receipt,
  TrendingDown,
  DollarSign,
  Wallet,
  BarChart3,
  PieChart,
  Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, AreaChart, Area } from 'recharts';

interface DashboardProps {
  data: AppState;
  setActiveTab: (tab: string) => void;
}

// Mini sparkline data for cards
const generateSparkline = (trend: 'up' | 'down') => {
  const base = trend === 'up' ? [20, 25, 22, 30, 28, 35, 40, 38, 45, 50] : [50, 45, 48, 40, 42, 35, 38, 30, 28, 25];
  return base.map((v, i) => ({ x: i, y: v + Math.random() * 5 }));
};

const Dashboard: React.FC<DashboardProps> = ({ data, setActiveTab }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [targetMargin, setTargetMargin] = useState(30.0);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // --- CALCULATIONS ---
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
    });
  }, [data.expenses, currentMonth, currentYear]);

  const totalRevenue = monthlyIncome.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCOGS = monthlyIncome.reduce((sum, s) => sum + ((s.costPrice + (s.supplyCost || 0) + (s.shippingCost || 0)) * s.quantity), 0);
  const totalOpExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const grossProfit = totalRevenue - totalCOGS;
  const netEarnings = grossProfit - totalOpExpenses;
  const aggregateMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Chart data
  const marginVarianceData = useMemo(() => {
    const types: SaleType[] = ['Sale', 'Auction', 'Firesale'];
    
    return types.map(type => {
      const salesOfType = monthlyIncome.filter(s => s.saleType === type);
      const revenue = salesOfType.reduce((sum, s) => sum + s.totalAmount, 0);
      const cogs = salesOfType.reduce((sum, s) => sum + ((s.costPrice + (s.supplyCost || 0) + (s.shippingCost || 0)) * s.quantity), 0);
      const profit = revenue - cogs;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      return { name: type, margin: parseFloat(margin.toFixed(1)), target: targetMargin };
    });
  }, [monthlyIncome, targetMargin]);

  const heldOrdersCount = data.sales.filter(s => s.status === SaleStatus.ON_HOLD).length;
  const lowStockCount = data.inventory.filter(i => i.quantity < 5).length;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `₱${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `₱${(value / 1000).toFixed(1)}k`;
    return `₱${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Track your business performance</p>
        </div>
        
        {/* Date Picker */}
        <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm">
          <button 
            onClick={() => changeMonth(-1)} 
            className="p-3 hover:bg-gray-50 rounded-l-xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            <span className="font-medium text-gray-700 text-sm min-w-[120px] text-center">{monthLabel}</span>
          </div>
          <button 
            onClick={() => changeMonth(1)} 
            className="p-3 hover:bg-gray-50 rounded-r-xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-brand-600" />
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
              aggregateMargin >= 30 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <ArrowUpRight className="w-3 h-3" />
              {aggregateMargin.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total Revenue</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            <div className="w-16 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generateSparkline('up')}>
                  <defs>
                    <linearGradient id="sparkGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="y" stroke="#059669" strokeWidth={2} fill="url(#sparkGreen)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gross Profit Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Gross Profit</p>
          <p className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
            {formatCurrency(grossProfit)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Before operating expenses</p>
        </div>

        {/* On Hold Card */}
        <div 
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" 
          onClick={() => setActiveTab('held-orders')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            {heldOrdersCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                {heldOrdersCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">On Hold</p>
          <p className="text-2xl font-bold text-gray-900">{heldOrdersCount}</p>
          <p className="text-xs text-gray-400 mt-2">Packages to ship</p>
        </div>

        {/* Low Stock Card */}
        <div 
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" 
          onClick={() => setActiveTab('inventory')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            {lowStockCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                {lowStockCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
          <p className="text-xs text-gray-400 mt-2">Items to reorder</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-brand-600 hover:shadow-md transition-all group text-left"
        >
          <div className="w-11 h-11 bg-brand-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <p className="font-semibold text-gray-800">Add Inventory</p>
          <p className="text-sm text-gray-400 mt-0.5">Record new stock</p>
        </button>

        <button 
          onClick={() => setActiveTab('sales')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group text-left"
        >
          <div className="w-11 h-11 bg-brand-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <p className="font-semibold text-gray-800">New Sale</p>
          <p className="text-sm text-gray-400 mt-0.5">Record transaction</p>
        </button>

        <button 
          onClick={() => setActiveTab('expenses')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-red-300 hover:shadow-md transition-all group text-left"
        >
          <div className="w-11 h-11 bg-red-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <p className="font-semibold text-gray-800">Log Expense</p>
          <p className="text-sm text-gray-400 mt-0.5">Track spending</p>
        </button>

        <button 
          onClick={() => setActiveTab('held-orders')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-amber-300 hover:shadow-md transition-all group text-left"
        >
          <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md">
            <Package className="w-5 h-5 text-white" />
          </div>
          <p className="font-semibold text-gray-800">Process Orders</p>
          <p className="text-sm text-gray-400 mt-0.5">Ship packages</p>
        </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Statistics</h3>
              <p className="text-sm text-gray-400 mt-0.5">Margin by sale type</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-brand-600"></div>
                <span className="text-gray-500">On Target</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-brand-300"></div>
                <span className="text-gray-500">Below</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginVarianceData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis unit="%" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <ReferenceLine y={targetMargin} stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} />
                <Bar dataKey="margin" radius={[6, 6, 0, 0]}>
                  {marginVarianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.margin >= entry.target ? '#059669' : '#a7f3d0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-4">
          {/* Margin Target */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-600" />
                <span className="font-semibold text-gray-800">Margin Target</span>
              </div>
              <span className="text-2xl font-bold text-brand-600">{targetMargin}%</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="80" 
              value={targetMargin} 
              onChange={(e) => setTargetMargin(parseFloat(e.target.value))} 
              className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-brand-500"
            />
          </div>

          {/* Product Costs */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500 font-medium">Product Costs</span>
              <span className="text-lg font-bold text-gray-900">₱{totalCOGS.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-brand-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: totalRevenue > 0 ? `${Math.min(100, (totalCOGS/totalRevenue)*100)}%` : '0%' }}
              />
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500 font-medium">Operating Expenses</span>
              <span className="text-lg font-bold text-gray-900">₱{totalOpExpenses.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-brand-400 h-2 rounded-full transition-all duration-500" 
                style={{ width: totalRevenue > 0 ? `${Math.min(100, (totalOpExpenses/totalRevenue)*100)}%` : '0%' }}
              />
            </div>
          </div>

          {/* Net Earnings */}
          <div className={`rounded-2xl p-5 ${netEarnings >= 0 ? 'bg-brand-600' : 'bg-red-500'} text-white shadow-md`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-white/80" />
                <span className="font-medium text-white/80">Net Earnings</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20">
                {netEarnings >= 0 ? 'Profit' : 'Loss'}
              </span>
            </div>
            <p className="text-3xl font-bold">
              ₱{Math.abs(netEarnings).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;