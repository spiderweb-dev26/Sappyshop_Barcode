import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Settings as SettingsIcon, 
  Database, 
  Download, 
  Upload, 
  ShieldAlert,
  AlertTriangle,
  CalendarCheck,
  Trash2,
  X,
  Package,
  BookOpen,
  DollarSign,
  Lock,
  KeyRound,
  ShieldCheck,
  Cloud,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { MASTER_PASSCODE } from '../types';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    items, 
    sales, 
    expenses, 
    users, 
    logs, 
    movements, 
    fullResetSystem,
    yearEndReset,
    hasPermission, 
    addToast,
    requestMasterAuth,
    cloudSyncStatus,
    syncToCloudNow,
    updateSettings,
    currentUser,
    updateUserPin
  } = useApp();

  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  // Custom PIN Management
  const [selectedUserForPin, setSelectedUserForPin] = useState<string>(currentUser?.id || '');
  const [newPinValue, setNewPinValue] = useState<string>('');
  const [confirmPinValue, setConfirmPinValue] = useState<string>('');
  const [showPinValue, setShowPinValue] = useState<boolean>(false);
  const [pinChangeError, setPinChangeError] = useState<string>('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string>('');

  const handleSetUserPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');
    setPinChangeSuccess('');
    const clean = newPinValue.replace(/\D/g, '').trim();
    const cleanConfirm = confirmPinValue.replace(/\D/g, '').trim();
    if (clean.length < 4) {
      setPinChangeError('PIN must be at least 4 digits (numbers 0-9).');
      return;
    }
    if (clean !== cleanConfirm) {
      setPinChangeError('PIN confirmation does not match. Please enter the same digits.');
      return;
    }

    updateUserPin(selectedUserForPin, clean);
    setNewPinValue('');
    setConfirmPinValue('');
    const target = users.find(u => u.id === selectedUserForPin);
    const msg = `Security PIN for ${target?.name || 'User'} has been updated to ${clean} and saved!`;
    setPinChangeSuccess(msg);
    addToast('success', 'PIN Updated', msg);
  };

  // Modals for Resets
  const [isFullResetModalOpen, setIsFullResetModalOpen] = useState(false);
  const [fullResetConfirmationInput, setFullResetConfirmationInput] = useState('');
  const [isYearEndModalOpen, setIsYearEndModalOpen] = useState(false);
  const [yearEndConfirmationInput, setYearEndConfirmationInput] = useState('');

  const unpaidCreditSalesCount = sales.filter(s => (s.paymentStatus === 'UNPAID_CREDIT' || s.paymentMethod === 'CREDIT') && s.status !== 'REFUNDED').length;
  const totalItemsCount = items.length;
  const totalStockUnits = items.reduce((acc, i) => acc + (i.stock || 0), 0);

  // Full Database Backup to JSON
  const handleExportDatabase = () => {
    const payload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      settings,
      items,
      sales,
      expenses,
      users,
      logs,
      movements,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sappy_stationary_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Backup Exported', 'Full application state downloaded safely.');
  };

  // Restore Database from JSON
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.items && parsed.sales && parsed.settings) {
          requestMasterAuth({
            title: 'Database Restore Master Authorization',
            actionName: `Restore Database Snapshot from ${file.name}`,
            description: `Will replace current state with ${parsed.items.length} items, ${parsed.sales.length} sales, and system records.`,
            warning: 'This will overwrite existing active transactions with data from the backup file.',
            onSuccess: () => {
              localStorage.setItem('sappy_stationary_inventory_v1', JSON.stringify(parsed));
              addToast('success', 'Database Restored', 'Reloading application state...');
              setTimeout(() => {
                window.location.reload();
              }, 600);
            }
          });
        } else {
          throw new Error('Invalid backup schema format');
        }
      } catch (err) {
        addToast('error', 'Restore Failed', (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteFullReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullResetConfirmationInput.trim().toUpperCase() !== 'RESET') {
      addToast('error', 'Confirmation Mismatch', 'Please type RESET to confirm full system wipe.');
      return;
    }
    
    setIsFullResetModalOpen(false);
    setFullResetConfirmationInput('');

    requestMasterAuth({
      title: 'Full System Wipe Master Authorization',
      actionName: 'Complete System Wipe & Clean Slate Initialization',
      description: `Irreversible wipe of all ${items.length} inventory products, ${sales.length} sales records, and ${expenses.length} expense logs.`,
      warning: 'CRITICAL: Absolutely all data will be permanently destroyed. This cannot be undone.',
      onSuccess: () => {
        fullResetSystem();
      }
    });
  };

  const handleExecuteYearEndReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (yearEndConfirmationInput.trim().toUpperCase() !== 'CONFIRM') {
      addToast('error', 'Confirmation Mismatch', 'Please type CONFIRM to execute year-end rollover.');
      return;
    }
    
    setIsYearEndModalOpen(false);
    setYearEndConfirmationInput('');

    requestMasterAuth({
      title: 'Fiscal Year-End Rollover Master Authorization',
      actionName: 'Execute Year-End Account Rollover',
      description: `Carrying forward ${totalItemsCount} inventory items & ${unpaidCreditSalesCount} unpaid customer credits. Purging settled sales and past expenses.`,
      warning: 'All settled invoices and prior operating expenses will be archived and purged.',
      onSuccess: () => {
        yearEndReset();
      }
    });
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-md">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                System Preferences & Database Administration
              </h1>
              <p className="text-xs text-slate-500">
                Manage database snapshots, export/restore state, and execute system reset operations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Master Security Passcode Protection Panel */}
      <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-md">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Master Passcode Security Guard</h2>
              <p className="text-[11px] text-slate-500">Enhanced protection for sensitive database, store configuration, and inventory modifications.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Lock className="w-3 h-3" /> ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-700" /> Master Passcode
              </span>
              <span className="px-2 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-emerald-800 text-xs">
                •••••••• (Secured)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              Required when executing irreversible actions or modifying sensitive store records.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-700 text-xs block">
              Protected Sensitive Operations:
            </span>
            <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc pl-4">
              <li>Full System Wipe & Year-End Accounting Rollover</li>
              <li>Item Deletions, Bulk Excel Replacement & Stock Deductions</li>
              <li>Staff User Creation, Role Assignments & PIN Resets</li>
              <li>Sales History Invoices Refund Issuance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Terminal Access & Staff PIN Policy */}
      <div className="bg-white p-4 rounded-lg border border-emerald-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-md">
              <KeyRound className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Terminal Access & Staff PIN Policy</h2>
              <p className="text-[11px] text-slate-500">Configure whether staff and cashiers must enter a 4-digit PIN when switching profiles.</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            settings.requirePinForSwitching 
              ? 'bg-amber-50 text-amber-800 border-amber-300' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}>
            {settings.requirePinForSwitching ? 'PIN REQUIRED' : 'QUICK 1-CLICK (NO PIN)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Require PIN on User Switch</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requirePinForSwitching ?? false}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateSettings({ requirePinForSwitching: val });
                      addToast('info', 'PIN Requirement Updated', val ? '4-Digit PIN is now required to switch user profiles.' : 'One-click profile switching enabled (No PIN required).');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {settings.requirePinForSwitching
                  ? 'Active: Staff must type their 4-digit PIN when switching profiles on the register.'
                  : 'Disabled: Any staff member or admin can switch terminal profiles with a single tap without entering a PIN.'}
              </p>
            </div>
            <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
              Current Mode: <strong className={settings.requirePinForSwitching ? 'text-amber-700' : 'text-emerald-700'}>
                {settings.requirePinForSwitching ? 'Strict PIN Verification' : 'Open Fast Terminal Switching (Recommended)'}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 text-xs block">Default Credentials & Information:</span>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200">
                <span className="text-slate-500">Default Staff PIN:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">1234</span>
              </div>
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200">
                <span className="text-slate-500">Master Passcode:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">{MASTER_PASSCODE}</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-0.5">
                Staff PINs can be customized or reset by Administrators at any time under the <strong>Users</strong> tab.
              </p>
            </div>
          </div>
        </div>

        {/* Set Your Personal Access PIN Section */}
        <div className="pt-3 border-t border-emerald-100">
          <div className="bg-emerald-50/40 rounded-lg border border-emerald-200 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#064e3b] text-white rounded-md">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Set Your Personal Access PIN
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create or change your 4-digit security code for quick register switching.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Lock className="w-3 h-3 text-emerald-700" />
                SHA-256 Encrypted
              </span>
            </div>

            <form onSubmit={handleSetUserPin} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Account selector (defaults to current user) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Account Profile
                  </label>
                  <select
                    value={selectedUserForPin}
                    onChange={(e) => {
                      setSelectedUserForPin(e.target.value);
                      setNewPinValue('');
                      setConfirmPinValue('');
                      setPinChangeError('');
                      setPinChangeSuccess('');
                    }}
                    className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 shadow-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}){u.id === currentUser?.id ? ' — [You]' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {selectedUserForPin === currentUser?.id ? 'Setting your own PIN' : 'Setting PIN for staff user'}
                  </p>
                </div>

                {/* New PIN Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Enter New PIN</label>
                    <button
                      type="button"
                      onClick={() => setShowPinValue(!showPinValue)}
                      className="text-[10px] text-emerald-800 font-medium hover:underline flex items-center gap-0.5"
                    >
                      {showPinValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPinValue ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showPinValue ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 5678"
                    value={newPinValue}
                    onChange={(e) => {
                      setNewPinValue(e.target.value.replace(/\D/g, ''));
                      setPinChangeError('');
                      setPinChangeSuccess('');
                    }}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:border-emerald-600 shadow-xs placeholder:font-sans placeholder:text-xs placeholder:tracking-normal placeholder:text-slate-400"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">At least 4 digits (0-9)</p>
                </div>

                {/* Confirm & Save */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Confirm New PIN</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showPinValue ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Confirm PIN"
                      value={confirmPinValue}
                      onChange={(e) => {
                        setConfirmPinValue(e.target.value.replace(/\D/g, ''));
                        setPinChangeError('');
                        setPinChangeSuccess('');
                      }}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:border-emerald-600 shadow-xs placeholder:font-sans placeholder:text-xs placeholder:tracking-normal placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="submit"
                      disabled={newPinValue.length < 4 || newPinValue !== confirmPinValue}
                      className="h-9 px-3.5 bg-[#064e3b] hover:bg-[#085a44] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save PIN</span>
                    </button>
                  </div>
                  {pinChangeError ? (
                    <p className="text-[10px] font-semibold text-rose-600 mt-1">{pinChangeError}</p>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-1">Re-enter to confirm match</p>
                  )}
                </div>
              </div>

              {pinChangeSuccess && (
                <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{pinChangeSuccess}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Cloud Firestore Database Sync (100% Free Google Cloud Spark Plan) */}
      <div className="bg-white p-4 rounded-lg border border-emerald-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-800" />
            <div>
              <h2 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Cloud Database (Google Firestore)</h2>
              <p className="text-[11px] text-slate-500">Persistent, zero-cost cloud storage for items, transactions, and staff accounts.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
              {cloudSyncStatus === 'synced' ? 'Online & Synced' : cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Connected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-md bg-[#fdfbf7] border border-[#dfd7c7] space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cloud Tier</span>
            <p className="text-sm font-bold text-emerald-900">100% Free Forever</p>
            <p className="text-[11px] text-slate-600">Google Cloud Spark Plan with 50,000 free daily reads and 20,000 writes.</p>
          </div>

          <div className="p-3 rounded-md bg-[#fdfbf7] border border-[#dfd7c7] space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Synced Entities</span>
            <p className="text-sm font-bold text-slate-900">
              {items.length} Items • {sales.length} Sales • {users.length} Users
            </p>
            <p className="text-[11px] text-slate-600">Instant cross-terminal synchronization via real-time WebSocket listeners.</p>
          </div>

          <div className="p-3 rounded-md bg-[#fdfbf7] border border-[#dfd7c7] flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Manual Force Sync</span>
              <p className="text-[11px] text-slate-600">Push all local inventory and transactions to Firestore now.</p>
            </div>
            <button
              type="button"
              onClick={() => syncToCloudNow()}
              disabled={cloudSyncStatus === 'syncing'}
              className="w-full h-8 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{cloudSyncStatus === 'syncing' ? 'Syncing State...' : 'Sync All To Cloud Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Database Backup & Disaster Recovery (ADMIN only) */}
      {hasPermission(['ADMIN']) && (
        <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Database className="w-4 h-4 text-emerald-800" />
            <h2 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Database Backup & Disaster Recovery</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Export JSON */}
            <div className="p-3 rounded-md border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="font-bold text-xs text-slate-900">Export State Snapshot</h3>
              <p className="text-[11px] text-slate-500">
                Download full JSON snapshot including items, sales history, logs, and users.
              </p>
              <button
                type="button"
                onClick={handleExportDatabase}
                className="w-full h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON Backup</span>
              </button>
            </div>

            {/* Import JSON */}
            <div className="p-3 rounded-md border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="font-bold text-xs text-slate-900">Restore From Backup</h3>
              <p className="text-[11px] text-slate-500">
                Restore application state from a previously saved JSON backup file.
              </p>
              <input
                type="file"
                ref={jsonInputRef}
                onChange={handleImportDatabase}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="w-full h-8 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload JSON Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sappy Stationary Reset Protocols & Danger Zone (ADMIN only) */}
      {hasPermission(['ADMIN']) && (
        <div className="bg-white p-4 rounded-lg border border-rose-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-rose-100">
            <ShieldAlert className="w-4 h-4 text-rose-700" />
            <div>
              <h2 className="font-bold text-xs text-rose-950 uppercase tracking-wider">System Reset Operations</h2>
              <p className="text-[11px] text-rose-700">Administrative tools for year-end accounting rollovers and fresh system resets.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. FULL RESET (REMOVE EVERYTHING) */}
            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/40 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-rose-100 text-rose-800 rounded">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-rose-950">1. Full Reset (Remove Everything)</h3>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Completely wipes the entire stationery catalog, all sales invoices, customer credit records, expenses, stock movements, and resets the audit log.
                </p>
                <div className="pt-2 text-[11px] text-slate-600 space-y-1 border-t border-rose-200/60 font-mono">
                  <div className="flex justify-between">
                    <span>Products to wipe:</span>
                    <strong className="text-rose-700">{items.length} items</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales & credits to wipe:</span>
                    <strong className="text-rose-700">{sales.length} invoices</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses to wipe:</span>
                    <strong className="text-rose-700">{expenses.length} records</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFullResetConfirmationInput('');
                  setIsFullResetModalOpen(true);
                }}
                className="w-full h-8 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Execute Full Reset</span>
              </button>
            </div>

            {/* 2. YEAR END RESET */}
            <div className="p-4 rounded-lg border border-amber-300 bg-amber-50/40 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-amber-100 text-amber-800 rounded">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-amber-950">2. Year End Reset</h3>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Removes completed sales, expenses, and cart while <strong className="font-semibold text-emerald-900">preserving all remaining inventory items</strong> and <strong className="font-semibold text-amber-950">unpaid customer credits</strong>.
                </p>
                <div className="pt-2 text-[11px] text-slate-700 space-y-1 border-t border-amber-200 font-mono">
                  <div className="flex justify-between text-emerald-800">
                    <span>Preserved items in stock:</span>
                    <strong>{totalItemsCount} items ({totalStockUnits} units)</strong>
                  </div>
                  <div className="flex justify-between text-amber-900 font-bold">
                    <span>Preserved unpaid customer credits:</span>
                    <strong>{unpaidCreditSalesCount} credits</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Cleared settled sales & expenses:</span>
                    <span>{sales.length - unpaidCreditSalesCount} sales, {expenses.length} exp</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setYearEndConfirmationInput('');
                  setIsYearEndModalOpen(true);
                }}
                className="w-full h-8 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Execute Year End Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL RESET CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isFullResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg border border-rose-200 shadow-xl max-w-md w-full overflow-hidden text-slate-900">
            <div className="p-3.5 bg-rose-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Confirm Full System Reset</h3>
              </div>
              <button onClick={() => setIsFullResetModalOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteFullReset} className="p-4 space-y-3.5">
              <div className="p-3 bg-rose-50 rounded-md border border-rose-200 text-xs text-rose-900 space-y-1.5">
                <strong className="block font-bold text-rose-950">Warning: Irreversible Data Destruction</strong>
                <p>This action will permanently delete:</p>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-rose-800">
                  <li>All {items.length} inventory products & categories</li>
                  <li>All {sales.length} historical invoices & customer credit records</li>
                  <li>All {expenses.length} operating expense entries</li>
                  <li>All stock movements and ledger logs</li>
                </ul>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Type <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  value={fullResetConfirmationInput}
                  onChange={(e) => setFullResetConfirmationInput(e.target.value)}
                  placeholder="RESET"
                  className="w-full h-8 px-3 bg-slate-50 border border-slate-300 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500 uppercase"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFullResetModalOpen(false)}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fullResetConfirmationInput.trim().toUpperCase() !== 'RESET'}
                  className="h-8 px-4 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe Everything</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* YEAR END RESET CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isYearEndModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg border border-amber-200 shadow-xl max-w-lg w-full overflow-hidden text-slate-900">
            <div className="p-3.5 bg-amber-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-amber-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Execute Year End Reset</h3>
              </div>
              <button onClick={() => setIsYearEndModalOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteYearEndReset} className="p-4 space-y-3.5">
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  You are about to run the annual accounting rollover for <strong>{settings.storeName}</strong>.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200 space-y-1">
                    <strong className="text-emerald-950 font-bold flex items-center gap-1 text-[11px] uppercase">
                      <Package className="w-3.5 h-3.5 text-emerald-700" /> Retained & Carried Over
                    </strong>
                    <ul className="text-[11px] text-emerald-900 space-y-0.5 pl-2 list-disc">
                      <li><strong>{totalItemsCount} Inventory Items</strong> with stock</li>
                      <li><strong>{unpaidCreditSalesCount} Unpaid Credits</strong> (Store tabs)</li>
                      <li>Rollover opening stock audit log</li>
                      <li>Store settings & user credentials</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-100 rounded-md border border-slate-200 space-y-1">
                    <strong className="text-slate-800 font-bold flex items-center gap-1 text-[11px] uppercase">
                      <Trash2 className="w-3.5 h-3.5 text-slate-600" /> Cleared & Reset
                    </strong>
                    <ul className="text-[11px] text-slate-600 space-y-0.5 pl-2 list-disc">
                      <li>{sales.length - unpaidCreditSalesCount} Settled sales history</li>
                      <li>{expenses.length} Operating expenses</li>
                      <li>Current POS cart</li>
                      <li>Prior year stock movements</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Type <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">CONFIRM</span> to proceed:
                </label>
                <input
                  type="text"
                  value={yearEndConfirmationInput}
                  onChange={(e) => setYearEndConfirmationInput(e.target.value)}
                  placeholder="CONFIRM"
                  className="w-full h-8 px-3 bg-slate-50 border border-slate-300 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsYearEndModalOpen(false)}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={yearEndConfirmationInput.trim().toUpperCase() !== 'CONFIRM'}
                  className="h-8 px-4 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Confirm Year End Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
