import React, { useState } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Menu, X, Box, Receipt, PackageOpen, Truck } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'held-orders', label: 'Packages on Hold', icon: PackageOpen },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'lbc-booking', label: 'LBC Integration', icon: Truck },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out shadow-xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-24 flex items-center justify-center px-6 border-b border-slate-100 relative">
            <div className="flex items-center justify-center gap-2">
                <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-emerald-200">
                    <Box className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start -space-y-0.5 pt-1">
                    <span className="text-2xl text-slate-900 leading-none font-extrabold tracking-tight font-['Outfit']">BOGART</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase leading-tight tracking-[0.15em] font-['Outfit']">MAKES BANDS</span>
                </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 absolute right-4 top-8">
              <X className="w-6 h-6" />
            </button>
        </div>

        <div className="h-full flex flex-col">
          <nav className="flex-1 p-4 space-y-2 mt-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200
                  ${activeTab === item.id 
                    ? 'bg-slate-800 text-white shadow-md shadow-slate-200' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 pb-8">
            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
              <p className="text-xs text-slate-400 font-medium">Business Manager v1.5</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-700">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Box className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start -space-y-0.5 pt-1">
                  <span className="text-xl text-slate-900 leading-none font-extrabold tracking-tight font-['Outfit']">BOGART</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase leading-tight tracking-[0.15em] font-['Outfit']">MAKES BANDS</span>
              </div>
          </div>
          
          <div className="w-6"></div> {/* Spacer for center alignment */}
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;