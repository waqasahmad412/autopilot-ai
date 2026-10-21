import React, { useState } from 'react';
import {
  GitBranch,
  Zap,
  Brain,
  Filter,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowDown,
  ArrowUp,
  Play,
  Save,
  Sparkles,
  Layers,
  Copy,
  Clock,
  ShieldAlert,
  Mail,
  Users,
  Target,
  FileSpreadsheet,
  Calendar,
  Webhook
} from 'lucide-react';
import { Automation, WorkflowStep, TriggerType, AIActionType, LogicType, ActionType } from '../types.ts';
import { api } from '../services/api.ts';

interface WorkflowBuilderViewProps {
  initialAutomation?: Automation | null;
  onSaved: () => void;
  onExecuteRun: (automationId: string, payload: any, mode: 'real' | 'test') => Promise<void>;
}

export const WorkflowBuilderView: React.FC<WorkflowBuilderViewProps> = ({
  initialAutomation,
  onSaved,
  onExecuteRun
}) => {
  const [name, setName] = useState(initialAutomation?.name || 'Customer Inquiry Auto-Pilot');
  const [description, setDescription] = useState(
    initialAutomation?.description || 'AI analyzes inbound request, evaluates sentiment, and triggers CRM actions.'
  );
  const [mode, setMode] = useState<'auto' | 'approval_required' | 'draft_only'>(
    initialAutomation?.mode || 'auto'
  );
  const [triggerType, setTriggerType] = useState<TriggerType>(
    initialAutomation?.trigger.type || 'new_message'
  );

  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialAutomation?.steps || [
      {
        id: 'step_1',
        name: 'AI Intent & Sentiment Classifier',
        category: 'ai',
        type: 'analyze_text',
        description: 'Analyzes user query and extracts intent and urgency',
        config: { model: 'gemini-3.8-flash' },
        order: 1
      },
      {
        id: 'step_2',
        name: 'Human Attention Decision',
        category: 'logic',
        type: 'if_else',
        description: 'Checks if AI flagged needs_human == true',
        config: { condition: 'needs_human == true' },
        order: 2
      },
      {
        id: 'step_3',
        name: 'Generate Tailored Solution',
        category: 'ai',
        type: 'generate_response',
        description: 'Generates helpful response conforming to knowledge base',
        config: {},
        order: 3
      },
      {
        id: 'step_4',
        name: 'Update Customer Record & Notify',
        category: 'action',
        type: 'update_customer',
        description: 'Updates CRM interaction timestamp',
        config: {},
        order: 4
      }
    ]
  );

  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [selectedStepForConfig, setSelectedStepForConfig] = useState<WorkflowStep | null>(null);

  // Sample templates to load
  const loadTemplate = (templateKey: string) => {
    if (templateKey === 'support') {
      setName('Customer Support Automation');
      setDescription('New customer message → AI understands question → Find information → Generate answer → Reply → Save conversation');
      setTriggerType('new_message');
      setSteps([
        {
          id: `step_${Date.now()}_1`,
          name: 'Understand Customer Question',
          category: 'ai',
          type: 'analyze_text',
          description: 'Extract customer intent, sentiment urgency, and key topics',
          config: {},
          order: 1
        },
        {
          id: `step_${Date.now()}_2`,
          name: 'Generate Solution Reply',
          category: 'ai',
          type: 'generate_response',
          description: 'Draft empathetic, factual answer citing knowledge context',
          config: {},
          order: 2
        },
        {
          id: `step_${Date.now()}_3`,
          name: 'Update Customer Interaction',
          category: 'action',
          type: 'update_customer',
          description: 'Refresh customer profile in CRM',
          config: {},
          order: 3
        }
      ]);
    } else if (templateKey === 'lead') {
      setName('Lead Qualification & Pipeline');
      setDescription('New lead → AI analyzes lead → Calculate lead score → Categorize lead → Save lead → Notify sales/user');
      setTriggerType('new_lead');
      setSteps([
        {
          id: `step_${Date.now()}_1`,
          name: 'BANT Lead Scoring',
          category: 'ai',
          type: 'qualify_lead',
          description: 'Score 0-100 based on budget, timeline, and buying signals',
          config: {},
          order: 1
        },
        {
          id: `step_${Date.now()}_2`,
          name: 'High Value Threshold Check',
          category: 'logic',
          type: 'if_else',
          description: 'Verify if score >= 75 for VIP routing',
          config: { condition: 'score >= 75' },
          order: 2
        },
        {
          id: `step_${Date.now()}_3`,
          name: 'Create Priority Task',
          category: 'action',
          type: 'add_task',
          description: 'Assign follow-up task to account executive',
          config: { priority: 'urgent' },
          order: 3
        },
        {
          id: `step_${Date.now()}_4`,
          name: 'Send Instant Alert',
          category: 'action',
          type: 'send_notification',
          description: 'Notify sales manager in real time',
          config: {},
          order: 4
        }
      ]);
    } else if (templateKey === 'email') {
      setName('Executive Email Assistant');
      setDescription('New email → AI summarizes → Classifies priority → Drafts response → Requests approval → Sends after approval');
      setTriggerType('new_email');
      setMode('approval_required');
      setSteps([
        {
          id: `step_${Date.now()}_1`,
          name: 'Summarize Email & Urgency',
          category: 'ai',
          type: 'summarize',
          description: 'Extract 2 bullet points and determine urgency',
          config: {},
          order: 1
        },
        {
          id: `step_${Date.now()}_2`,
          name: 'Draft Executive Reply',
          category: 'ai',
          type: 'generate_response',
          description: 'Compose diplomatic context-aware reply',
          config: {},
          order: 2
        },
        {
          id: `step_${Date.now()}_3`,
          name: 'Require Human Signoff',
          category: 'logic',
          type: 'approval_required',
          description: 'Hold draft in Human Approval dashboard before sending',
          config: {},
          order: 3
        },
        {
          id: `step_${Date.now()}_4`,
          name: 'Send via Connected Gmail',
          category: 'action',
          type: 'send_email',
          description: 'Deliver message to recipient',
          config: {},
          order: 4
        }
      ]);
    } else if (templateKey === 'calendar') {
      setName('Appointment & Calendar Scheduler');
      setDescription('Customer requests appointment → AI understands time → Check availability → Create calendar event');
      setTriggerType('new_message');
      setSteps([
        {
          id: `step_${Date.now()}_1`,
          name: 'Extract Meeting Topic & Time',
          category: 'ai',
          type: 'extract_information',
          description: 'Parse requested meeting duration and date preferences',
          config: {},
          order: 1
        },
        {
          id: `step_${Date.now()}_2`,
          name: 'Create Calendar Event',
          category: 'action',
          type: 'google_calendar_create_event',
          description: 'Book slot in Google Calendar',
          config: {},
          order: 2
        },
        {
          id: `step_${Date.now()}_3`,
          name: 'Send Booking Confirmation',
          category: 'action',
          type: 'send_notification',
          description: 'Notify host and customer',
          config: {},
          order: 3
        }
      ]);
    }
  };

  const handleSaveAutomation = async () => {
    const payload = {
      name,
      description,
      mode,
      status: 'active' as const,
      trigger: {
        type: triggerType,
        config: {}
      },
      steps
    };

    if (initialAutomation) {
      await api.updateAutomation(initialAutomation.id, payload);
    } else {
      await api.createAutomation(payload);
    }
    onSaved();
  };

  const addStep = (category: 'ai' | 'logic' | 'action', type: any, defaultName: string) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: defaultName,
      category,
      type,
      config: {},
      order: steps.length + 1
    };
    setSteps([...steps, newStep]);
    setShowAddStepModal(false);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setSteps(newSteps);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-400" />
              Visual Automation Builder
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              Pipeline Designer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Construct triggers, server-side Gemini decision nodes, conditionals, and real actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onExecuteRun(initialAutomation?.id || 'auto_support_triage', { message: 'Workflow test simulation' }, 'test')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Flow</span>
          </button>
          <button
            onClick={handleSaveAutomation}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Workflow</span>
          </button>
        </div>
      </div>

      {/* Preset Templates Quick Loader */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">Load Ready-to-Use Templates:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadTemplate('support')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Customer Support
          </button>
          <button
            onClick={() => loadTemplate('lead')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Lead Qualification
          </button>
          <button
            onClick={() => loadTemplate('email')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Email Assistant
          </button>
          <button
            onClick={() => loadTemplate('calendar')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Appointment Assistant
          </button>
        </div>
      </div>

      {/* Workflow Metadata Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Automation Title</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Execution Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="auto">Fully Automatic (Executes all steps)</option>
            <option value="approval_required">Approval Required (Pauses before external actions)</option>
            <option value="draft_only">Draft Only (Simulates and saves draft)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Trigger Event</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
          >
            <option value="new_message">New Customer Message (Web Chat / WhatsApp)</option>
            <option value="new_lead">New Inbound Lead Form</option>
            <option value="new_email">New Inbound Email (Gmail)</option>
            <option value="new_customer">New Customer Added</option>
            <option value="webhook">External Webhook POST</option>
            <option value="scheduled_time">Scheduled Cron Time</option>
            <option value="manual_trigger">Manual On-Demand Trigger</option>
          </select>
        </div>
      </div>

      {/* Visual Pipeline Canvas */}
      <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-400" /> Pipeline Flow
          </span>
          <button
            onClick={() => setShowAddStepModal(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step Node</span>
          </button>
        </div>

        {/* Node 1: TRIGGER */}
        <div className="p-4 rounded-xl bg-slate-900 border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase">STEP 1 • TRIGGER</span>
              <h4 className="text-xs font-bold text-white capitalize">{triggerType.replace('_', ' ')}</h4>
              <p className="text-[11px] text-slate-400">Listens for events to initiate automated pipeline execution</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-semibold">
            INBOUND EVENT
          </span>
        </div>

        {/* Down Arrow */}
        <div className="flex justify-center my-1">
          <div className="p-1 rounded-full bg-slate-800 text-slate-400">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        {/* Dynamic Steps Pipeline */}
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-4 shadow-md group">
              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center text-white ${
                    step.category === 'ai'
                      ? 'bg-gradient-to-tr from-indigo-600 to-emerald-500'
                      : step.category === 'logic'
                      ? 'bg-amber-600'
                      : 'bg-sky-600'
                  }`}
                >
                  {step.category === 'ai' ? (
                    <Brain className="w-5 h-5" />
                  ) : step.category === 'logic' ? (
                    <Filter className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      STEP {idx + 2} • {step.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                      {step.type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{step.name}</h4>
                  <p className="text-[11px] text-slate-400">{step.description || 'Configured automation task'}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => moveStep(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Move step up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveStep(idx, 'down')}
                  disabled={idx === steps.length - 1}
                  className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Move step down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeStep(step.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Delete step"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {idx < steps.length - 1 && (
              <div className="flex justify-center my-1">
                <div className="p-1 rounded-full bg-slate-800 text-slate-400">
                  <ArrowDown className="w-4 h-4" />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Add Step Modal */}
      {showAddStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Add Workflow Step Node</h3>
              <button
                onClick={() => setShowAddStepModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Categorized blocks */}
            <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
              {/* Category 1: AI Actions */}
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                  AI Capabilities (Gemini 3.8)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => addStep('ai', 'analyze_text', 'Analyze Text & Intent')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Analyze Text</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Detect customer intent, sentiment urgency, and keywords</p>
                  </button>
                  <button
                    onClick={() => addStep('ai', 'qualify_lead', 'Qualify Lead Score')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Qualify Lead</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Calculate B2B prospect score (0-100) and buying signals</p>
                  </button>
                  <button
                    onClick={() => addStep('ai', 'generate_response', 'Generate AI Response')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Generate Response</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Draft contextual answers conforming to agent knowledge</p>
                  </button>
                  <button
                    onClick={() => addStep('ai', 'summarize', 'Summarize Content')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Summarize Content</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Create concise executive bullet points from threads</p>
                  </button>
                </div>
              </div>

              {/* Category 2: Logic */}
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">
                  Logic & Conditions
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => addStep('logic', 'if_else', 'Conditional Branch (If/Else)')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">If / Else Condition</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Evaluate expressions (e.g. score &gt;= 75 or needs_human)</p>
                  </button>
                  <button
                    onClick={() => addStep('logic', 'approval_required', 'Require Human Approval')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Approval Required</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Pause workflow until human supervisor clicks Approve</p>
                  </button>
                </div>
              </div>

              {/* Category 3: Actions */}
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-2">
                  Execution Actions
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => addStep('action', 'send_email', 'Send Email')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Send Email (Gmail)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Deliver email to customer via connected inbox</p>
                  </button>
                  <button
                    onClick={() => addStep('action', 'add_task', 'Create Task')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Create CRM Task</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Assign prioritized task to human team member</p>
                  </button>
                  <button
                    onClick={() => addStep('action', 'update_customer', 'Update Customer')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Update Customer</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Update contact notes and interaction records</p>
                  </button>
                  <button
                    onClick={() => addStep('action', 'send_notification', 'Send Notification')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Send Notification</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Dispatch real-time in-app dashboard alert</p>
                  </button>
                  <button
                    onClick={() => addStep('action', 'google_sheets_add_row', 'Append Row to Google Sheets')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Google Sheets Row</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Log data to authenticated spreadsheet</p>
                  </button>
                  <button
                    onClick={() => addStep('action', 'google_calendar_create_event', 'Create Calendar Event')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-left cursor-pointer"
                  >
                    <p className="font-bold text-white">Google Calendar Event</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Book meeting on Google Calendar</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
