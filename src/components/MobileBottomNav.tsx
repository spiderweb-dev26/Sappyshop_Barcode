import React from 'react';
import { useApp, NavigationTab } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Boxes, 
  ShoppingBag, 
  Receipt, 
  Menu
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  onOpenMobileSidebar, 
  isMobileSidebarOpen 
}) => {
  const { activeTab, setActiveTab, cart } = useApp();

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems: { tab: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tab: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { tab: 'inventory', label: 'Inventory', icon: Boxes },
    { tab: 'pos', label: 'POS Register', icon: ShoppingBag },
    { tab: 'sales', label: 'Sales', icon: Receipt },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fdfbf7]/95 backdrop-blur-md border-t border-[#dfd7c7] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around print:hidden"
    >
      {navItems.map(({ tab, label, icon: Icon }) => {
        const isActive = activeTab === tab;
        const isPos = tab === 'pos';

        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all relative min-h-[46px] ${
              isActive 
                ? 'text-[#064e3b] font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-[#064e3b]' : ''}`} />
              {isPos && cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[1.15rem] h-[1.15rem] px-1 bg-rose-600 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-[#064e3b]' : 'font-medium'}`}>
              {label}
            </span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#064e3b] mt-0.5" />
            )}
          </button>
        );
      })}

      {/* Menu Drawer Toggle */}
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all min-h-[46px] ${
          isMobileSidebarOpen 
            ? 'text-[#064e3b] font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-medium tracking-tight mt-0.5">
          All Tabs
        </span>
      </button>
    </nav>
  );
};
