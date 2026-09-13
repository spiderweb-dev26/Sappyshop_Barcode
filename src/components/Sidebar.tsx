import React, { useState } from 'react';
import { useApp, NavigationTab } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Boxes, 
  ShoppingCart, 
  Receipt, 
  CreditCard,
  TrendingDown, 
  Barcode, 
  BarChart3, 
  Users, 
  ScrollText, 
  Settings,
  Lock,
  LogOut,
  X,
  Sun,
  Moon,
  Keyboard
} from 'lucide-react';
import { SappyLogoMark } from './SappyLogo';
import { UserPinModal } from './UserPinModal';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isMobileOpen = false, 
  onCloseMobile 
}) => {
  const { 
    activeTab, 
    setActiveTab, 
    items, 
    cart, 
    sales,
    users,
    currentUser, 
    logoutUser,
    activeShift,
    parkedOrders,
    themeMode,
    toggleThemeMode,
    setIsShortcutsModalOpen
  } = useApp();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const lowStockCount = (items || []).filter(i => i && (i.stock || 0) <= (i.minStockAlert || 0)).length;
  const cartItemCount = (cart || []).reduce((acc, c) => acc + (c?.quantity || 0), 0);
  const unpaidCreditsCount = (sales || []).filter(s => s && s.status !== 'REFUNDED' && (s.paymentStatus === 'UNPAID_CREDIT' || (s.paymentStatus === 'PARTIALLY_PAID' && (s.amountPaid || 0) < s.grandTotal))).length;
  const pendingApprovalsCount = (users || []).filter(u => u && u.approvalStatus === 'PENDING').length;

  interface NavItem {
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    allowedRoles: ('ADMIN' | 'MANAGER' | 'CASHIER' | 'AUDITOR')[];
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR'],
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      badgeColor: 'bg-amber-400 text-slate-900',
      allowedRoles: ['ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR'],
    },
    {
      id: 'pos',
      label: 'POS Register',
      icon: ShoppingCart,
      badge: (parkedOrders && parkedOrders.length > 0)
        ? `${parkedOrders.length} Held`
        : (cartItemCount > 0 ? `${cartItemCount}` : undefined),
      badgeColor: (parkedOrders && parkedOrders.length > 0) ? 'bg-amber-400 text-amber-950 font-bold' : 'bg-rose-500 text-white',
      allowedRoles: ['ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      id: 'sales',
      label: 'Sales Ledger',
      icon: Receipt,
      allowedRoles: ['ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR'],
    },
    {
      id: 'credit',
      label: 'Credit Tab',
      icon: CreditCard,
      badge: unpaidCreditsCount > 0 ? `${unpaidCreditsCount}` : undefined,
      badgeColor: 'bg-amber-400 text-slate-900',
      allowedRoles: ['ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR'],
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: TrendingDown,
      allowedRoles: ['ADMIN', 'MANAGER', 'AUDITOR'],
    },
    {
      id: 'labels',
      label: 'Barcode Studio',
      icon: Barcode,
      allowedRoles: ['ADMIN', 'MANAGER', 'CASHIER'],
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: BarChart3,
      allowedRoles: ['ADMIN', 'MANAGER', 'AUDITOR'],
    },
    {
      id: 'users',
      label: 'Staff & Roles',
      icon: Users,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
      badgeColor: 'bg-amber-400 text-amber-950 font-bold',
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'logs',
      label: 'Activity Logs',
      icon: ScrollText,
      allowedRoles: ['ADMIN', 'MANAGER', 'AUDITOR'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      allowedRoles: ['ADMIN'],
    },
  ];

  const handleSelectNav = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <aside className="w-64 lg:w-56 bg-[#064e3b] text-white flex flex-col shrink-0 select-none h-full max-h-full p-2.5 sm:p-3 justify-between border-r border-[#043b2c] shadow-xl lg:shadow-none overflow-hidden">
      {/* Top Section: Logo Emblem & Access Scope */}
      <div className="shrink-0">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-emerald-900/90 rounded-xl border border-emerald-600/50 shadow-inner shrink-0">
              <SappyLogoMark size={26} color="#6ee7b7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-xs text-white tracking-wider">SAPPY</p>
                <span className="text-[8px] font-mono font-bold bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded border border-emerald-600/40 uppercase">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[9px] text-emerald-200/80 font-serif italic truncate">stationery &amp; printing.</p>
            </div>
          </div>

          {/* Close button for Mobile/Tablet overlay drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation List - Scrollable if screen height is constrained, fits screen on standard laptops/PCs */}
      <nav className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-0.5 sm:space-y-1 scrollbar-thin">
        {navItems.map((item) => {
          const isAllowed = item.allowedRoles.includes(currentUser.role);
          const isActive = activeTab === item.id || (item.id === 'pos' && activeTab === 'checkout');
          const Icon = item.icon;

          if (!isAllowed) {
            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-2.5 py-1.5 text-emerald-300/30 text-xs font-medium cursor-not-allowed rounded-lg"
                title={`Requires ${item.allowedRoles.join(' or ')} role`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 opacity-30 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <Lock className="w-3 h-3 text-emerald-300/25 shrink-0" />
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium transition-all duration-150 rounded-lg cursor-pointer ${
                isActive
                  ? 'bg-[#fdfbf7] text-[#064e3b] font-bold shadow-sm'
                  : 'text-emerald-100/85 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#064e3b]' : 'text-emerald-300'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shadow-xs shrink-0 ${item.badgeColor || 'bg-emerald-800 text-emerald-100'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section: Shift Status, Download App Sign, Tools, & User Card */}
      <div className="mt-2 pt-2 border-t border-emerald-800/80 space-y-1.5 shrink-0">
        {/* Register Shift Status Indicator */}
        {activeShift ? (
          <div 
            onClick={() => {
              setActiveTab('pos');
              if (onCloseMobile) onCloseMobile();
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-between text-[11px] cursor-pointer hover:bg-emerald-950 transition-colors"
            title="Active Register Shift - Click to view in POS"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-emerald-200 text-[10px] font-medium truncate">Shift #{activeShift.shiftNumber} Active</span>
            </div>
            <span className="text-[9px] text-emerald-400 font-mono font-bold shrink-0">OPEN</span>
          </div>
        ) : (
          <div 
            onClick={() => {
              setActiveTab('pos');
              if (onCloseMobile) onCloseMobile();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-700/50 flex items-center justify-between text-[11px] cursor-pointer hover:bg-slate-900 transition-colors"
            title="Register is closed - Click to open shift in POS"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="text-slate-300 text-[10px] font-medium truncate">Register Closed</span>
            </div>
            <span className="text-[9px] text-amber-300 font-bold hover:underline shrink-0">Open Shift</span>
          </div>
        )}

        {/* Utility row: Download App Sign (hover explains purpose) + Theme + Shortcuts */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          {/* Download App Sign with hover explanation tooltip card */}
          <PWAInstallButton variant="sign" />

          <div className="flex items-center gap-1">
            {/* Theme Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleThemeMode}
              className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 hover:text-white transition-colors cursor-pointer"
              title={themeMode === 'dark' ? 'Dark Mode Active: Click to switch to Light Mode' : 'Light Mode Active: Click to switch to Dim Store Dark Mode'}
              aria-label="Toggle Theme Mode"
            >
              {themeMode === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-emerald-300" />
              )}
            </button>

            {/* Desktop Keyboard Shortcuts Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                setIsShortcutsModalOpen(true);
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 hover:text-white transition-colors cursor-pointer"
              title="Cashier Keyboard Shortcuts (F1)"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* User Profile Card & Quick Logout */}
        <div className="p-1.5 rounded-xl bg-[#043b2c] border border-emerald-800/70 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setIsPinModalOpen(true);
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex items-center gap-2 min-w-0 flex-1 text-left group hover:opacity-90 transition-opacity cursor-pointer"
            title="Switch User Profile"
          >
            <div className={`w-7 h-7 rounded-full ${currentUser?.avatarColor || 'bg-emerald-700'} border border-emerald-500/50 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs overflow-hidden`}>
              {currentUser?.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <span>{currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'ST'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-emerald-50 truncate leading-tight group-hover:text-emerald-200 transition-colors">
                {currentUser?.name || 'Staff User'}
              </p>
              <span className="text-[9px] text-emerald-300/80 font-mono uppercase">
                {currentUser?.role || 'STAFF'}
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              logoutUser();
              if (onCloseMobile) onCloseMobile();
            }}
            className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 hover:text-rose-100 transition-colors shrink-0 cursor-pointer"
            title="Log Out of System"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Hidden on Mobile, Tablet, & Print) */}
      <div className="hidden lg:flex shrink-0 h-full max-h-full print:hidden">
        {sidebarContent}
      </div>

      {/* Mobile & Tablet Drawer with Backdrop Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-200 print:hidden">
          {/* Backdrop Blur & Dim */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Off-canvas Sliding Container */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#064e3b] z-10 animate-in slide-in-from-left duration-250 h-full overflow-hidden shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Pin modal trigger */}
      {isPinModalOpen && (
        <UserPinModal onClose={() => setIsPinModalOpen(false)} />
      )}
    </>
  );
};
