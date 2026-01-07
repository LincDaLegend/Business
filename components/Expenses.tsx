import React, { useState, useMemo } from 'react';
import { Expense } from '../types.ts';
import { 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Receipt,
  AlertTriangle,
  Target,
  CheckCircle2,
  Wallet,
  BarChart as BarChartIcon,
  ChevronLeft,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ExpensesProps {
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  budgets: Record<string, number>;
  setBudgets: (budgets: Record<string, number>) => void;
  categories: string[];
  setCategories: (categories: string[]) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, setExpenses, budgets, setBudgets, categories, setCategories }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // New Category State
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Modal Form State
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('Operating Expenses');
  const [newAmt, setNewAmt] = useState<string>(''); 
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // Color generator for dynamic categories
  const getCategoryColor = (str: string) => {
      const colors = ['#f97316', '#10b981', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#3b82f6', '#14b8a6'];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
  };

  const changeMonth = (offset: number) => {
    const newDateObj = new Date(currentDate);
    newDateObj.setMonth(newDateObj.getMonth() + offset);
    setCurrentDate(newDateObj);
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter expenses for the selected month (List View)
  const monthlyExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, currentYear, currentMonth]);

  // Expenses for the entire year (Chart View)
  const yearlyExpenses = useMemo(() => {
      return expenses.filter(e => new Date(e.date).getFullYear() === currentYear);
  }, [expenses, currentYear]);

  // Apply search and category filters
  const filteredExpenses = useMemo(() => {
    return monthlyExpenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [monthlyExpenses, searchQuery, categoryFilter]);

  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // --- MONTHLY SPENDING CHART DATA (JAN-DEC) ---
  const monthlyChartData = useMemo(() => {
      const data = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 0; i < 12; i++) {
          const monthName = months[i];
          const monthData: any = { name: monthName };
          categories.forEach(cat => monthData[cat] = 0);
          
          const monthExpenses = yearlyExpenses.filter(e => new Date(e.date).getMonth() === i);
          monthExpenses.forEach(e => {
              if (categories.includes(e.category)) {
                  monthData[e.category] += e.amount;
              }
          });
          data.push(monthData);
      }
      return data;
  }, [yearlyExpenses, categories]);

  const categorySpendMap = useMemo(() => {
    const map: Record<string, number> = {};
    monthlyExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [monthlyExpenses]);

  // --- YEARLY BUDGET SUMMARY ---
  const yearlyBudgetSummary = useMemo(() => {
     let totalYearlyBudget = 0;
     let totalYearlySpent = 0;
     
     // Loop through all months of the year
     for (let m = 0; m < 12; m++) {
         categories.forEach(cat => {
             const key = `${currentYear}-${m}-${cat}`;
             totalYearlyBudget += budgets[key] || 0;
         });
     }
     totalYearlySpent = yearlyExpenses.reduce((sum, e) => sum + e.amount, 0);
     
     return { totalYearlyBudget, totalYearlySpent };
  }, [budgets, yearlyExpenses, currentYear, categories]);

  // Robust ID generator fallback
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newAmt);
    if (isNaN(amountVal) || amountVal < 0) return;

    const d = new Date(newDate);
    const now = new Date();
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newExpense: Expense = {
      id: generateId(),
      description: newDesc,
      category: newCat,
      amount: amountVal,
      date: d.toISOString()
    };
    
    setExpenses([newExpense, ...expenses]);
    
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
      setCurrentDate(d);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if(newCategoryName && !categories.includes(newCategoryName)) {
          setCategories([...categories, newCategoryName]);
          setNewCategoryName('');
          setIsAddCategoryOpen(false);
      }
  };

  const confirmDelete = () => {
    if (deleteId) {
      setExpenses(expenses.filter(e => e.id !== deleteId));
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setNewDesc('');
    setNewCat(categories[0] || 'General');
    setNewAmt('');
    setNewDate(new Date().toISOString().split('T')[0]);
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleBudgetChange = (category: string, val: string) => {
    const key = `${currentYear}-${currentMonth}-${category}`;
    const newBudgets = { ...budgets };
    
    if (val === '') {
        delete newBudgets[key];
    } else {
        newBudgets[key] = parseFloat(val);
    }
    setBudgets(newBudgets);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-500" /> Expenses
          </h2>
          <p className="text-slate-500 text-sm">Track your business outflows and overheads.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
           <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="w-32 text-center font-bold text-slate-700 text-sm select-none">{monthLabel}</span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
                  <ChevronRight className="w-4 h-4" />
              </button>
           </div>
           
           <button 
             onClick={openModal}
             className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 transition-all text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"
           >
             <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Expense</span>
           </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Spent */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Spent ({monthLabel})</p>
             <p className="text-3xl font-semibold text-slate-900 tracking-tight">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
           </div>
           <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
             <Wallet className="w-6 h-6 text-red-500" />
           </div>
        </div>

        {/* Card 2: Yearly Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Yearly Summary ({currentYear})</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">YTD</span>
            </div>
            <div className="flex justify-between items-baseline mb-2">
                <span className="text-xl font-bold text-slate-900">₱{yearlyBudgetSummary.totalYearlySpent.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-400">of ₱{yearlyBudgetSummary.totalYearlyBudget.toLocaleString()} Budget</span>
            </div>
            {/* Standard progress bar for summary */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all ${yearlyBudgetSummary.totalYearlySpent > yearlyBudgetSummary.totalYearlyBudget ? 'bg-red-500' : 'bg-emerald-500'}`} 
                    style={{ width: yearlyBudgetSummary.totalYearlyBudget > 0 ? `${Math.min(100, (yearlyBudgetSummary.totalYearlySpent / yearlyBudgetSummary.totalYearlyBudget) * 100)}%` : '0%' }}
                />
            </div>
        </div>

        {/* Card 3: Count */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transactions</p>
             <p className="text-3xl font-semibold text-slate-900 tracking-tight">{monthlyExpenses.length}</p>
           </div>
           <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
             <Receipt className="w-6 h-6 text-slate-400" />
           </div>
        </div>
      </div>

      {/* CHART SECTION: MONTHLY BREAKDOWN */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-96">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
              <BarChartIcon className="w-4 h-4 text-emerald-500" /> Monthly Spending Breakdown ({currentYear})
          </h3>
          <ResponsiveContainer width="100%" height="85%">
              <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#94a3b8', fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#64748b'}} tickFormatter={(value) => `₱${value}`} />
                  <Tooltip 
                      cursor={{fill: '#f1f5f9', opacity: 0.5}}
                      formatter={(value: number) => [`₱${value.toLocaleString()}`]}
                      contentStyle={{backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                      itemStyle={{paddingBottom: '2px'}}
                  />
                  <Legend 
                    wrapperStyle={{paddingTop: '20px'}} 
                    iconType="circle"
                    formatter={(value) => <span className="text-slate-500 text-xs font-bold ml-1">{value}</span>}
                  />
                  {categories.map((cat, index) => (
                      <Bar 
                        key={cat} 
                        dataKey={cat} 
                        stackId="a" 
                        fill={getCategoryColor(cat)} 
                        radius={index === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                  ))}
              </BarChart>
          </ResponsiveContainer>
      </div>

      {/* Budget Tracker List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" /> Monthly Budget Tracker
            </h3>
            <button 
                onClick={() => setIsAddCategoryOpen(true)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
                <PlusCircle className="w-3.5 h-3.5" /> Add Category
            </button>
        </div>

        {/* Add Category Input */}
        {isAddCategoryOpen && (
            <form onSubmit={handleAddCategory} className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex gap-3 animate-in fade-in slide-in-from-top-2">
                <input 
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name..."
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    autoFocus
                />
                <button type="button" onClick={() => setIsAddCategoryOpen(false)} className="px-3 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600">Save</button>
            </form>
        )}

        <div className="space-y-4">
            {categories.map(cat => {
                const key = `${currentYear}-${currentMonth}-${cat}`;
                const budget = budgets[key] || 0;
                const spent = categorySpendMap[cat] || 0;
                
                const percentage = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);
                
                // Logic: 
                // Red if (Budget 0 AND Spent > 0) OR (Spent > Budget)
                const isOverBudget = spent > budget;
                const isUnbudgetedLoss = budget === 0 && spent > 0;
                const isNegativeState = isOverBudget || isUnbudgetedLoss;
                
                const remaining = budget - spent;

                return (
                    <div key={cat} className="flex flex-col md:flex-row items-stretch md:items-center gap-6 p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors bg-white">
                        {/* Left: Category Name */}
                        <div className="w-full md:w-1/4 flex items-center">
                            <span className="text-xl font-bold text-slate-800 tracking-tight">{cat}</span>
                        </div>
                        
                        {/* Right: Budget Controls & Viz */}
                        <div className="flex-1 w-full flex flex-col justify-center gap-3">
                             {/* Progress Section */}
                             <div>
                                <div className="flex justify-between text-xs font-bold mb-1.5 uppercase tracking-wider">
                                    <span className={isNegativeState ? 'text-red-500' : 'text-emerald-600'}>
                                        {percentage.toFixed(0)}% Consumed
                                    </span>
                                    <span className={isNegativeState ? 'text-red-500' : 'text-slate-400'}>
                                        {isNegativeState 
                                            ? `Over by ₱${Math.abs(remaining).toLocaleString()}` 
                                            : `Remaining: ₱${remaining.toLocaleString()}`
                                        }
                                    </span>
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${isNegativeState ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                        style={{ width: `${Math.min(100, percentage)}%` }}
                                    />
                                </div>
                             </div>

                             {/* Inputs Row */}
                             <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                                {/* Actual */}
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Actual Spent</span>
                                    <span className={`text-lg font-bold ${isNegativeState ? 'text-red-500' : 'text-slate-800'}`}>
                                        ₱{spent.toLocaleString()}
                                    </span>
                                </div>
                                
                                {/* Divider */}
                                <div className="w-px h-8 bg-slate-200"></div>

                                {/* Budget Input */}
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Monthly Budget</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm text-slate-400 font-bold">₱</span>
                                        <input 
                                            type="number" 
                                            min="0"
                                            className="w-24 text-right text-lg font-bold text-slate-800 bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-emerald-500 transition-colors"
                                            value={budgets[key] !== undefined ? budgets[key] : ''}
                                            placeholder="0"
                                            onChange={(e) => handleBudgetChange(cat, e.target.value)}
                                        />
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         {/* Table Toolbar */}
         <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-64">
               <input 
                 type="text" 
                 placeholder="Search transactions..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all placeholder-slate-400"
               />
               <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
               <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button 
                      onClick={() => setCategoryFilter('All')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${categoryFilter === 'All' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                       All
                   </button>
                   {categories.map(c => (
                       <button
                            key={c} 
                            onClick={() => setCategoryFilter(c)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${categoryFilter === c ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                       >
                           {c}
                       </button>
                   ))}
               </div>
            </div>
         </div>

         {/* Transaction Table */}
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Date</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-20"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                         {expenses.length === 0 
                            ? "No expenses recorded yet. Click 'Add Expense' to start." 
                            : "No transactions found matching your filters for this month."}
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(expense => (
                       <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-slate-900 font-semibold text-sm">
                             {expense.description}
                          </td>
                          <td className="px-6 py-4">
                             <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border bg-slate-50 text-slate-600 border-slate-200">
                               {expense.category}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">
                             ₱{expense.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                             <button 
                               onClick={() => setDeleteId(expense.id)}
                               className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                               title="Delete"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                       </tr>
                    ))
                  )}
               </tbody>
               {filteredExpenses.length > 0 && (
                   <tfoot className="bg-slate-50 border-t border-slate-200">
                       <tr>
                           <td colSpan={3} className="px-6 py-4 text-right text-sm font-semibold text-slate-500">
                               Filtered Total:
                           </td>
                           <td className="px-6 py-4 text-right text-sm font-black text-slate-900">
                               ₱{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                           </td>
                           <td></td>
                       </tr>
                   </tfoot>
               )}
            </table>
         </div>
      </div>

      {/* --- ADD EXPENSE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-0 overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Receipt className="w-6 h-6" /> Log Expense
                </h3>
            </div>
            
            <form onSubmit={handleSubmitExpense} className="p-6 space-y-5">
              
              {/* Massive Amount Input */}
              <div className="text-center">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Amount</label>
                  <div className="relative inline-block w-full">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-400">₱</span>
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={newAmt} 
                        onChange={e => setNewAmt(e.target.value)} 
                        className="w-full text-center text-5xl font-semibold text-emerald-500 border-b-2 border-slate-300 focus:border-emerald-500 outline-none py-2 bg-transparent placeholder-slate-300 transition-colors" 
                        placeholder="0.00"
                        autoFocus
                      />
                  </div>
              </div>

              {/* Enhanced Date Picker */}
              <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="bg-white border border-slate-200 p-2 rounded-lg">
                        <Calendar className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Transaction Date</label>
                          <input 
                            required 
                            type="date" 
                            value={newDate} 
                            onChange={e => setNewDate(e.target.value)} 
                            className="w-full bg-transparent font-bold text-slate-900 outline-none text-lg p-0 cursor-pointer" 
                          />
                      </div>
                  </div>
              </div>

               {/* Visible Category Selector (Grid) */}
               <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Category</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setNewCat(cat)}
                                className={`
                                    p-3 rounded-xl text-sm font-bold transition-all border
                                    ${newCat === cat 
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 scale-[1.02]' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    }
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
               </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
                 <input 
                    required 
                    type="text" 
                    value={newDesc} 
                    onChange={e => setNewDesc(e.target.value)} 
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium text-slate-900 placeholder-slate-400" 
                    placeholder="What was this for?" 
                 />
               </div>

               <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all rounded-xl flex items-center justify-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-200">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Transaction?</h3>
                <p className="text-slate-500 text-sm mb-8">
                    Are you sure you want to remove this expense? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteId(null)} 
                        className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete} 
                        className="flex-1 px-4 py-3 text-white bg-red-500 hover:bg-red-600 transition-all rounded-xl font-bold shadow-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;