/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { InventoryList } from './components/InventoryList';
import { POSRegister } from './components/POSRegister';
import { BarcodeLabelGenerator } from './components/BarcodeLabelGenerator';
import { SalesHistory } from './components/SalesHistory';
import { CreditManagement } from './components/CreditManagement';
import { ExpenseTracker } from './components/ExpenseTracker';
import { ReportsCenter } from './components/ReportsCenter';
import { UserRoleManager } from './components/UserRoleManager';
import { AuditLogViewer } from './components/AuditLogViewer';
import { SettingsView } from './components/SettingsView';
import { CheckoutPage } from './components/CheckoutPage';
import { AuthAnimationPage } from './components/AuthAnimationPage';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { DuplicateScanModal } from './components/DuplicateScanModal';
import { UserPinModal } from './components/UserPinModal';
import { MasterPasscodeModal } from './components/MasterPasscodeModal';
import { ToastContainer } from './components/ToastContainer';
import { MobileBottomNav } from './components/MobileBottomNav';

const MainLayout: React.FC = () => {
  const { activeTab, isAuthenticated } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // If user is not authenticated (logged out), render the AuthAnimationPage with Sappy logo as primary screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen min-h-[100dvh] relative selection:bg-emerald-500 selection:text-slate-950">
        <AuthAnimationPage />
        <ToastContainer />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'inventory':
        return <InventoryList />;
      case 'pos':
        return <POSRegister />;
      case 'checkout':
        return <CheckoutPage />;
      case 'labels':
        return <BarcodeLabelGenerator />;
      case 'sales':
        return <SalesHistory />;
      case 'credit':
        return <CreditManagement />;
      case 'expenses':
        return <ExpenseTracker />;
      case 'reports':
        return <ReportsCenter />;
      case 'users':
        return <UserRoleManager />;
      case 'logs':
        return <AuditLogViewer />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] h-screen h-[100dvh] bg-[#f5f1e8] text-slate-800 flex flex-col font-sans antialiased selection:bg-[#064e3b] selection:text-white print:bg-white print:h-auto print:min-h-0 print:overflow-visible print:block">
      {/* Top Navbar with mobile hamburger toggle */}
      <Navbar 
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative w-full print:block print:overflow-visible">
        {/* Responsive Sidebar (desktop sticky + mobile/tablet sliding drawer) */}
        <Sidebar 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Content Main Area */}
        <main className="flex-1 overflow-y-auto min-h-0 w-full bg-[#f5f1e8] p-3 sm:p-5 lg:p-6 print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full print:p-0 print:m-0 pb-28 lg:pb-8">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <MobileBottomNav 
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Global Interactive Overlays */}
      <div className="print:hidden">
        <BarcodeScannerModal />
        <DuplicateScanModal />
        <MasterPasscodeModal />
        <ToastContainer />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
