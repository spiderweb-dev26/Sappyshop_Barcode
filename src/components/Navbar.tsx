import React, { useState, useRef, useEffect } from 'react';
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
  RefreshCw,
  Sun,
  Moon,
  Keyboard
} from 'lucide-react';
import { UserPinModal } from './UserPinModal';
import { UserProfilePictureModal } from './UserProfilePictureModal';
import { SappyLogoMark } from './SappyLogo';
import { PWAInstallButton } from './PWAInstallButton';
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
    syncToCloudNow,
    themeMode,
    toggleThemeMode,
    setIsShortcutsModalOpen
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isProfilePicModalOpen, setIsProfilePicModalOpen] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreMenuOpen]);

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
      <header className="bg-[#fdfbf7] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 sticky top-0 z-40 border-b border-[#dfd7c7] dark:border-slate-800 shadow-2xs print:hidden transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Mobile Menu Trigger + Logo and Branding */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile / Tablet Sidebar Hamburger Button */}
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl bg-[#f8f4ec] dark:bg-slate-800 hover:bg-[#eee7db] dark:hover:bg-slate-700 text-[#064e3b] dark:text-emerald-400 border border-[#dfd7c7] dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <span className="font-extrabold text-xs sm:text-base text-slate-900 dark:text-slate-100 tracking-tight">
                    SAPPY <span className="text-[#064e3b] dark:text-emerald-400">STATIONERY</span>
                  </span>
                  <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-[#064e3b] dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold uppercase hidden md:inline-block border border-emerald-300/40">
                    POS
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-serif italic leading-none">
                  stationery &amp; printing.
                </p>
              </div>
            </button>
          </div>

          {/* Center: Search Bar (Desktop / Tablet) */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4 text-emerald-800/70 dark:text-emerald-400" />
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
                className="w-full h-9 pl-9 pr-18 bg-[#f8f4ec] dark:bg-slate-800/90 border border-[#dfd7c7] dark:border-slate-700 rounded-full text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:bg-[#fdfbf7] dark:focus:bg-slate-800 font-medium transition-all"
              />
              <div className="absolute inset-y-0 right-1 flex items-center pr-1">
                <button
                  type="button"
                  onClick={() => setIsScannerModalOpen(true)}
                  className="h-7 px-2.5 bg-[#fdfbf7] dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-600 text-[#064e3b] dark:text-emerald-300 border border-[#dfd7c7] dark:border-slate-600 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Camera className="w-3 h-3 text-[#064e3b] dark:text-emerald-400" />
                  <span>Scan</span>
                </button>
              </div>
            </form>

            {/* Quick Search Dropdown (Desktop) */}
            {showSearchResults && filteredSearchItems.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-[#fdfbf7] dark:bg-slate-900 rounded-2xl shadow-xl border border-[#dfd7c7] dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-hidden z-50 animate-in fade-in-50">
                <div className="p-2.5 bg-[#f8f4ec] dark:bg-slate-800 border-b border-[#dfd7c7] dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Catalog Results ({filteredSearchItems.length})</span>
                  <button 
                    onClick={() => setShowSearchResults(false)}
                    className="hover:text-slate-900 dark:hover:text-white text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400"
                  >
                    Close
                  </button>
                </div>
                <div className="divide-y divide-[#eee7db] dark:divide-slate-800 max-h-64 overflow-y-auto">
                  {filteredSearchItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        handleBarcodeScanned(item.barcode);
                        setShowSearchResults(false);
                      }}
                      className="p-2.5 hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">SKU: {item.sku} | Barcode: {item.barcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(item.sellingPrice, settings.currencySymbol)}</p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.stock} in stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions, POS Cart, Approvals, Profile, and More (3 dashes) Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSearchExpanded(!isMobileSearchExpanded)}
              className="md:hidden p-2 rounded-full bg-[#f8f4ec] hover:bg-[#eee7db] text-[#064e3b] border border-[#dfd7c7] transition-colors cursor-pointer"
              aria-label="Open search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Mobile Barcode Scan Button */}
            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="md:hidden p-2 rounded-full bg-[#f8f4ec] hover:bg-emerald-50 text-[#064e3b] border border-[#dfd7c7] transition-colors cursor-pointer"
              aria-label="Scan barcode"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Quick POS Cart Pill */}
            <button
              onClick={() => setActiveTab('pos')}
              className="relative p-2 sm:px-3 sm:py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
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

            {/* Pending Approvals Alert for Admin (Only shown if pending review) */}
            {currentUser?.role === 'ADMIN' && (users || []).some(u => u?.approvalStatus === 'PENDING') && (
              <button
                onClick={() => setActiveTab('users')}
                className="relative p-2 sm:px-2.5 sm:py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/70 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Staff account approvals pending review"
              >
                <UserCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span className="hidden sm:inline text-xs font-bold">Approvals</span>
                <span className="min-w-[1.25rem] h-5 px-1 bg-amber-600 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {(users || []).filter(u => u?.approvalStatus === 'PENDING').length}
                </span>
              </button>
            )}

            {/* User Switch Badge & Profile Photo */}
            <div className="flex items-center rounded-full bg-[#f8f4ec] dark:bg-slate-800 border border-[#dfd7c7] dark:border-slate-700 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setIsProfilePicModalOpen(true)}
                className={`relative group/navavatar w-7 h-7 sm:w-8 sm:h-8 rounded-full ${currentUser?.avatarColor || 'bg-[#064e3b]'} text-white flex items-center justify-center text-xs font-bold overflow-hidden shadow-2xs cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all shrink-0`}
                title="Click to update your profile photo"
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{currentUser?.name ? currentUser.name.slice(0, 1).toUpperCase() : 'U'}</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/navavatar:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 text-left rounded-full hover:bg-[#eee7db] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Switch user account"
              >
                <div className="text-left hidden md:block">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block leading-tight truncate max-w-[100px]">{currentUser?.name || 'User'}</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase">{currentUser?.role || 'STAFF'}</span>
                </div>
              </button>
            </div>

            {/* More Bar (3 Dashes Menu) */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border transition-all duration-150 cursor-pointer shadow-2xs ${
                  isMoreMenuOpen
                    ? 'bg-[#064e3b] text-white border-[#064e3b] dark:bg-emerald-700 dark:border-emerald-600 ring-2 ring-emerald-500/30'
                    : 'bg-[#f8f4ec] hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-[#dfd7c7] dark:border-slate-700'
                }`}
                title="System Tools & Options (3 dashes)"
                aria-label="More options (3 dashes)"
                aria-expanded={isMoreMenuOpen}
              >
                {/* 3 Dashes (Horizontal bars) Icon */}
                <div className="flex flex-col gap-[3px] justify-center items-center w-3.5 h-3.5 shrink-0" aria-hidden="true">
                  <span className={`w-3.5 h-[2px] rounded-full transition-colors ${isMoreMenuOpen ? 'bg-white' : 'bg-slate-700 dark:bg-slate-200'}`}></span>
                  <span className={`w-3.5 h-[2px] rounded-full transition-colors ${isMoreMenuOpen ? 'bg-white' : 'bg-slate-700 dark:bg-slate-200'}`}></span>
                  <span className={`w-3.5 h-[2px] rounded-full transition-colors ${isMoreMenuOpen ? 'bg-white' : 'bg-slate-700 dark:bg-slate-200'}`}></span>
                </div>
                <span className="text-xs font-bold hidden sm:inline">More</span>
              </button>

              {/* More Dropdown Panel */}
              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#fdfbf7] dark:bg-slate-900 rounded-2xl shadow-2xl border border-[#dfd7c7] dark:border-slate-700 p-2.5 z-50 text-slate-800 dark:text-slate-100 animate-in fade-in-50 zoom-in-95 duration-150">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#dfd7c7] dark:border-slate-800 px-1">
                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-col gap-[2px] justify-center items-center w-3 h-3">
                        <span className="w-3 h-[2px] bg-[#064e3b] dark:bg-emerald-400 rounded-full"></span>
                        <span className="w-3 h-[2px] bg-[#064e3b] dark:bg-emerald-400 rounded-full"></span>
                        <span className="w-3 h-[2px] bg-[#064e3b] dark:bg-emerald-400 rounded-full"></span>
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">System &amp; Store Controls</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-[#e8e2d5] dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-[#dfd7c7] dark:border-slate-700">
                      FY 2026
                    </span>
                  </div>

                  {/* Cloud Firestore Status Card & Quick Sync */}
                  <div className="p-2 rounded-xl bg-[#f8f4ec] dark:bg-slate-800/80 border border-[#dfd7c7] dark:border-slate-700/80 mb-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {cloudSyncStatus === 'syncing' ? (
                          <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                        ) : (
                          <Cloud className={`w-4 h-4 shrink-0 ${cloudSyncStatus === 'synced' ? 'text-emerald-700 dark:text-emerald-400' : cloudSyncStatus === 'error' ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">Firestore Cloud</p>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cloudSyncStatus === 'error' ? 'bg-rose-500 animate-pulse' : cloudSyncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {cloudSyncStatus === 'synced' ? 'Synchronized across staff' : cloudSyncStatus === 'syncing' ? 'Syncing updates...' : 'Sync error - tap retry'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => syncToCloudNow()}
                        disabled={cloudSyncStatus === 'syncing'}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#064e3b] hover:bg-[#043e2f] text-white dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <RefreshCw className={`w-3 h-3 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                        <span>Sync</span>
                      </button>
                    </div>
                  </div>

                  {/* Store Lighting Theme Mode */}
                  <button
                    type="button"
                    onClick={toggleThemeMode}
                    className="w-full p-2 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-left cursor-pointer group mb-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                        {themeMode === 'dark' ? (
                          <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
                        ) : (
                          <Moon className="w-4 h-4 text-slate-700" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Store Lighting Theme</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {themeMode === 'dark' ? 'Dim Store Dark Mode Active' : 'Stationery Light Mode Active'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f8f4ec] dark:bg-slate-800 border border-[#dfd7c7] dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      {themeMode === 'dark' ? 'DARK' : 'LIGHT'}
                    </span>
                  </button>

                  {/* Cashier Keyboard Shortcuts */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsShortcutsModalOpen(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full p-2 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-left cursor-pointer mb-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#064e3b] dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Keyboard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Keyboard Shortcuts</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Cashier hotkeys &amp; POS actions</p>
                      </div>
                    </div>
                    <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#e8e2d5] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[#dfd7c7] dark:border-slate-700">
                      F1
                    </kbd>
                  </button>

                  {/* Fiscal Year Accounting Period */}
                  <div className="p-2 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between text-left mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Fiscal Period</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Fiscal Year 2026 (Tax Reporting Active)</p>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  {/* Barcode Camera Scanner */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsScannerModalOpen(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full p-2 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-left cursor-pointer mb-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Camera Barcode Scanner</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Camera 0 (Back facing)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">SCAN</span>
                  </button>

                  {/* Download POS App */}
                  <PWAInstallButton
                    variant="menu-item"
                    onActionComplete={() => setIsMoreMenuOpen(false)}
                  />

                  {/* Divider and Log Out */}
                  <div className="pt-2 mt-1.5 border-t border-[#dfd7c7] dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        logoutUser();
                      }}
                      className="w-full p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 transition-colors flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Sign Out</p>
                          <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80">End session &amp; lock register</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay Bar */}
        {isMobileSearchExpanded && (
          <div className="md:hidden px-3 py-2.5 bg-[#f8f4ec] dark:bg-slate-900 border-t border-[#dfd7c7] dark:border-slate-800 animate-in slide-in-from-top-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, barcodes, SKUs..."
                autoFocus
                className="w-full h-10 pl-9 pr-10 bg-[#fdfbf7] dark:bg-slate-800 border border-[#dfd7c7] dark:border-slate-700 rounded-xl text-[16px] sm:text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#064e3b]"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#064e3b] dark:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold"
              >
                Go
              </button>
            </form>

            {/* Mobile Dropdown Search Results */}
            {filteredSearchItems.length > 0 && (
              <div className="mt-2 bg-[#fdfbf7] dark:bg-slate-800 rounded-xl border border-[#dfd7c7] dark:border-slate-700 divide-y divide-[#eee7db] dark:divide-slate-700 max-h-48 overflow-y-auto">
                {filteredSearchItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      handleBarcodeScanned(item.barcode);
                      setIsMobileSearchExpanded(false);
                    }}
                    className="p-2.5 active:bg-emerald-50 dark:active:bg-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(item.sellingPrice, settings.currencySymbol)}</p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.stock} left</span>
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

      {/* Profile Picture Management Modal */}
      {isProfilePicModalOpen && currentUser && (
        <UserProfilePictureModal
          isOpen={isProfilePicModalOpen}
          onClose={() => setIsProfilePicModalOpen(false)}
          targetUser={currentUser}
        />
      )}
    </>
  );
};
