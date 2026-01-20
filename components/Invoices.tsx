import React, { useState } from 'react';
import { Invoice, Customer } from '../types.ts';
import { generateInvoiceNumber } from '../services/storageService.ts';
import { 
  FileText, 
  Plus, 
  Search, 
  X,
  Send,
  Eye,
  CheckCircle,
  Edit2,
  AlertCircle,
  Trash2
} from 'lucide-react';

interface InvoicesProps {
  invoices: Invoice[];
  setInvoices: (invoices: Invoice[]) => void;
  customers: Customer[];
  sales: any[];
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, setInvoices, customers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]
  });

  const statusStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Edit2 className="w-3 h-3" /> },
    sent: { bg: 'bg-blue-100', text: 'text-blue-600', icon: <Send className="w-3 h-3" /> },
    viewed: { bg: 'bg-purple-100', text: 'text-purple-600', icon: <Eye className="w-3 h-3" /> },
    paid: { bg: 'bg-green-100', text: 'text-green-600', icon: <CheckCircle className="w-3 h-3" /> },
    overdue: { bg: 'bg-red-100', text: 'text-red-600', icon: <AlertCircle className="w-3 h-3" /> }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.12;
    
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(),
      customerId: formData.customerId,
      customerName: formData.customerName,
      items: formData.items,
      subtotal,
      tax,
      total: subtotal + tax,
      status: 'draft',
      dueDate: formData.dueDate,
      createdAt: new Date().toISOString(),
      notes: formData.notes
    };
    
    setInvoices([...invoices, newInvoice]);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      customerName: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });
    setShowModal(false);
  };

  const updateStatus = (id: string, status: Invoice['status']) => {
    setInvoices(invoices.map(inv => 
      inv.id === id 
        ? { ...inv, status, paidAt: status === 'paid' ? new Date().toISOString() : undefined }
        : inv
    ));
  };

  const deleteInvoice = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(inv => inv.id !== id));
      setSelectedInvoice(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage invoices</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 font-medium mb-2">Outstanding</p>
          <p className="text-2xl font-bold text-brand-600">₱{totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 font-medium mb-2">Paid</p>
          <p className="text-2xl font-bold text-green-600">₱{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 font-medium mb-2">Overdue</p>
          <p className="text-2xl font-bold text-red-500">{overdueCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="viewed">Viewed</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-semibold text-brand-600">{invoice.invoiceNumber}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{invoice.customerName}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[invoice.status].bg} ${statusStyles[invoice.status].text}`}>
                    {statusStyles[invoice.status].icon}
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  ₱{invoice.total.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {invoice.status === 'draft' && (
                      <button
                        onClick={() => updateStatus(invoice.id, 'sent')}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                        title="Send"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {invoice.status !== 'paid' && (
                      <button
                        onClick={() => updateStatus(invoice.id, 'paid')}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-lg"
                        title="Mark Paid"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteInvoice(invoice.id)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                  <p className="font-semibold text-gray-500">No invoices found</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first invoice to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">Create Invoice</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    list="customers"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    placeholder="Enter customer name"
                  />
                  <datalist id="customers">
                    {customers.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-brand-600 font-semibold hover:text-brand-700"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                      <span className="w-24 text-sm font-semibold text-gray-900 text-right">
                        ₱{item.total.toLocaleString()}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">₱{formData.items.reduce((sum, i) => sum + i.total, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Tax (12%)</span>
                  <span className="font-medium">₱{(formData.items.reduce((sum, i) => sum + i.total, 0) * 0.12).toLocaleString()}</span>
                </div>
                <div className="h-px bg-gray-200 my-3" />
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-brand-600">
                    ₱{(formData.items.reduce((sum, i) => sum + i.total, 0) * 1.12).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none"
                  placeholder="Payment terms, thank you note..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm shadow-sm"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedInvoice.invoiceNumber}</h2>
                <p className="text-sm text-gray-400">{selectedInvoice.customerName}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${statusStyles[selectedInvoice.status].bg} ${statusStyles[selectedInvoice.status].text}`}>
                  {statusStyles[selectedInvoice.status].icon}
                  {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                </span>
                <p className="text-sm text-gray-500">
                  Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                {selectedInvoice.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description} × {item.quantity}</span>
                    <span className="font-medium text-gray-900">₱{item.total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="h-px bg-gray-200 my-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">₱{selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-medium">₱{selectedInvoice.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-brand-600">₱{selectedInvoice.total.toLocaleString()}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <p className="text-sm text-gray-500 italic">{selectedInvoice.notes}</p>
              )}

              <div className="flex gap-3">
                {selectedInvoice.status !== 'paid' && (
                  <button
                    onClick={() => { updateStatus(selectedInvoice.id, 'paid'); setSelectedInvoice(null); }}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Mark Paid
                  </button>
                )}
                <button
                  onClick={() => deleteInvoice(selectedInvoice.id)}
                  className="py-3 px-5 border border-red-200 text-red-500 rounded-xl font-medium text-sm hover:bg-red-50"
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

export default Invoices;
