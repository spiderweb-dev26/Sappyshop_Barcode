import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ParkedOrder } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { 
  PauseCircle, 
  PlayCircle, 
  Trash2, 
  Clock, 
  User, 
  X, 
  ShoppingBag, 
  AlertCircle,
  Plus
} from 'lucide-react';

interface ParkedOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRecallSuccess?: () => void;
}

export const ParkedOrdersDrawer: React.FC<ParkedOrdersDrawerProps> = ({
  isOpen,
  onClose,
  onRecallSuccess
}) => {
  const { 
    parkedOrders, 
    cart, 
    parkOrder, 
    recallOrder, 
    discardParkedOrder, 
    settings, 
    addToast 
  } = useApp();

  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isParkFormVisible, setIsParkFormVisible] = useState(false);

  if (!isOpen) return null;

  const handleParkCurrentCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      addToast('warning', 'Cart is Empty', 'Cannot park an empty cart.');
      return;
    }

    const name = customerNameInput.trim() || `Customer #${parkedOrders.length + 1}`;
    const success = parkOrder(name, customerPhoneInput.trim() || undefined, notesInput.trim() || undefined);
    if (success) {
      setCustomerNameInput('');
      setCustomerPhoneInput('');
      setNotesInput('');
      setIsParkFormVisible(false);
      onClose();
    }
  };

  const handleRecall = (order: ParkedOrder) => {
    if (cart.length > 0) {
      const confirmReplace = window.confirm(
        `Active cart has ${cart.length} items. Recalling order "${order.orderNumber}" will replace the active cart items. Proceed?`
      );
      if (!confirmReplace) return;
    }

    const ok = recallOrder(order.id);
    if (ok) {
      if (onRecallSuccess) onRecallSuccess();
      onClose();
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Parked Carts & Hold Orders</h3>
              <p className="text-[11px] text-slate-500">
                {parkedOrders.length} order{parkedOrders.length === 1 ? '' : 's'} on hold
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cart.length > 0 && !isParkFormVisible && (
              <button
                type="button"
                onClick={() => setIsParkFormVisible(true)}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Park Current Cart ({cart.length})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Park Current Cart Form (Collapsible) */}
        {isParkFormVisible && (
          <form onSubmit={handleParkCurrentCart} className="p-4 bg-amber-50/60 border-b border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950">Park Active Cart ({cart.length} items)</span>
              <button
                type="button"
                onClick={() => setIsParkFormVisible(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={customerNameInput}
                onChange={(e) => setCustomerNameInput(e.target.value)}
                placeholder="Customer Name or Table/Tag #"
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <input
                type="tel"
                value={customerPhoneInput}
                onChange={(e) => setCustomerPhoneInput(e.target.value)}
                placeholder="Customer Phone (Optional)"
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Reason / Notes (e.g. Fetching more notebooks from shelf)"
              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Confirm & Park Order</span>
            </button>
          </form>
        )}

        {/* Parked Carts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {parkedOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-bold text-slate-600">No Carts on Hold</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                When a customer needs to fetch more items or step away, click "Park Cart" to hold their items while you serve other shoppers.
              </p>
            </div>
          ) : (
            parkedOrders.map((order) => {
              const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0);
              const orderTotal = order.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);

              return (
                <div
                  key={order.id}
                  className="bg-slate-50 border border-slate-200 hover:border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        {order.orderNumber}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">
                        {order.customerName}
                      </h4>
                      {order.customerPhone && (
                        <span className="text-[10px] text-slate-400">({order.customerPhone})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {getTimeAgo(order.createdAt)}
                      </span>
                      <span>•</span>
                      <span>{totalItems} item{totalItems === 1 ? '' : 's'}</span>
                      <span>•</span>
                      <span className="font-bold font-mono text-slate-700">
                        {formatCurrency(orderTotal, settings.currencySymbol)}
                      </span>
                    </div>

                    {order.notes && (
                      <p className="text-[10px] text-slate-400 italic">
                        "{order.notes}"
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 truncate max-w-xs">
                      {order.items.map(i => `${i.quantity}x ${i.item.name}`).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRecall(order)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Recall Cart</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Discard held order ${order.orderNumber}?`)) {
                          discardParkedOrder(order.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Discard ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
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
