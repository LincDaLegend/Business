import React, { useState, useMemo } from 'react';
import { Customer, Sale } from '../types.ts';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  X,
  Edit2,
  Trash2
} from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  sales: Sale[];
}

const Customers: React.FC<CustomersProps> = ({ customers, setCustomers, sales }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    tags: ''
  });

  const enrichedCustomers = useMemo(() => {
    return customers.map(customer => {
      const customerSales = sales.filter(s => 
        s.customerName.toLowerCase() === customer.name.toLowerCase() ||
        s.customerId === customer.id
      );
      return {
        ...customer,
        totalPurchases: customerSales.length,
        totalSpent: customerSales.reduce((sum, s) => sum + s.totalAmount, 0),
        lastPurchaseDate: customerSales.length > 0 
          ? customerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : undefined
      };
    });
  }, [customers, sales]);

  const filteredCustomers = enrichedCustomers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const potentialCustomers = useMemo(() => {
    const existingNames = new Set(customers.map(c => c.name.toLowerCase()));
    const salesCustomers = new Map<string, { name: string; count: number; total: number }>();
    
    sales.forEach(sale => {
      const name = sale.customerName;
      if (!existingNames.has(name.toLowerCase())) {
        const existing = salesCustomers.get(name.toLowerCase());
        if (existing) {
          existing.count++;
          existing.total += sale.totalAmount;
        } else {
          salesCustomers.set(name.toLowerCase(), { name, count: 1, total: sale.totalAmount });
        }
      }
    });
    
    return Array.from(salesCustomers.values()).sort((a, b) => b.total - a.total);
  }, [customers, sales]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCustomer) {
      setCustomers(customers.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) }
          : c
      ));
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        totalPurchases: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString()
      };
      setCustomers([...customers, newCustomer]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '', notes: '', tags: '' });
    setEditingCustomer(null);
    setShowModal(false);
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
      tags: customer.tags?.join(', ') || ''
    });
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      setCustomers(customers.filter(c => c.id !== id));
      setSelectedCustomer(null);
    }
  };

  const handleQuickAdd = (name: string) => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name,
      totalPurchases: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };
    setCustomers([...customers, newCustomer]);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your customer relationships</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm"
        />
      </div>

      {/* Quick Add from Sales */}
      {potentialCustomers.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers from Sales (not in CRM)
          </h3>
          <div className="flex flex-wrap gap-2">
            {potentialCustomers.slice(0, 5).map((pc, i) => (
              <button
                key={i}
                onClick={() => handleQuickAdd(pc.name)}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-sm border border-amber-200 hover:border-brand-600 hover:shadow-sm transition-all"
              >
                <Plus className="w-3 h-3 text-brand-600" />
                <span className="font-medium text-gray-700">{pc.name}</span>
                <span className="text-xs text-gray-400">₱{pc.total.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                  {customer.email && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {customer.email}
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">Total Spent</p>
                <p className="font-semibold text-brand-600">₱{customer.totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">Purchases</p>
                <p className="font-semibold text-gray-900">{customer.totalPurchases}</p>
              </div>
            </div>

            {customer.tags && customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4">
                {customer.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="font-semibold text-gray-500">No customers found</p>
          <p className="text-sm text-gray-400 mt-1">Add your first customer to get started</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#552583]/20 focus:border-[#552583]"
                  placeholder="Customer name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#552583]/20 focus:border-[#552583]"
                  placeholder="Shipping address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#552583]/20 focus:border-[#552583]"
                  placeholder="VIP, Repeat, Wholesale (comma separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#552583]/20 focus:border-[#552583] resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
                >
                  {editingCustomer ? 'Update' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                    <p className="text-sm text-gray-400">Customer since {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {selectedCustomer.email}
                  </div>
                )}
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedCustomer.phone}
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {selectedCustomer.address}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-brand-600 rounded-xl p-4 text-white">
                  <p className="text-xs text-white/70 mb-1">Total Spent</p>
                  <p className="text-xl font-bold">₱{selectedCustomer.totalSpent.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Purchases</p>
                  <p className="text-xl font-bold text-gray-900">{selectedCustomer.totalPurchases}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Avg Order</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₱{selectedCustomer.totalPurchases > 0 
                      ? Math.round(selectedCustomer.totalSpent / selectedCustomer.totalPurchases).toLocaleString() 
                      : 0}
                  </p>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setSelectedCustomer(null); handleEdit(selectedCustomer); }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedCustomer.id)}
                  className="py-3 px-5 border border-red-200 text-red-500 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
