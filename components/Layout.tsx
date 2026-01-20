import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Menu, 
  X, 
  Receipt, 
  PackageOpen, 
  Truck, 
  Settings, 
  RefreshCw, 
  CloudCheck,
  Sparkles,
  Bell,
  Users,
  BarChart3,
  Calculator,
  FileText,
  Search
} from 'lucide-react';
import NotificationCenter from './NotificationCenter.tsx';
import { Notification } from '../types.ts';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  autoSyncEnabled: boolean;
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  onAnalyze?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  onSync, 
  isSyncing, 
  autoSyncEnabled,
  notifications,
  setNotifications,
  onAnalyze
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'held-orders', label: 'On Hold', icon: PackageOpen, badge: 3 },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'lbc-booking', label: 'Shipping', icon: Truck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 font-['Inter']">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Clean White Design */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-100
        transform transition-transform duration-300 ease-out flex flex-col shadow-sm
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-[70px] flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Bogart</h1>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Business</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="ml-auto lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-brand-400 text-brand-900' : 'bg-brand-100 text-brand-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* AI Card */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand-200" />
              <span className="text-xs font-semibold">AI Insights</span>
            </div>
            <p className="text-[11px] text-brand-100 mb-3">Get smart business recommendations</p>
            <button 
              onClick={onAnalyze}
              className="w-full py-2.5 text-xs font-semibold bg-white text-brand-600 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              Analyze Now
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[70px] bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* Sync Button */}
            {autoSyncEnabled ? (
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${isSyncing ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-medium">Syncing...</span>
                  </>
                ) : (
                  <>
                    <CloudCheck className="w-4 h-4" />
                    <span className="text-xs font-medium">Synced</span>
                  </>
                )}
              </div>
            ) : (
              <button 
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}

            {/* User Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:shadow-md transition-shadow">
              B
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Notification Center */}
      <NotificationCenter
        notifications={notifications}
        setNotifications={setNotifications}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
};

export default Layout;