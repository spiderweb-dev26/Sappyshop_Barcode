import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ActionType, ActivityLog, User } from '../types';
import { 
  Activity, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  User as UserIcon, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Info, 
  Eye, 
  X,
  Camera,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const AuditLogViewer: React.FC = () => {
  const { logs, users, settings } = useApp();
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [inspectedLog, setInspectedLog] = useState<ActivityLog | null>(null);

  const actionTypes: ActionType[] = [
    'SALE_CREATED',
    'SALE_REFUNDED',
    'STOCK_ADJUSTED',
    'ITEM_CREATED',
    'ITEM_UPDATED',
    'ITEM_DELETED',
    'EXPENSE_CREATED',
    'EXPENSE_DELETED',
    'BULK_IMPORT',
    'DATA_EXPORT',
    'USER_CREATED',
    'USER_UPDATED',
    'PROFILE_PICTURE_UPDATED',
    'ROLE_CHANGED',
    'USER_LOGIN',
    'SETTINGS_UPDATED',
    'DATA_RESTORED',
    'ORDER_PARKED',
    'ORDER_RECALLED',
    'STOCKTAKE_COMPLETED',
    'REGISTER_OPENED',
    'REGISTER_CLOSED',
    'SUPPLIER_CREATED'
  ];

  const filteredLogs = (logs || []).filter((log) => {
    if (!log) return false;
    const matchesSearch =
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.entityType && log.entityType.toLowerCase().includes(search.toLowerCase())) ||
      (log.entityId && log.entityId.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = selectedAction === 'ALL' || log.actionType === selectedAction;
    const matchesUser = selectedUserId === 'ALL' || log.userId === selectedUserId;

    return matchesSearch && matchesAction && matchesUser;
  });

  const exportLogsToExcel = () => {
    const sheetData = filteredLogs.map((l) => ({
      Timestamp: new Date(l.timestamp).toLocaleString(),
      'Action Type': l.actionType,
      'Staff Name': l.userName,
      'Staff Role': l.userRole,
      'Staff ID': l.userId,
      'Entity Type': l.entityType,
      'Entity ID': l.entityId || '',
      Details: l.details,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs');
    XLSX.writeFile(wb, `${settings.storeName.replace(/\s+/g, '_')}_Activity_Logs.xlsx`);
  };

  const getActionBadgeColor = (action: ActionType) => {
    switch (action) {
      case 'SALE_CREATED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'STOCK_ADJUSTED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'ITEM_CREATED':
      case 'USER_CREATED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ITEM_UPDATED':
      case 'USER_UPDATED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'PROFILE_PICTURE_UPDATED':
        return 'bg-violet-100 text-violet-800 border-violet-300';
      case 'ITEM_DELETED':
      case 'SALE_REFUNDED':
      case 'EXPENSE_DELETED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'EXPENSE_CREATED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'BULK_IMPORT':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'USER_LOGIN':
      case 'REGISTER_OPENED':
      case 'REGISTER_CLOSED':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Helper to resolve staff avatar picture and initials
  const resolveUserDisplay = (log: ActivityLog) => {
    const matchingUser = users.find(u => u.id === log.userId);
    const avatar = log.userAvatar || matchingUser?.avatar;
    const color = log.userAvatarColor || matchingUser?.avatarColor || 'bg-emerald-700';
    const initials = (log.userName || 'Staff')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');

    return { avatar, color, initials };
  };

  // Quick stats
  const todayCount = (logs || []).filter(l => {
    const d = new Date(l.timestamp);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Security & Activity Audit Logs</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {logs.length} Total Events
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Audit trail with staff profile pictures, user authentication, inventory movements, and system activities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <span>Today: <strong className="text-slate-900 font-bold">{todayCount}</strong> events</span>
            <span className="text-slate-300">|</span>
            <span>Staff Tracked: <strong className="text-slate-900 font-bold">{users.length}</strong></span>
          </div>

          <button
            onClick={exportLogsToExcel}
            className="h-8.5 px-3.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs flex flex-col md:flex-row items-center gap-2.5">
        {/* Keyword Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity by staff name, product, sale ID, or description..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter by Staff Member */}
        <div className="w-full md:w-56">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Staff Members ({users.length})</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Action Event */}
        <div className="w-full md:w-56">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Event Types</option>
            {actionTypes.map((act) => (
              <option key={act} value={act}>
                {act.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-emerald-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-3.5 whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Staff Member</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Event Type</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Target Entity</th>
                <th className="py-3 px-3.5">Activity Description</th>
                <th className="py-3 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Activity className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No activity logs match your filters</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or selecting "All Staff"</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const { avatar, color, initials } = resolveUserDisplay(log);

                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setInspectedLog(log)}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-3.5 text-slate-500 font-mono whitespace-nowrap">
                        <div className="text-slate-800 font-medium">
                          {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Staff Member with Profile Picture */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {/* Circular User Avatar */}
                          <div className={`w-8 h-8 rounded-full ${color} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-white overflow-hidden`}>
                            {avatar ? (
                              <img 
                                src={avatar} 
                                alt={log.userName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{initials || 'ST'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                              {log.userName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono uppercase">
                              {log.userRole}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Event Type Badge */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${getActionBadgeColor(log.actionType)}`}>
                          {log.actionType === 'PROFILE_PICTURE_UPDATED' && <Camera className="w-2.5 h-2.5" />}
                          <span>{log.actionType.replace(/_/g, ' ')}</span>
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="py-2.5 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 font-mono text-[10px] text-slate-700 rounded-md font-semibold border border-slate-200">
                          {log.entityType}
                        </span>
                        {log.entityId && (
                          <span className="ml-1 text-[10px] font-mono text-slate-400">
                            #{log.entityId.slice(0, 8)}
                          </span>
                        )}
                      </td>

                      {/* Activity Details */}
                      <td className="py-2.5 px-3.5 text-slate-700">
                        <span className="line-clamp-2">{log.details}</span>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className="p-1.5 rounded-md text-slate-400 group-hover:text-emerald-700 group-hover:bg-emerald-100 inline-flex transition-colors">
                          <Eye className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log Details Modal / Inspector */}
      {inspectedLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setInspectedLog(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-emerald-100 w-full max-w-lg overflow-hidden text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#064e3b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-800 rounded-xl text-emerald-200">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Event Audit Inspector</h3>
                  <p className="text-xs text-emerald-200/90 font-mono">ID: {inspectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Staff Member Card */}
              {(() => {
                const { avatar, color, initials } = resolveUserDisplay(inspectedLog);
                return (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full ${color} text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md border-2 border-white overflow-hidden`}>
                      {avatar ? (
                        <img 
                          src={avatar} 
                          alt={inspectedLog.userName} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{inspectedLog.userName}</h4>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                          {inspectedLog.userRole}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Staff User ID: {inspectedLog.userId}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Event Action</span>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${getActionBadgeColor(inspectedLog.actionType)}`}>
                    {inspectedLog.actionType.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Entity Category</span>
                  <span className="font-bold text-slate-800 mt-1 block">
                    {inspectedLog.entityType} {inspectedLog.entityId && `(#${inspectedLog.entityId.slice(0, 8)})`}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Timestamp & Date</span>
                  <div className="text-slate-800 font-mono mt-0.5 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(inspectedLog.timestamp).toUTCString()}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
                    Local: {new Date(inspectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Event Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Action Details
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-mono">
                  {inspectedLog.details}
                </div>
              </div>

              {/* Optional JSON Metadata */}
              {inspectedLog.metadata && Object.keys(inspectedLog.metadata).length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Event Payload Metadata
                  </label>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(inspectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
