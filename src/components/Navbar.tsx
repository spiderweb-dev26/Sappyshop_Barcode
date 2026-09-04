import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  Camera, 
  Calendar, 
  Menu,
  X,
  UserCheck,
  ShoppingBag,
  ArrowRight,
  LogOut,
  Cloud,
  RefreshCw
} from 'lucide-react';
import { UserPinModal } from './UserPinModal';
import { SappyLogoMark } from './SappyLogo';
import { formatCurrency } from '../utils/currencyUtils';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onToggleMobileSidebar,
  isMobileSidebarOpen 
}) => {
  const { 
    settings,
    currentUser, 
    users,
    items,
    cart,
    setActiveTab,
    setIsScannerModalOpen,
    handleBarcodeScanned,
    logoutUser,
    cloudSyncStatus,
    syncToCloudNow
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  const cartItemCount = (cart || []).reduce((acc, c) => acc + (c?.quantity || 0), 0);

  const filteredSearchItems = searchQuery.trim()
    ? (items || []).filter(
        i =>
          i && (
            (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (i.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (i.barcode || '').includes(searchQuery) ||
            (i.category || '').toLowerCase().includes(searchQuery.toLowerCase())
          )
      ).slice(0, 6)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const scanned = handleBarcodeScanned(searchQuery.trim());
    if (scanned) {
      setSearchQuery('');
      setShowSearchResults(false);
      setIsMobileSearchExpanded(false);
    }
  };

  return (
    <>
      <header className="bg-[#fdfbf7] text-slate-800 sticky top-0 z-40 border-b border-[#dfd7c7] shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Mobile Menu Trigger + Logo and Branding */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile / Tablet Sidebar Hamburger Button */}
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl bg-[#f8f4ec] hover:bg-[#eee7db] text-[#064e3b] border border-[#dfd7c7] transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Toggle menu"
            >
              {isMobileSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Brand Logo Link */}
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 sm:gap-3 text-left focus:outline-none group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#064e3b] flex items-center justify-center p-1.5 shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <SappyLogoMark size={24} color="#ffffff" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-base text-slate-900 tracking-tight">
                    SAPPY <span className="text-[#064e3b]">STATIONERY</span>
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-[#064e3b] px-1.5 py-0.2 rounded font-mono font-bold uppercase hidden md:inline-block">
                    POS
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-serif italic leading-none">
                  stationery &amp; printing.
                </p>
              </div>
            </button>
          </div>

          {/* Center: Search Bar (Desktop / Tablet) */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-emerald-800/70" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search catalog, barcodes, SKUs..."
                className="w-full h-9 pl-9 pr-18 bg-[#f8f4ec] border border-[#dfd7c7] rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:bg-[#fdfbf7] font-medium transition-all"
              />
              <div className="absolute inset-y-0 right-1 flex items-center pr-1">
                <button
                  type="button"
                  onClick={() => setIsScannerModalOpen(true)}
                  className="h-7 px-2.5 bg-[#fdfbf7] hover:bg-emerald-50 text-[#064e3b] border border-[#dfd7c7] rounded-full text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Camera className="w-3 h-3 text-[#064e3b]" />
                  <span>Scan</span>
                </button>
              </div>
            </form>

            {/* Quick Search Dropdown (Desktop) */}
            {showSearchResults && filteredSearchItems.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-[#fdfbf7] rounded-2xl shadow-xl border border-[#dfd7c7] text-slate-800 overflow-hidden z-50 animate-in fade-in-50">
                <div className="p-2.5 bg-[#f8f4ec] border-b border-[#dfd7c7] flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">Catalog Results ({filteredSearchItems.length})</span>
                  <button 
                    onClick={() => setShowSearchResults(false)}
                    className="hover:text-slate-900 text-[10px] uppercase font-bold text-emerald-800"
                  >
                    Close
                  </button>
                </div>
                <div className="divide-y divide-[#eee7db] max-h-64 overflow-y-auto">
                  {filteredSearchItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        handleBarcodeScanned(item.barcode);
                        setShowSearchResults(false);
                      }}
                      className="p-2.5 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between transition-colors text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku} | Barcode: {item.barcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">{formatCurrency(item.sellingPrice, settings.currencySymbol)}</p>
                        <span className="text-[10px] text-slate-500">{item.stock} in stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions, Fiscal Year, Quick POS, and User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSearchExpanded(!isMobileSearchExpanded)}
              className="md:hidden p-2 rounded-full bg-[#f8f4ec] hover:bg-[#eee7db] text-[#064e3b] border border-[#dfd7c7] transition-colors"
              aria-label="Open search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Mobile Barcode Scan Button */}
            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="md:hidden p-2 rounded-full bg-[#f8f4ec] hover:bg-emerald-50 text-[#064e3b] border border-[#dfd7c7] transition-colors"
              aria-label="Scan barcode"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Quick POS Cart Pill on Mobile/Tablet */}
            <button
              onClick={() => setActiveTab('pos')}
              className="relative p-2 sm:px-3 sm:py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] border border-emerald-200 transition-colors flex items-center gap-1.5"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-4 h-4 text-[#064e3b]" />
              <span className="hidden sm:inline text-xs font-bold">POS</span>
              {cartItemCount > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Cloud Firestore Status & Quick Sync Pill */}
            <button
              type="button"
              onClick={() => syncToCloudNow()}
              disabled={cloudSyncStatus === 'syncing'}
              className="hidden lg:flex items-center gap-1.5 bg-[#f8f4ec] hover:bg-emerald-50/80 border border-[#dfd7c7] px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 transition-colors"
              title={`Firestore Database: ${cloudSyncStatus}. Click to manually sync now.`}
            >
              {cloudSyncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span className="hidden xl:inline text-[11px] font-bold text-slate-800">
                {cloudSyncStatus === 'synced' ? 'Cloud Synced' : cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Live Firestore'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${cloudSyncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
            </button>

            {/* Fiscal Year Status (Desktop) */}
            <div className="hidden xl:flex items-center gap-2 bg-[#f8f4ec] border border-[#dfd7c7] px-3.5 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5 text-[#064e3b]" />
              <span className="text-xs font-bold text-slate-800 tracking-tight">Fiscal Year 2026</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Pending Approvals Alert for Admin */}
            {currentUser?.role === 'ADMIN' && (users || []).some(u => u?.approvalStatus === 'PENDING') && (
              <button
                onClick={() => setActiveTab('users')}
                className="relative p-2 sm:px-2.5 sm:py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors flex items-center gap-1.5"
                title="Staff account approvals pending review"
              >
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span className="hidden sm:inline text-xs font-bold">Approvals</span>
                <span className="min-w-[1.25rem] h-5 px-1 bg-amber-600 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {(users || []).filter(u => u?.approvalStatus === 'PENDING').length}
                </span>
              </button>
            )}

            {/* User Switch Badge */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPinModalOpen(true)}
                className="flex items-center gap-2 p-1 sm:p-1.5 sm:pr-3 rounded-full hover:bg-[#f8f4ec] border border-[#dfd7c7] transition-colors"
                title="Switch user account"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#064e3b] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  {currentUser?.name ? currentUser.name.slice(0, 1).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden lg:block">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">{currentUser?.name || 'User'}</span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">{currentUser?.role || 'STAFF'}</span>
                </div>
              </button>

              {/* Quick Logout Button */}
              <button
                onClick={() => logoutUser()}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-full hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-[#dfd7c7] hover:border-rose-200 transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Sign out of Sappy POS"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span className="hidden xl:inline text-[11px] font-semibold text-rose-700">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay Bar */}
        {isMobileSearchExpanded && (
          <div className="md:hidden px-3 py-2.5 bg-[#f8f4ec] border-t border-[#dfd7c7] animate-in slide-in-from-top-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, barcodes, SKUs..."
                autoFocus
                className="w-full h-10 pl-9 pr-10 bg-[#fdfbf7] border border-[#dfd7c7] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#064e3b] text-white rounded-lg text-[11px] font-semibold"
              >
                Go
              </button>
            </form>

            {/* Mobile Dropdown Search Results */}
            {filteredSearchItems.length > 0 && (
              <div className="mt-2 bg-[#fdfbf7] rounded-xl border border-[#dfd7c7] divide-y divide-[#eee7db] max-h-48 overflow-y-auto">
                {filteredSearchItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      handleBarcodeScanned(item.barcode);
                      setIsMobileSearchExpanded(false);
                    }}
                    className="p-2.5 active:bg-emerald-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">{formatCurrency(item.sellingPrice, settings.currencySymbol)}</p>
                      <span className="text-[10px] text-slate-500">{item.stock} left</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Switch PIN Modal */}
      {isPinModalOpen && (
        <UserPinModal onClose={() => setIsPinModalOpen(false)} />
      )}
    </>
  );
};
