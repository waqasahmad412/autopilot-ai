import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Brain,
  ShieldCheck,
  Target,
  Users,
  CheckSquare,
  Bot
} from 'lucide-react';

interface AnalyticsViewProps {
  analyticsData: any;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analyticsData }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const summary = analyticsData?.summary || {
    totalRuns: 2289,
    successfulRuns: 2234,
    failedRuns: 55,
    successRate: '97.6',
    avgDuration: '1.42s',
    humanInterventions: 14,
    leadsGenerated: 18,
    customersHandled: 42,
    tasksCompleted: 35
  };

  const dailyTrends = analyticsData?.dailyTrends || [
    { date: 'Sep 23', runs: 180, success: 176, failed: 4 },
    { date: 'Sep 24', runs: 240, success: 232, failed: 8 },
    { date: 'Sep 25', runs: 310, success: 304, failed: 6 },
    { date: 'Sep 26', runs: 290, success: 284, failed: 6 },
    { date: 'Sep 27', runs: 380, success: 371, failed: 9 },
    { date: 'Sep 28', runs: 420, success: 412, failed: 8 },
    { date: 'Sep 29', runs: 468, success: 457, failed: 11 },
  ];

  const agentPerformance = analyticsData?.agentPerformance || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Operational Intelligence & Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Throughput, error frequency, AI decision confidence, and agent efficiency metrics.
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs self-start sm:self-auto">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
              timeRange === '7d' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
              timeRange === '30d' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Total Executions</span>
          <p className="text-xl font-bold text-white mt-1">{summary.totalRuns}</p>
          <span className="text-[10px] text-emerald-400 font-medium">97.6% Succeeded</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Average Duration</span>
          <p className="text-xl font-bold text-white mt-1">{summary.avgDuration}</p>
          <span className="text-[10px] text-indigo-400 font-medium">Fast pipeline execution</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Human Interventions</span>
          <p className="text-xl font-bold text-amber-400 mt-1">{summary.humanInterventions}</p>
          <span className="text-[10px] text-slate-400 font-medium">0.6% escalation rate</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Leads Qualified</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{summary.leadsGenerated}</p>
          <span className="text-[10px] text-slate-400 font-medium">BANT ICP verified</span>
        </div>
      </div>

      {/* Daily Volume Bar Chart */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Daily Automation Runs
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" /> Succeeded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Failed
            </span>
          </div>
        </div>

        <div className="h-48 pt-4 flex items-end justify-between gap-3 border-b border-slate-800 pb-2">
          {dailyTrends.map((d: any, idx: number) => {
            const total = d.success + d.failed;
            const heightPercent = Math.min(100, Math.round((total / 500) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full max-w-[42px] bg-indigo-600 rounded-t-md relative flex flex-col justify-end overflow-hidden hover:bg-indigo-500 transition-colors"
                  style={{ height: `${heightPercent}%` }}
                >
                  <div
                    className="w-full bg-rose-500"
                    style={{ height: `${(d.failed / total) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Agents Performance Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-400" /> AI Agent Workload & Reliability
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Total Interactions</th>
                <th className="py-2.5 px-3">Accuracy / Success</th>
                <th className="py-2.5 px-3">Avg Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {agentPerformance.map((a: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-bold text-white">{a.name}</td>
                  <td className="py-3 px-3 text-indigo-400">{a.role}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{a.interactions}</td>
                  <td className="py-3 px-3">
                    <span className="text-emerald-400 font-bold">{a.successRate}%</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">{a.responseTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
