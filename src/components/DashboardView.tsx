import React, { useState } from 'react';
import {
  Zap,
  Bot,
  Users,
  Target,
  MessageSquare,
  CheckCircle2,
  XCircle,
  CheckSquare,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Play,
  FlaskConical,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Mail,
  ShieldCheck,
  Brain,
  Send,
  RefreshCw
} from 'lucide-react';
import { AutomationRun, ActivityLog, GmailStats, DetailedGmailStats, GmailSettings, GmailEmailRecord } from '../types.ts';

interface DashboardViewProps {
  stats: {
    totalAutomations: number;
    activeAutomations: number;
    totalAgents: number;
    customersCount: number;
    leadsCount: number;
    messagesCount: number;
    successfulExecutions: number;
    failedExecutions: number;
    tasksCompleted: number;
    tasksPending: number;
  };
  gmailStats?: DetailedGmailStats | GmailStats;
  gmailSettings?: GmailSettings;
  recentRuns: AutomationRun[];
  recentActivity: ActivityLog[];
  recentEmails?: GmailEmailRecord[];
  onCreateAutomation: () => void;
  onOpenRun: (run: AutomationRun) => void;
  onNavigateToView: (view: string) => void;
  onQuickRun: (automationId: string, mode: 'real' | 'test') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  gmailStats,
  gmailSettings,
  recentRuns,
  recentActivity,
  recentEmails = [],
  onCreateAutomation,
  onOpenRun,
  onNavigateToView,
  onQuickRun
}) => {
  const [dashboardGmailTab, setDashboardGmailTab] = useState<'real' | 'test'>('real');
  const isGmailConnected = gmailSettings?.connectionStatus === 'connected';
  const hasGmailData = (gmailStats?.emailsReceived ?? 0) > 0;

  // Safely extract detailed or base stats
  const detailedStats = gmailStats as DetailedGmailStats | undefined;
  const activeGmailStats = dashboardGmailTab === 'real'
    ? (detailedStats?.real || gmailStats)
    : (detailedStats?.test || gmailStats);

  const metricCards = [
    {
      label: 'Active Automations',
      value: `${stats.activeAutomations} / ${stats.totalAutomations}`,
      sub: 'Workflows running 24/7',
      icon: Zap,
      color: 'indigo',
      trend: '+12% this week',
      view: 'automations'
    },
    {
      label: 'AI Agents Online',
      value: stats.totalAgents,
      sub: 'Autonomous operators',
      icon: Bot,
      color: 'emerald',
      trend: '100% operational',
      view: 'agents'
    },
    {
      label: 'Gmail Automation',
      value: isGmailConnected ? (gmailStats?.repliesSent ?? 0) : 'Not Connected',
      sub: isGmailConnected ? `${gmailStats?.waitingForApproval ?? 0} in queue • ${gmailStats?.emailsReceived ?? 0} received` : 'OAuth Setup Required',
      icon: Mail,
      color: 'rose',
      trend: isGmailConnected ? 'Active sync' : 'Requires auth',
      view: 'gmail'
    },
    {
      label: 'Qualified Leads',
      value: stats.leadsCount,
      sub: 'AI-evaluated prospects',
      icon: Target,
      color: 'amber',
      trend: '88 avg score',
      view: 'leads'
    },
    {
      label: 'Customers in CRM',
      value: stats.customersCount,
      sub: 'Unified profiles & tags',
      icon: Users,
      color: 'sky',
      trend: 'Active tracking',
      view: 'customers'
    },
    {
      label: 'Messages Processed',
      value: stats.messagesCount,
      sub: 'Multi-channel inbox',
      icon: MessageSquare,
      color: 'violet',
      trend: '1.2s avg AI latency',
      view: 'conversations'
    },
    {
      label: 'Success Rate',
      value: `${stats.successfulExecutions + stats.failedExecutions > 0 ? Math.round((stats.successfulExecutions / (stats.successfulExecutions + stats.failedExecutions)) * 100) : 98}%`,
      sub: `${stats.successfulExecutions} success • ${stats.failedExecutions} failed`,
      icon: CheckCircle2,
      color: 'emerald',
      trend: 'High reliability',
      view: 'analytics'
    },
    {
      label: 'Pending Tasks',
      value: stats.tasksPending,
      sub: `${stats.tasksCompleted} completed`,
      icon: CheckSquare,
      color: 'rose',
      trend: 'Auto-assigned',
      view: 'tasks'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              AutoPilot AI Command Center
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              V3.8 Production
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Monitor real-time agent decisions, event triggers, autonomous workflow execution, and human approval queues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onQuickRun('auto_support_triage', 'test')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Triage Run</span>
          </button>
          <button
            onClick={onCreateAutomation}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Create Automation</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateToView(card.view)}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 transition-all cursor-pointer group hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{card.label}</span>
                <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white tracking-tight">{card.value}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-medium">
                  {card.trend}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DEDICATED GMAIL AI AUTOMATION ENGINE STATUS & COUNTERS (Req 18 & 19) */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">Gmail AI Automation Engine</h2>
                {isGmailConnected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> CONNECTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    OAUTH SETUP REQUIRED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {gmailSettings?.connectedEmail
                  ? `Authorized Inbox: ${gmailSettings.connectedEmail}`
                  : 'Automated email triage and grounded customer replies.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDashboardGmailTab('real')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  dashboardGmailTab === 'real'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                REAL GMAIL ACTIVITY
              </button>
              <button
                type="button"
                onClick={() => setDashboardGmailTab('test')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  dashboardGmailTab === 'test'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                TEST / SANDBOX ACTIVITY
              </button>
            </div>

            <button
              onClick={() => onNavigateToView('gmail')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Manage Gmail Engine</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Badges Strip */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Response Mode:</span>
            {gmailSettings?.responseMode === 'auto_reply' ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                <Send className="w-3 h-3" /> MODE 3 — REAL AUTO REPLY
              </span>
            ) : gmailSettings?.responseMode === 'human_approval' ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> MODE 2 — HUMAN APPROVAL
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> MODE 1 — TEST MODE (DEFAULT)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Active AI Engine:</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1">
              <Brain className="w-3 h-3" /> {gmailSettings?.aiProvider === 'gemini' ? 'Gemini 3.8 Flash' : 'Groq LPU (qwen/qwen3.8-27b)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <RefreshCw className="w-3 h-3 text-slate-500" />
            <span>Last Sync:</span>
            <strong className="text-slate-300 font-mono">
              {gmailSettings?.lastSyncAt
                ? new Date(gmailSettings.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Continuous polling (30s)'}
            </strong>
          </div>
        </div>

        {/* 6 Core Live Counters (Separated Real vs Test) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Emails Received</span>
            <span className="text-lg font-bold text-white mt-1 block">{activeGmailStats?.emailsReceived ?? 0}</span>
            <span className="text-[10px] text-slate-500">{dashboardGmailTab === 'real' ? 'Live inbox' : 'Simulated'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">AI Replies Drafted</span>
            <span className="text-lg font-bold text-sky-400 mt-1 block">{activeGmailStats?.aiRepliesGenerated ?? 0}</span>
            <span className="text-[10px] text-slate-500">Grounded in KB</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Replies Sent</span>
            <span className="text-lg font-bold text-emerald-400 mt-1 block">{activeGmailStats?.repliesSent ?? 0}</span>
            <span className="text-[10px] text-slate-500">Delivered via Gmail</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">In Approval Queue</span>
            <span className="text-lg font-bold text-amber-400 mt-1 block">{activeGmailStats?.waitingForApproval ?? 0}</span>
            <span className="text-[10px] text-slate-500">Awaiting review</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Human Escalated</span>
            <span className="text-lg font-bold text-rose-400 mt-1 block">{activeGmailStats?.humanEscalations ?? 0}</span>
            <span className="text-[10px] text-slate-500">Low conf / Sensitive</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Failed</span>
            <span className="text-lg font-bold text-slate-400 mt-1 block">{activeGmailStats?.failedExecutions ?? 0}</span>
            <span className="text-[10px] text-slate-500">Errors</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics / Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Automation Activity & Throughput Graph */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Automation Executions & Health
              </h2>
              <p className="text-xs text-slate-400">Daily throughput across triggers and AI nodes</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" /> Successful
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Failed
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-48 pt-4 flex items-end justify-between gap-2 border-b border-slate-800 pb-2">
            {[
              { day: 'Mon', success: 176, failed: 4, height: '45%' },
              { day: 'Tue', success: 232, failed: 8, height: '60%' },
              { day: 'Wed', success: 304, failed: 6, height: '75%' },
              { day: 'Thu', success: 284, failed: 6, height: '70%' },
              { day: 'Fri', success: 371, failed: 9, height: '88%' },
              { day: 'Sat', success: 412, failed: 8, height: '94%' },
              { day: 'Sun', success: 457, failed: 11, height: '100%' },
            ].map((col, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div className="w-full max-w-[36px] bg-slate-800 rounded-t-md overflow-hidden flex flex-col justify-end transition-all group-hover:bg-slate-700" style={{ height: col.height }}>
                  <div className="w-full bg-rose-500" style={{ height: `${(col.failed / (col.success + col.failed)) * 100}%` }} />
                  <div className="w-full bg-indigo-600 group-hover:bg-indigo-500 flex-1" />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{col.day}</span>
              </div>
            ))}
          </div>

          {/* Highlights Footer */}
          <div className="grid grid-cols-3 gap-3 pt-1 text-center">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Runs</span>
              <span className="text-sm font-bold text-white">{stats.successfulExecutions + stats.failedExecutions}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">AI Decisions</span>
              <span className="text-sm font-bold text-indigo-400">3,490</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Human Interventions</span>
              <span className="text-sm font-bold text-amber-400">14 (0.4%)</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Workflow Triggers & Execution Shortcuts */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Quick Action Triggers
            </h2>
            <p className="text-xs text-slate-400">Simulate or run production workflows</p>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">Customer Support Triage</p>
                <p className="text-[11px] text-slate-400">Intent analysis & resolution</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onQuickRun('auto_support_triage', 'test')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  title="Test run safely"
                >
                  <FlaskConical className="w-3 h-3" /> Test
                </button>
                <button
                  onClick={() => onQuickRun('auto_support_triage', 'real')}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  title="Execute live"
                >
                  <Play className="w-3 h-3" /> Run
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">Inbound Lead Scoring</p>
                <p className="text-[11px] text-slate-400">BANT qualification (0-100)</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onQuickRun('auto_lead_scoring', 'test')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <FlaskConical className="w-3 h-3" /> Test
                </button>
                <button
                  onClick={() => onQuickRun('auto_lead_scoring', 'real')}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3" /> Run
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">Email Assistant Drafter</p>
                <p className="text-[11px] text-slate-400">Drafts response with approval</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onQuickRun('auto_email_approvals', 'real')}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3" /> Run
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => onNavigateToView('workflows')}
              className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Explore Visual Workflow Builder</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Split Section: Recent Runs & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Automation Runs Table */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Recent Automation Runs
            </h2>
            <button
              onClick={() => onNavigateToView('automations')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5">
            {recentRuns.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No runs recorded yet</p>
            ) : (
              recentRuns.map((run) => (
                <div
                  key={run.id}
                  onClick={() => onOpenRun(run)}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg ${
                        run.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : run.status === 'needs_approval'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {run.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : run.status === 'needs_approval' ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300">
                          {run.automationName}
                        </p>
                        {run.executionMode === 'test' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                            TEST
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>{new Date(run.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{run.stepsTimeline.length} steps</span>
                        {run.durationMs && <span>• {(run.durationMs / 1000).toFixed(2)}s</span>}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Inspect →
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Live Activity Stream
            </h2>
            <button
              onClick={() => onNavigateToView('activity')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              All logs
            </button>
          </div>

          <div className="space-y-3">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.status === 'success'
                      ? 'bg-emerald-400'
                      : log.status === 'warning'
                      ? 'bg-amber-400'
                      : log.status === 'error'
                      ? 'bg-rose-400'
                      : 'bg-indigo-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-200">{log.action}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {log.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
