/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { POSRegister } from './components/POSRegister';
import { CheckoutPage } from './components/CheckoutPage';
import { AuthAnimationPage } from './components/AuthAnimationPage';
import { DuplicateScanModal } from './components/DuplicateScanModal';
import { MasterPasscodeModal } from './components/MasterPasscodeModal';
import { ToastContainer } from './components/ToastContainer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { WelcomeAnimation } from './components/WelcomeAnimation';

// Code-split heavy secondary components to minimize initial mobile bundle size
const InventoryList = React.lazy(() => import('./components/InventoryList').then(m => ({ default: m.InventoryList })));
const BarcodeLabelGenerator = React.lazy(() => import('./components/BarcodeLabelGenerator').then(m => ({ default: m.BarcodeLabelGenerator })));
const SalesHistory = React.lazy(() => import('./components/SalesHistory').then(m => ({ default: m.SalesHistory })));
const CreditManagement = React.lazy(() => import('./components/CreditManagement').then(m => ({ default: m.CreditManagement })));
const ExpenseTracker = React.lazy(() => import('./components/ExpenseTracker').then(m => ({ default: m.ExpenseTracker })));
const ReportsCenter = React.lazy(() => import('./components/ReportsCenter').then(m => ({ default: m.ReportsCenter })));
const UserRoleManager = React.lazy(() => import('./components/UserRoleManager').then(m => ({ default: m.UserRoleManager })));
const AuditLogViewer = React.lazy(() => import('./components/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const SettingsView = React.lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const BarcodeScannerModal = React.lazy(() => import('./components/BarcodeScannerModal').then(m => ({ default: m.BarcodeScannerModal })));

const ModuleLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-emerald-800">
    <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-bold text-slate-500 mt-3 uppercase tracking-wider">Loading Module...</span>
  </div>
);

const MainLayout: React.FC = () => {
  const { activeTab, isAuthenticated, welcomeUser, clearWelcomeUser, settings } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // If user is not authenticated (logged out), render the AuthAnimationPage with Sappy logo as primary screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen min-h-[100dvh] relative selection:bg-emerald-500 selection:text-slate-950">
        <AuthAnimationPage />
        {welcomeUser && (
          <WelcomeAnimation
            user={welcomeUser}
            onComplete={clearWelcomeUser}
            enableSound={settings.enableSoundEffects ?? true}
          />
        )}
        <ToastContainer />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'inventory':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <InventoryList />
          </Suspense>
        );
      case 'pos':
        return <POSRegister />;
      case 'checkout':
        return <CheckoutPage />;
      case 'labels':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <BarcodeLabelGenerator />
          </Suspense>
        );
      case 'sales':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <SalesHistory />
          </Suspense>
        );
      case 'credit':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <CreditManagement />
          </Suspense>
        );
      case 'expenses':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <ExpenseTracker />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <ReportsCenter />
          </Suspense>
        );
      case 'users':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <UserRoleManager />
          </Suspense>
        );
      case 'logs':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <AuditLogViewer />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<ModuleLoadingFallback />}>
            <SettingsView />
          </Suspense>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] h-screen h-[100dvh] bg-[#f5f1e8] text-slate-800 flex flex-col font-sans antialiased selection:bg-[#064e3b] selection:text-white print:bg-white print:h-auto print:min-h-0 print:overflow-visible print:block">
      {/* Welcome Animation overlay on Login / Operator Switch */}
      {welcomeUser && (
        <WelcomeAnimation
          user={welcomeUser}
          onComplete={clearWelcomeUser}
          enableSound={settings.enableSoundEffects ?? true}
        />
      )}

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

      {/* Offline Status Floating Pill */}
      <OfflineIndicator />

      {/* Global Interactive Overlays */}
      <div className="print:hidden">
        <Suspense fallback={null}>
          <BarcodeScannerModal />
        </Suspense>
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
