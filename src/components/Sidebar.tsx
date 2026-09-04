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
  X
} from 'lucide-react';
import { SappyLogoMark } from './SappyLogo';
import { UserPinModal } from './UserPinModal';

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
    logoutUser
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
      badge: cartItemCount > 0 ? `${cartItemCount}` : undefined,
      badgeColor: 'bg-rose-500 text-white',
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
    <aside className="w-64 lg:w-56 bg-[#064e3b] text-white flex flex-col shrink-0 select-none min-h-full p-4 justify-between border-r border-[#043b2c] shadow-xl lg:shadow-none overflow-y-auto">
      {/* Top Logo Emblem & Mobile Close */}
      <div>
        <div className="flex items-center justify-between py-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/80 rounded-2xl border border-emerald-600/50 shadow-inner">
              <SappyLogoMark size={34} color="#6ee7b7" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-white tracking-wide">SAPPY</p>
              <p className="text-[10px] text-emerald-200 font-serif italic">stationery &amp; printing.</p>
            </div>
          </div>

          {/* Close button for Mobile/Tablet overlay drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Scope Banner */}
        <div className="p-2.5 mb-3 bg-[#043b2c] rounded-xl border border-emerald-800/80 flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Access Scope</span>
          <span className="text-[9px] font-mono font-bold bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded border border-emerald-600/50">
            {currentUser.role}
          </span>
        </div>

        {/* Navigation List matching modern pill design in emerald theme */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isAllowed = item.allowedRoles.includes(currentUser.role);
            const isActive = activeTab === item.id || (item.id === 'pos' && activeTab === 'checkout');
            const Icon = item.icon;

            if (!isAllowed) {
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3.5 py-2 text-emerald-300/30 text-xs font-medium cursor-not-allowed rounded-full"
                  title={`Requires ${item.allowedRoles.join(' or ')} role`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 opacity-30" />
                    <span>{item.label}</span>
                  </div>
                  <Lock className="w-3 h-3 text-emerald-300/25" />
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition-all duration-150 rounded-full ${
                  isActive
                    ? 'bg-[#fdfbf7] text-[#064e3b] font-bold shadow-md scale-[1.02]'
                    : 'text-emerald-100/85 hover:text-white hover:bg-emerald-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#064e3b]' : 'text-emerald-300'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shadow-xs ${item.badgeColor || 'bg-emerald-800 text-emerald-100'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Card & Logout in Sidebar */}
      <div className="mt-4 pt-3 border-t border-emerald-800/80 space-y-2">
        <div className="p-2 rounded-2xl bg-[#043b2c] border border-emerald-800/60 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setIsPinModalOpen(true);
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left group hover:opacity-90 transition-opacity"
            title="Switch User Profile"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-500/50 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-emerald-50 truncate leading-tight group-hover:text-emerald-200 transition-colors">
                {currentUser?.name || 'Staff User'}
              </p>
              <span className="text-[10px] text-emerald-300/80 font-mono uppercase">
                {currentUser?.role || 'STAFF'}
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              logoutUser();
              if (onCloseMobile) onCloseMobile();
            }}
            className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 hover:text-rose-100 transition-colors shrink-0"
            title="Log Out of System"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Hidden on Mobile, Tablet, & Print) */}
      <div className="hidden lg:flex shrink-0 min-h-[calc(100vh-4rem)] print:hidden">
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
