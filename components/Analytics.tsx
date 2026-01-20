import React, { useState, useMemo } from 'react';
import { AppState, ProductAnalytics } from '../types.ts';
import { 
  BarChart3, 
  TrendingUp,
  Package,
  DollarSign,
  Percent,
  Award,
  ArrowUpRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsProps {
  data: AppState;
}

const Analytics: React.FC<AnalyticsProps> = ({ data }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
  };

  const filteredSales = useMemo(() => {
    const startDate = getDateRange();
    return data.sales.filter(s => new Date(s.date) >= startDate);
  }, [data.sales, timeRange]);

  const productAnalytics: ProductAnalytics[] = useMemo(() => {
    const productMap = new Map<string, ProductAnalytics>();

    filteredSales.forEach(sale => {
      const existing = productMap.get(sale.itemId);
      const profit = sale.totalAmount - ((sale.costPrice + (sale.supplyCost || 0) + (sale.shippingCost || 0)) * sale.quantity);
      
      if (existing) {
        existing.totalSold += sale.quantity;
        existing.totalRevenue += sale.totalAmount;
        existing.totalProfit += profit;
      } else {
        productMap.set(sale.itemId, {
          productId: sale.itemId,
          productName: sale.itemName,
          totalSold: sale.quantity,
          totalRevenue: sale.totalAmount,
          totalProfit: profit,
          profitMargin: 0,
          averageDaysToSell: 0
        });
      }
    });

    return Array.from(productMap.values()).map(p => ({
      ...p,
      profitMargin: p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue) * 100 : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales]);

  const bestSellers = productAnalytics.slice(0, 5);

  const salesByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    filteredSales.forEach(sale => {
      const item = data.inventory.find(i => i.id === sale.itemId);
      const category = item?.category || 'Other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + sale.totalAmount);
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredSales, data.inventory]);

  const dailyRevenue = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 12;
    const result = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (timeRange === 'year') {
        date.setMonth(date.getMonth() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySales = data.sales.filter(s => {
        const saleDate = new Date(s.date);
        if (timeRange === 'year') {
          return saleDate.getMonth() === date.getMonth() && saleDate.getFullYear() === date.getFullYear();
        }
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      const revenue = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const profit = daySales.reduce((sum, s) => sum + (s.totalAmount - ((s.costPrice + (s.supplyCost || 0) + (s.shippingCost || 0)) * s.quantity)), 0);

      result.push({
        date: timeRange === 'year' 
          ? date.toLocaleString('default', { month: 'short' })
          : date.toLocaleDateString('default', { weekday: 'short', day: 'numeric' }),
        revenue,
        profit
      });
    }
    
    return result;
  }, [data.sales, timeRange]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.totalAmount - ((s.costPrice + (s.supplyCost || 0) + (s.shippingCost || 0)) * s.quantity)), 0);
  const avgOrderValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Track your business performance</p>
        </div>
        
        {/* Time Range */}
        <div className="flex items-center bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : '12 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">₱{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Profit</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            ₱{totalProfit.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
              <Percent className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Margin</p>
          <p className="text-2xl font-bold text-gray-900">{profitMargin.toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Avg Order</p>
          <p className="text-2xl font-bold text-gray-900">₱{avgOrderValue.toFixed(0)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Revenue & Profit</h3>
              <p className="text-sm text-gray-400 mt-0.5">Performance over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-brand-600"></div>
                <span className="text-gray-500">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-brand-300"></div>
                <span className="text-gray-500">Profit</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: number) => [`₱${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900">By Category</h3>
            <p className="text-sm text-gray-400 mt-0.5">Sales distribution</p>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`₱${value.toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-4">
            {salesByCategory.slice(0, 4).map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-gray-600">{cat.name}</span>
                </div>
                <span className="font-semibold text-gray-900">₱{cat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best Sellers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Top Products</h3>
          <p className="text-sm text-gray-400 mt-0.5">Best performing items</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bestSellers.map((product, i) => (
                <tr key={product.productId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="font-medium text-gray-900 truncate max-w-[200px]">{product.productName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">{product.totalSold}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">₱{product.totalRevenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-green-600">₱{product.totalProfit.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      product.profitMargin >= 30 
                        ? 'bg-green-100 text-green-700' 
                        : product.profitMargin >= 15 
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {product.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {bestSellers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No sales data for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
