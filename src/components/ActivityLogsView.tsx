import React, { useState } from 'react';
import {
  History,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  ExternalLink,
  Bot,
  Zap,
  Brain,
  Network,
  Users,
  Target,
  ShieldCheck
} from 'lucide-react';
import { ActivityLog } from '../types.ts';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
  onRefresh: () => void;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ logs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'all' || log.category === filterCategory;
    const matchesStat = filterStatus === 'all' || log.status === filterStatus;
    return matchesSearch && matchesCat && matchesStat;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'agent':
        return <Bot className="w-4 h-4 text-indigo-400" />;
      case 'automation':
        return <Zap className="w-4 h-4 text-sky-400" />;
      case 'ai_action':
        return <Brain className="w-4 h-4 text-emerald-400" />;
      case 'external_api':
        return <Network className="w-4 h-4 text-purple-400" />;
      case 'customer':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'lead':
        return <Target className="w-4 h-4 text-teal-400" />;
      case 'human_approval':
        return <ShieldCheck className="w-4 h-4 text-rose-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: ActivityLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Succeeded
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Warning / Review
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
            <XCircle className="w-3.5 h-3.5" /> Error
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
            <Info className="w-3.5 h-3.5" /> Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Audit & Activity Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete cryptographic audit trail of agent executions, AI inferences, API calls, and human approvals.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity descriptions..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="automation">Automation</option>
            <option value="ai_action">AI Action</option>
            <option value="human_approval">Human Approval</option>
            <option value="external_api">External API</option>
            <option value="lead">Lead</option>
            <option value="customer">Customer</option>
            <option value="agent">Agent</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Log Feed */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden divide-y divide-slate-800/60 shadow-xl">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No activity records match your filter criteria
          </div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="p-4 hover:bg-slate-850 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs group"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                  {getCategoryIcon(log.category)}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {log.action}
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                      {log.category.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {log.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:pl-4">
                {getStatusBadge(log.status)}
                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {getCategoryIcon(selectedLog.category)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedLog.action}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description
                </span>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              {selectedLog.metadata && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cryptographic Context & Metadata
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
