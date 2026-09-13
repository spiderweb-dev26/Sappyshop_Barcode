import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  X, 
  Check, 
  Search 
} from 'lucide-react';

interface SuppliersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuppliersModal: React.FC<SuppliersModalProps> = ({
  isOpen,
  onClose
}) => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson || '');
    setPhone(s.phone);
    setEmail(s.email || '');
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      addToast('error', 'Required Fields', 'Please enter company name and telephone.');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined
      });
      addToast('success', 'Supplier Updated', `${name} details updated.`);
    } else {
      addSupplier({
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined
      });
      addToast('success', 'Supplier Added', `Added ${name} to vendor directory.`);
    }

    setIsFormOpen(false);
  };

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchTerm.trim().toLowerCase();
    return !q ||
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson || '').toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.address || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-emerald-300 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Stationery Suppliers & Vendors</h3>
              <p className="text-[11px] text-emerald-300">
                {suppliers.length} authorized supplier partners
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isFormOpen && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Supplier</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-emerald-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-4 bg-emerald-50/50 border-b border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950">
                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'New Supplier Registration'}
              </span>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Addis Paper & Boards Factory"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Ato Solomon Tadesse"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Telephone / Mobile *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +251 91 142 8890"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. orders@addispaper.et"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Physical Address / Warehouse Location</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Mercato Commercial Center, Shop #402"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Product Lines / Terms Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Supplies A4 Reams, Photocopy Paper, 30 days payment credit"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                {editingSupplier ? 'Save Changes' : 'Register Supplier'}
              </button>
            </div>
          </form>
        )}

        {/* Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search suppliers by name, phone, or location..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Suppliers Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-bold text-slate-600">No Suppliers Found</p>
              <p className="text-[11px] text-slate-400 mt-1">Register suppliers to streamline stock reordering.</p>
            </div>
          ) : (
            filteredSuppliers.map(s => (
              <div
                key={s.id}
                className="bg-slate-50 hover:bg-emerald-50/30 border border-slate-200 hover:border-emerald-300 rounded-xl p-3.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-900">{s.name}</h4>
                    {s.contactPerson && (
                      <span className="text-[11px] text-slate-500">({s.contactPerson})</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                      <Phone className="w-3 h-3 text-emerald-700" />
                      {s.phone}
                    </span>
                    {s.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {s.email}
                      </span>
                    )}
                    {s.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {s.address}
                      </span>
                    )}
                  </div>

                  {s.notes && (
                    <p className="text-[10px] text-slate-400 italic">
                      "{s.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(s)}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                    title="Edit supplier"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete supplier ${s.name}?`)) {
                        deleteSupplier(s.id);
                        addToast('info', 'Supplier Removed', `${s.name} deleted.`);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                    title="Delete supplier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
