import React, { useState } from 'react';
import {
  Zap,
  Play,
  FlaskConical,
  Plus,
  Pause,
  Copy,
  Trash2,
  GitBranch,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Automation, AutomationRun } from '../types.ts';
import { api } from '../services/api.ts';

interface AutomationsViewProps {
  automations: Automation[];
  onRefresh: () => void;
  onOpenWorkflowBuilder: (automationId?: string) => void;
  onOpenRun: (run: AutomationRun) => void;
  onExecuteRun: (automationId: string, payload: any, mode: 'real' | 'test') => Promise<void>;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  automations,
  onRefresh,
  onOpenWorkflowBuilder,
  onOpenRun,
  onExecuteRun
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');
  const [selectedAutoForRun, setSelectedAutoForRun] = useState<Automation | null>(null);
  const [customPayloadText, setCustomPayloadText] = useState('');
  const [executionMode, setExecutionMode] = useState<'real' | 'test'>('real');
  const [isRunning, setIsRunning] = useState(false);

  const filtered = automations.filter((a) => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  const openRunModal = (auto: Automation, defaultMode: 'real' | 'test' = 'real') => {
    setSelectedAutoForRun(auto);
    setExecutionMode(defaultMode);

    // Provide helpful initial sample trigger payload based on trigger type
    let sample = {
      message: 'Hello, we are looking for pricing details on your Pro Tier.',
      customerName: 'Sarah Jenkins',
      email: 's.jenkins@acmecorp.com',
      company: 'Acme Corp'
    };
    if (auto.trigger.type === 'new_lead') {
      sample = {
        name: 'Jordan Belfort',
        company: 'Stratton Oakmont Ltd',
        email: 'jb@stratton.com',
        source: 'Website Inbound Demo Request',
        interest: 'High volume automated CRM pipelines',
        notes: 'Requested immediate pricing and security whitepaper for 500 seats.'
      } as any;
    } else if (auto.trigger.type === 'new_email') {
      sample = {
        from: 'alex@venturepartner.vc',
        subject: 'Term Sheet Q3 Follow-up & Data Room Access',
        body: 'Could you please confirm the current annual recurring revenue retention cohort table for our partners meeting?'
      } as any;
    }
    setCustomPayloadText(JSON.stringify(sample, null, 2));
  };

  const handleConfirmRun = async () => {
    if (!selectedAutoForRun || isRunning) return;
    setIsRunning(true);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(customPayloadText);
      } catch (e) {
        parsed = { text: customPayloadText };
      }
      await onExecuteRun(selectedAutoForRun.id, parsed, executionMode);
      setSelectedAutoForRun(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleStatus = async (auto: Automation) => {
    const nextStatus = auto.status === 'active' ? 'paused' : 'active';
    await api.updateAutomation(auto.id, { status: nextStatus });
    onRefresh();
  };

  const handleDuplicate = async (auto: Automation) => {
    await api.createAutomation({
      ...auto,
      id: undefined as any,
      name: `${auto.name} (Copy)`,
      status: 'active'
    });
    onRefresh();
  };

  const handleDelete = async (auto: Automation) => {
    if (confirm(`Delete automation "${auto.name}"?`)) {
      await api.deleteAutomation(auto.id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            Automations & Pipelines
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event triggers, autonomous AI processing steps, and external action dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({automations.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                filterStatus === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('paused')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                filterStatus === 'paused' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Paused
            </button>
          </div>

          <button
            onClick={() => onOpenWorkflowBuilder()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {/* Automations List */}
      <div className="space-y-3.5">
        {filtered.map((auto) => (
          <div
            key={auto.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg group"
          >
            {/* Info */}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {auto.name}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    auto.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {auto.status === 'active' ? 'Active' : 'Paused'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  Mode: {auto.mode}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Trigger: {auto.trigger.type}
                </span>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {auto.description}
              </p>

              {/* Step Sequence Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Steps:</span>
                {auto.steps.map((step, idx) => (
                  <React.Fragment key={step.id}>
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-medium">
                      {step.name}
                    </span>
                    {idx < auto.steps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">
                  Runs: <strong className="text-white">{auto.runsCount}</strong>
                </span>
                <span className="text-emerald-400">
                  ✓ {auto.successCount}
                </span>
                {auto.failureCount > 0 && (
                  <span className="text-rose-400">
                    ✗ {auto.failureCount}
                  </span>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openRunModal(auto, 'test')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Test safely in sandbox"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Test Run</span>
                </button>
                <button
                  onClick={() => openRunModal(auto, 'real')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                  title="Execute live"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Live</span>
                </button>

                <button
                  onClick={() => onOpenWorkflowBuilder(auto.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Visual Pipeline Builder"
                >
                  <GitBranch className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleStatus(auto)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title={auto.status === 'active' ? 'Pause' : 'Activate'}
                >
                  {auto.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  onClick={() => handleDuplicate(auto)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(auto)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trigger Run Modal */}
      {selectedAutoForRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Execute Automation</h3>
                  <p className="text-xs text-slate-400">{selectedAutoForRun.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAutoForRun(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Mode Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Execution Safety Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExecutionMode('real')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      executionMode === 'real'
                        ? 'border-indigo-500 bg-indigo-950/40 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                      <Zap className="w-4 h-4 text-indigo-400" /> Real Execution
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Executes real AI inference, persists live CRM records, and requires connected credentials for external APIs.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExecutionMode('test')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      executionMode === 'test'
                        ? 'border-amber-500 bg-amber-950/40 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                      <FlaskConical className="w-4 h-4 text-amber-400" /> Test Mode Simulation
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Runs safe step-by-step simulation without external side effects or modifying production data.
                    </p>
                  </button>
                </div>
              </div>

              {/* Event Payload Input */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Trigger Event Payload (JSON)
                </label>
                <textarea
                  rows={6}
                  value={customPayloadText}
                  onChange={(e) => setCustomPayloadText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAutoForRun(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={handleConfirmRun}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                    executionMode === 'real'
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  }`}
                >
                  {isRunning ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : executionMode === 'real' ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <FlaskConical className="w-4 h-4" />
                  )}
                  <span>{isRunning ? 'Processing...' : executionMode === 'real' ? 'Execute Live' : 'Run Simulation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
