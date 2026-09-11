import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Key, 
  Trash2, 
  Check, 
  X, 
  Lock, 
  Unlock,
  Eye,
  AlertCircle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  UserCheck
} from 'lucide-react';

export const UserRoleManager: React.FC = () => {
  const { 
    users, 
    currentUser, 
    addUser, 
    approveUser,
    rejectUser,
    updateUserRole, 
    updateUserPin, 
    deleteUser, 
    hasPermission,
    requestMasterAuth 
  } = useApp();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [resetPinUserId, setResetPinUserId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  // Pending approval role overrides
  const [pendingRoleOverrides, setPendingRoleOverrides] = useState<Record<string, UserRole>>({});

  // New user form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [pin, setPin] = useState('1234');
  const [creationStatus, setCreationStatus] = useState<'APPROVED' | 'PENDING'>('APPROVED');

  const pendingUsers = (users || []).filter(u => u.approvalStatus === 'PENDING');
  const approvedUsers = (users || []).filter(u => u.approvalStatus !== 'PENDING');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || pin.length < 4) return;

    requestMasterAuth({
      title: 'Create Staff Account Master Authorization',
      actionName: `Create Account for ${name.trim()} (${role})`,
      description: `Assigning system access with ${role} privileges and 4-digit PIN authentication.`,
      warning: creationStatus === 'APPROVED' 
        ? 'Staff member will be immediately approved and granted POS access.'
        : 'Staff member will require manual approval before accessing the system.',
      onSuccess: () => {
        addUser({
          name: name.trim(),
          email: email.trim(),
          role,
          requestedRole: role,
          pin: pin.trim(),
          active: creationStatus === 'APPROVED',
          approvalStatus: creationStatus,
          registeredAt: new Date().toISOString(),
          approvedBy: creationStatus === 'APPROVED' ? (currentUser.name || 'Store Administrator') : undefined,
          approvedAt: creationStatus === 'APPROVED' ? new Date().toISOString() : undefined,
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`
        });
        setIsAddUserOpen(false);
        setName('');
        setEmail('');
        setPin('1234');
        setCreationStatus('APPROVED');
      }
    });
  };

  const handleApprove = (user: User) => {
    const finalRole = pendingRoleOverrides[user.id] || user.requestedRole || user.role;
    approveUser(user.id, finalRole);
  };

  const handleReject = (user: User) => {
    rejectUser(user.id, 'Declined by administrator in RBAC manager.');
  };

  const handleRoleChange = (userId: string, newRole: UserRole, targetName: string) => {
    requestMasterAuth({
      title: 'User Role Modification Master Authorization',
      actionName: `Change Role for ${targetName} to ${newRole}`,
      description: `Modifying permission tier from current role to ${newRole}.`,
      warning: 'This adjusts permissions for critical operations including POS, inventory, and accounting.',
      onSuccess: () => {
        updateUserRole(userId, newRole);
      }
    });
  };

  const handleSaveResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinUserId || newPin.length < 4) return;
    const target = users.find(u => u.id === resetPinUserId);

    requestMasterAuth({
      title: 'Staff PIN Reset Master Authorization',
      actionName: `Reset Access PIN for ${target?.name || 'Staff User'}`,
      description: 'Replacing active 4-digit POS terminal credentials with new security PIN.',
      warning: 'The user will immediately need this new PIN to sign in.',
      onSuccess: () => {
        updateUserPin(resetPinUserId, newPin);
        setResetPinUserId(null);
        setNewPin('');
      }
    });
  };

  const permissionsMatrix = [
    { module: 'View Dashboard & Valuation', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
    { module: 'Manage Inventory (Add / Edit / Delete)', roles: ['ADMIN', 'MANAGER'] },
    { module: 'Adjust Stock Levels (+ / - Restock)', roles: ['ADMIN', 'MANAGER'] },
    { module: 'Operate POS Checkout & Cash Register', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { module: 'View Full Sales Ledger', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
    { module: 'Process Sales Refunds & Returns', roles: ['ADMIN', 'MANAGER'] },
    { module: 'Record Store Expenses', roles: ['ADMIN', 'MANAGER'] },
    { module: 'Generate P&L & Financial Reports', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
    { module: 'Batch Import / Export Catalog (Excel/PDF)', roles: ['ADMIN', 'MANAGER'] },
    { module: 'User Role Management & PIN Admin', roles: ['ADMIN'] },
    { module: 'View Security Audit Logs', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
    { module: 'System Database Settings', roles: ['ADMIN'] },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                Role-Based Access Control (RBAC) & Users
              </h1>
              <p className="text-xs text-slate-500">
                Manage staff accounts, assign granular role permissions, and reset 4-digit POS access PINs.
              </p>
            </div>
          </div>
        </div>

        {hasPermission(['ADMIN']) && (
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Staff Account</span>
          </button>
        )}
      </div>

      {/* Grid: Staff Cards & Permission Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: User Accounts List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">

          {/* Pending Staff Approvals Card (If any exist) */}
          {pendingUsers.length > 0 && (
            <div className="bg-amber-50/80 rounded-lg border border-amber-300 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-3 bg-amber-100/80 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-800" />
                  <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wider">
                    Pending Staff Approvals ({pendingUsers.length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full uppercase">
                  Admin Approval Required
                </span>
              </div>

              <div className="divide-y divide-amber-200/70 bg-white">
                {pendingUsers.map((user) => {
                  const selectedRole = pendingRoleOverrides[user.id] || user.requestedRole || user.role;
                  return (
                    <div key={user.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5 sm:mt-0">
                          {(user.name || 'ST').slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-xs text-slate-900">{user.name}</p>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Awaiting Approval
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Requested: <strong className="text-slate-900">{user.requestedRole || user.role}</strong>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{user.email}</p>
                          {user.registeredAt && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Registered: {new Date(user.registeredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          )}
                        </div>
                      </div>

                      {hasPermission(['ADMIN']) && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Role:</span>
                            <select
                              value={selectedRole}
                              onChange={(e) => setPendingRoleOverrides(prev => ({ ...prev, [user.id]: e.target.value as UserRole }))}
                              className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="CASHIER">CASHIER</option>
                              <option value="MANAGER">MANAGER</option>
                              <option value="AUDITOR">AUDITOR</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </div>

                          <button
                            onClick={() => handleApprove(user)}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                            title="Approve staff account and grant access"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => handleReject(user)}
                            className="h-8 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Reject registration"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Staff Members ({approvedUsers.length})
              </h3>
              <span className="text-[11px] text-slate-500">Active POS Operators</span>
            </div>

            <div className="divide-y divide-slate-100">
              {(approvedUsers || []).length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <ShieldCheck className="w-8 h-8 text-emerald-700/40 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Approved Staff Profiles Yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Create or approve staff accounts to grant POS access.</p>
                </div>
              ) : (
                (approvedUsers || []).map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  const isRejected = user.approvalStatus === 'REJECTED';

                return (
                  <div key={user.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#064e3b] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          (user.name || 'US').slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-xs text-slate-900 truncate">{user.name || 'Staff'}</p>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              You
                            </span>
                          )}
                          {user.approvedBy && (
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] rounded flex items-center gap-0.5" title={`Approved by ${user.approvedBy}`}>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">
                              Declined
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <p className="text-[10px] text-emerald-800 font-mono flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Encrypted PIN: &bull;&bull;&bull;&bull; (SHA-256)</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isRejected ? (
                        <button
                          onClick={() => handleApprove(user)}
                          className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-xs font-semibold flex items-center gap-1"
                          title="Re-approve this staff member"
                        >
                          <Check className="w-3 h-3" />
                          <span>Re-approve</span>
                        </button>
                      ) : (
                        <>
                          {/* Role Selector */}
                          {hasPermission(['ADMIN']) ? (
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole, user.name)}
                              className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="MANAGER">MANAGER</option>
                              <option value="CASHIER">CASHIER</option>
                              <option value="AUDITOR">AUDITOR</option>
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
                              {user.role}
                            </span>
                          )}

                          {/* Reset PIN */}
                          {hasPermission(['ADMIN']) && (
                            <button
                              onClick={() => {
                                setResetPinUserId(user.id);
                                setNewPin('');
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Reset 4-digit PIN"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Delete User */}
                      {hasPermission(['ADMIN']) && !isCurrent && users.length > 1 && (
                        <button
                          onClick={() => {
                            requestMasterAuth({
                              title: 'Delete Staff User Master Authorization',
                              actionName: `Delete Staff Account: ${user.name} (${user.role})`,
                              description: `Permanently removes login credentials and profile for ${user.email}.`,
                              warning: 'This action revokes all POS access for this employee.',
                              onSuccess: () => {
                                deleteUser(user.id);
                              }
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Remove user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        </div>

        {/* Right: Permission Matrix (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-lg border border-emerald-100 shadow-sm p-4 space-y-2.5">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-800" /> Granular RBAC Matrix
            </h3>
            <p className="text-[11px] text-slate-500">
              Access permissions automatically enforce view and write capabilities.
            </p>

            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">System Permission</th>
                    <th className="py-2 px-2 text-center">Adm</th>
                    <th className="py-2 px-2 text-center">Mgr</th>
                    <th className="py-2 px-2 text-center">Cash</th>
                    <th className="py-2 px-2 text-center">Aud</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissionsMatrix.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-1.5 px-3 font-medium text-slate-800">{p.module}</td>
                      <td className="py-1.5 px-2 text-center">
                        {p.roles.includes('ADMIN') ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {p.roles.includes('MANAGER') ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {p.roles.includes('CASHIER') ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {p.roles.includes('AUDITOR') ? <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD USER MODAL */}
      {/* ========================================================================= */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg border border-emerald-100 shadow-xl max-w-md w-full overflow-hidden text-slate-900">
            <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Create Staff User</h3>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Gonzalez"
                  className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@verdanttrack.com"
                  className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">4-Digit Access PIN *</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-center tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {role !== 'ADMIN' && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-slate-700 block">Admin Approval Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreationStatus('APPROVED')}
                      className={`py-1.5 px-2 text-xs font-bold rounded-md border text-center transition-colors flex items-center justify-center gap-1.5 ${
                        creationStatus === 'APPROVED'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-1 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Directly Approved
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationStatus('PENDING')}
                      className={`py-1.5 px-2 text-xs font-bold rounded-md border text-center transition-colors flex items-center justify-center gap-1.5 ${
                        creationStatus === 'PENDING'
                          ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Require Approval
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {creationStatus === 'APPROVED'
                      ? 'Account will be activated immediately with POS sign-in permission.'
                      : 'Account will remain locked in pending status until an Administrator approves it.'}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET PIN MODAL */}
      {/* ========================================================================= */}
      {resetPinUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg border border-emerald-100 shadow-xl max-w-sm w-full overflow-hidden text-slate-900">
            <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Reset 4-Digit Access PIN</h3>
              </div>
              <button onClick={() => setResetPinUserId(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPin} className="p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Enter New 4-Digit PIN</label>
                  <span className="text-[10px] text-emerald-800 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">SHA-256 Encrypted</span>
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="&bull;&bull;&bull;&bull;"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono font-bold text-center tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  The PIN is cryptographically hashed with salt before storage.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPinUserId(null)}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newPin.length < 4}
                  className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
