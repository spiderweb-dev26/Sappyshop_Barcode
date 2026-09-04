import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ActionType, ActivityLog } from '../types';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Activity,
  FileSpreadsheet,
  Download,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const AuditLogViewer: React.FC = () => {
  const { logs, settings } = useApp();

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const actionTypes: ActionType[] = [
    'ITEM_CREATED',
    'ITEM_UPDATED',
    'ITEM_DELETED',
    'STOCK_ADJUSTED',
    'SALE_CREATED',
    'SALE_REFUNDED',
    'EXPENSE_CREATED',
    'EXPENSE_DELETED',
    'BULK_IMPORT',
    'DATA_EXPORT',
    'USER_CREATED',
    'ROLE_CHANGED',
    'USER_LOGIN',
    'SETTINGS_UPDATED',
    'DATA_RESTORED'
  ];

  const filteredLogs = (logs || []).filter((log) => {
    if (!log) return false;
    const matchesSearch =
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.entityType && log.entityType.toLowerCase().includes(search.toLowerCase())) ||
      (log.entityId && log.entityId.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = selectedAction === 'ALL' || log.actionType === selectedAction;

    return matchesSearch && matchesAction;
  });

  const exportLogsToExcel = () => {
    const sheetData = filteredLogs.map((l) => ({
      Timestamp: new Date(l.timestamp).toLocaleString(),
      'Action Type': l.actionType,
      'User Name': l.userName,
      'User Role': l.userRole,
      'Entity Type': l.entityType,
      'Entity ID': l.entityId || '',
      Details: l.details,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, `${settings.storeName.replace(/\s+/g, '_')}_Audit_Logs.xlsx`);
  };

  const getActionBadgeColor = (action: ActionType) => {
    switch (action) {
      case 'SALE_CREATED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'STOCK_ADJUSTED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'ITEM_CREATED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ITEM_UPDATED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'ITEM_DELETED':
      case 'SALE_REFUNDED':
      case 'EXPENSE_DELETED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'EXPENSE_CREATED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'BULK_IMPORT':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-md">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                Security & Activity Audit Logs
              </h1>
              <p className="text-xs text-slate-500">
                Immutable event stream of stock adjustments, user authentications, sales checkout, and catalog imports.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={exportLogsToExcel}
          className="h-8 px-3 bg-slate-100 hover:bg-emerald-50 text-slate-700 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          <span>Export Audit Excel</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by keyword, staff name, or resource..."
            className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="w-full sm:w-56 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Action Events ({logs.length})</option>
          {actionTypes.map((act) => (
            <option key={act} value={act}>
              {act.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Staff Member</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Activity Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <Activity className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                    <p className="font-semibold text-slate-600 text-xs">No matching audit events found</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${getActionBadgeColor(log.actionType)}`}>
                        {log.actionType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">{log.userRole}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-medium whitespace-nowrap">
                      <span className="px-1.5 py-0.2 bg-slate-100 font-mono text-[10px] text-slate-700 rounded">
                        {log.entityType}
                      </span>
                      {log.entityId && <span className="ml-1 text-[10px] text-slate-400">#{log.entityId.slice(0, 8)}</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
