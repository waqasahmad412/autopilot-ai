import React, { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Brain,
  Zap,
  ArrowRight,
  ShieldAlert,
  Check,
  Ban,
  FlaskConical,
  CornerDownRight
} from 'lucide-react';
import { AutomationRun } from '../types.ts';

interface RunExecutionModalProps {
  run: AutomationRun | null;
  onClose: () => void;
  onApprove: (runId: string) => Promise<void>;
  onReject: (runId: string, reason: string) => Promise<void>;
}

export const RunExecutionModal: React.FC<RunExecutionModalProps> = ({
  run,
  onClose,
  onApprove,
  onReject
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!run) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(run.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(run.id, rejectReason || 'Declined by human reviewer');
      setShowRejectInput(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'needs_approval':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-3.5 h-3.5" /> Needs Human Approval
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Execution Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Clock className="w-3.5 h-3.5 animate-spin" /> In Progress
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{run.automationName}</h3>
                {run.executionMode === 'test' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <FlaskConical className="w-3 h-3" /> TEST SIMULATION
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Run ID: <span className="font-mono text-slate-300">{run.id}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(run.status)}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Human Approval Banner if pending */}
        {run.status === 'needs_approval' && run.pendingApproval && (
          <div className="p-4 bg-amber-950/30 border-b border-amber-500/30 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Human Action Required</h4>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{run.pendingApproval.description}</p>
                {run.pendingApproval.payload && (
                  <pre className="mt-2 p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(run.pendingApproval.payload, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {showRejectInput ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-amber-500/20">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" /> Confirm Rejection
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" /> Reject Action
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Approve & Execute
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content & Timeline */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Trigger Type</span>
              <span className="font-semibold text-slate-200 capitalize">{run.triggerEvent.type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Started At</span>
              <span className="text-slate-300 font-mono text-[11px]">
                {new Date(run.startTime).toLocaleTimeString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Total Duration</span>
              <span className="text-slate-300 font-semibold">{run.durationMs ? `${(run.durationMs / 1000).toFixed(2)}s` : 'Processing'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Execution Mode</span>
              <span className={`font-semibold capitalize ${run.executionMode === 'test' ? 'text-amber-400' : 'text-indigo-400'}`}>
                {run.executionMode} Mode
              </span>
            </div>
          </div>

          {/* Trigger Event Payload */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Initial Trigger Input</span>
              <span className="text-[10px] text-slate-500 font-mono">Payload</span>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto">
              {JSON.stringify(run.triggerEvent.payload, null, 2)}
            </pre>
          </div>

          {/* Execution Timeline Steps */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" /> Complete Execution Pipeline
            </h4>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {run.stepsTimeline.map((step, idx) => (
                <div key={idx} className="relative pl-9">
                  {/* Step status dot */}
                  <div
                    className={`absolute left-1.5 top-2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-slate-900 ${
                      step.status === 'success'
                        ? 'bg-emerald-500 text-white'
                        : step.status === 'failed'
                        ? 'bg-rose-500 text-white'
                        : step.status === 'waiting_approval'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{step.stepName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono uppercase">
                          {step.category} • {step.type}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{step.durationMs}ms</span>
                    </div>

                    {/* AI Decision Box if present */}
                    {step.aiDecision && (
                      <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-indigo-400" /> AI Understanding & Decision
                          </span>
                          {step.aiDecision.confidence !== undefined && (
                            <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                              {Math.round(step.aiDecision.confidence * 100)}% Confidence
                            </span>
                          )}
                        </div>
                        {step.aiDecision.intent && (
                          <p className="text-slate-300">
                            <strong className="text-slate-400">Classified Intent:</strong> {step.aiDecision.intent}
                          </p>
                        )}
                        {step.aiDecision.reasoning && (
                          <p className="text-slate-300 leading-relaxed">
                            <strong className="text-slate-400">Reasoning:</strong> {step.aiDecision.reasoning}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step Output */}
                    {step.output && (
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                          <CornerDownRight className="w-3 h-3 text-slate-500" /> Output Result
                        </div>
                        <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                          {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error Box if failed */}
                    {step.error && (
                      <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Error Occurred</p>
                          <p className="text-rose-200 mt-0.5">{step.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Result / Actions Taken Summary */}
          {run.finalResult && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Final Execution Summary
              </span>
              <p className="text-slate-200 leading-relaxed">{run.finalResult.summary}</p>
              {run.finalResult.actionsTaken && run.finalResult.actionsTaken.length > 0 && (
                <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap gap-1.5">
                  {run.finalResult.actionsTaken.map((act, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[11px] border border-emerald-500/20">
                      ✓ {act}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
