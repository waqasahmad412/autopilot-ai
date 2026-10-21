import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Send,
  Edit,
  Trash2,
  X,
  ShieldAlert,
  Brain,
  Sparkles,
  Settings,
  HelpCircle,
  Clock,
  UserCheck,
  Ban,
  Check,
  FlaskConical,
  BookOpen,
  Filter,
  Search,
  ExternalLink,
  Power,
  Zap,
  AlertCircle
} from 'lucide-react';
import {
  GmailSettings,
  GmailEmailRecord,
  GmailStats,
  DetailedGmailStats,
  PreflightCheckResult,
  EmailCategory,
  BusinessKnowledge
} from '../types.ts';
import { api } from '../services/api.ts';
import { googleSignIn, logout, getAccessToken } from '../services/firebaseAuth.ts';

interface GmailAutomationViewProps {
  onNotificationUpdate?: () => void;
}

const ALL_CATEGORIES: EmailCategory[] = [
  'General Question',
  'Product Question',
  'Pricing Question',
  'Customer Support',
  'Sales Inquiry',
  'Appointment Request',
  'Order/Service Request',
  'Complaint',
  'Follow-up',
  'Spam/Unwanted',
  'Newsletter/Marketing',
  'Human Required',
  'Unknown'
];

const INITIAL_SETTINGS: GmailSettings = {
  connectionStatus: 'not_connected',
  connectedEmail: null,
  responseMode: 'test_mode',
  autoReplyCategories: [
    'General Question',
    'Product Question',
    'Pricing Question',
    'Customer Support',
    'Sales Inquiry',
    'Appointment Request',
    'Order/Service Request',
    'Follow-up'
  ],
  confidenceThreshold: 0.85,
  globalAutomation: true,
  emergencyStop: false,
  pollingIntervalSeconds: 30,
  aiProvider: 'groq',
  businessKnowledge: {
    businessName: 'AutoPilot AI Technologies',
    businessDescription: 'AutoPilot AI is an enterprise autonomous customer operations and workflow automation platform. It features autonomous AI agents, visual workflow builders, multi-channel orchestration, live CRM sync, and intelligent email triage and reply systems.',
    productsServices: '1. Starter Plan ($49/month): For solo entrepreneurs and small teams up to 5 users.\n2. Pro Plan ($199/month): Designed for teams of 20 to 500 employees. Advanced autonomous multi-agent workflows, real-time Gmail OAuth with automatic replies, Groq ultra-low-latency inference, CRM sync.\n3. Enterprise Plan (Custom, starts at $899/month): Custom dedicated cloud infrastructure, 99.99% SLA, dedicated support.',
    pricing: 'Starter: $49/mo; Pro: $199/mo; Enterprise: Custom starting at $899/mo with 99.99% SLA. All plans billed monthly or annually with a 20% discount on annual billing.',
    businessHours: 'Monday through Friday, 9:00 AM to 6:00 PM EST. AI Agents and email automations operate 24/7/365 without interruption.',
    contactInfo: 'support@autopilot.ai or +1 (800) 555-AUTO. Sales team: sales@autopilot.ai.',
    policies: 'SOC2 Type II certified and GDPR compliant. 30-day 100% money-back guarantee with no questions asked. Data privacy guarantee: customer emails and data are never used for external model training.',
    faqs: 'Q: What does your software do?\nA: AutoPilot AI automates inbound customer communication, email triage, lead qualification, and business workflows using autonomous AI agents with human-in-the-loop controls.\n\nQ: How much does it cost?\nA: Starter is $49/mo, Pro is $199/mo, and Enterprise starts at $899/mo.\n\nQ: Can you explain your Pro plan?\nA: The Pro plan ($199/mo) includes full autonomous agent workflows, Gmail automatic replies with thread context, Groq ultra-fast LPU inference, lead scoring, CRM integration, and human approval queues.\n\nQ: I have 40 employees, can your system help us?\nA: Absolutely! Our Pro plan is specifically tailored for companies with 20 to 500 employees to eliminate inbox backlog, triage support tickets, and qualify inbound sales inquiries automatically.\n\nQ: How do I connect Gmail?\nA: In the Gmail Automation section, click "Sign in with Google" to authorize your inbox via official Google OAuth 2.0 with one click.\n\nQ: Can your AI answer customer emails?\nA: Yes! AutoPilot AI reads inbound emails, understands questions in any phrasing, references verified business knowledge, and generates or sends natural, professional replies in the same thread.\n\nQ: Tell me about your features.\nA: Key features include autonomous AI agents (Atlas Support, Vanguard Sales, Hermes Email, Chronos Scheduler), visual drag-and-drop workflow builder, real-time Gmail OAuth integration with thread reply context, Groq & Gemini AI engine support, CRM sync, loop protection, and a global Emergency Stop kill-switch.',
    shippingDelivery: 'Instant digital cloud provisioning within 60 seconds of account activation.',
    refundInfo: 'Full refunds granted within 30 days of purchase upon written request to support@autopilot.ai. Requests for refunds are processed by human staff within 24-48 business hours.'
  }
};

const BASE_STATS: GmailStats = {
  emailsReceived: 0,
  emailsProcessed: 0,
  aiRepliesGenerated: 0,
  repliesSent: 0,
  waitingForApproval: 0,
  humanEscalations: 0,
  failedExecutions: 0
};

const INITIAL_STATS: DetailedGmailStats = {
  ...BASE_STATS,
  real: { ...BASE_STATS },
  test: { ...BASE_STATS }
};

export const GmailAutomationView: React.FC<GmailAutomationViewProps> = ({ onNotificationUpdate }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'inbox' | 'test' | 'knowledge' | 'settings' | 'wizard'>('queue');
  const [settings, setSettings] = useState<GmailSettings>(INITIAL_SETTINGS);
  const [emails, setEmails] = useState<GmailEmailRecord[]>([]);
  const [stats, setStats] = useState<DetailedGmailStats>(INITIAL_STATS);
  const [statsViewMode, setStatsViewMode] = useState<'real' | 'test'>('real');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing reply modal / state
  const [editingEmail, setEditingEmail] = useState<GmailEmailRecord | null>(null);
  const [customReplyText, setCustomReplyText] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Reject modal
  const [rejectingEmail, setRejectingEmail] = useState<GmailEmailRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Mandatory Confirmation for Destructive/Mutating Outbound Operations
  const [confirmOutboundSend, setConfirmOutboundSend] = useState<{
    email: GmailEmailRecord;
    text: string;
  } | null>(null);

  // Disconnect Confirmation Modal
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // In-app Alert / Feedback Banner
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Auto-dismiss banner after 5 seconds
  useEffect(() => {
    if (bannerMessage) {
      const timer = setTimeout(() => setBannerMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [bannerMessage]);

  // Test Mode state
  const [testForm, setTestForm] = useState({
    from: 'alex.chen@innovatecorp.com',
    fromName: 'Alex Chen',
    subject: 'Question regarding AutoPilot product features and pricing',
    bodyText: 'Hi team,\n\nCan you please tell me more about your product capabilities and how much the Pro and Enterprise plans cost? We have a team of 40 looking to automate support.\n\nThanks,\nAlex'
  });
  const [testResult, setTestResult] = useState<GmailEmailRecord | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Auto-reply confirmation and preflight checks
  const [showAutoReplyConfirmModal, setShowAutoReplyConfirmModal] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightCheckResult | null>(null);
  const [loadingPreflight, setLoadingPreflight] = useState(false);

  const handleOpenAutoReplyModal = async () => {
    setShowAutoReplyConfirmModal(true);
    setLoadingPreflight(true);
    try {
      const res = await api.getGmailPreflightCheck();
      setPreflightResult(res);
    } catch (err: any) {
      console.error('Failed to load preflight checks:', err);
    } finally {
      setLoadingPreflight(false);
    }
  };

  // Load data
  const loadGmailData = async () => {
    try {
      const [statusRes, emailsRes] = await Promise.all([
        api.getGmailStatus().catch(() => null),
        api.getGmailEmails().catch(() => [])
      ]);
      if (statusRes?.settings) {
        setSettings(statusRes.settings);
      }
      if (statusRes?.stats) {
        setStats(statusRes.stats);
      }
      setEmails(emailsRes || []);
    } catch (err) {
      console.error('Failed to load Gmail data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGmailData();
  }, []);

  // Handle Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setBannerMessage({ type: 'success', text: `Gmail account connected: ${res.user.email}` });
        await loadGmailData();
      }
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Google Sign-In failed: ${err.message || 'Please check popup settings'}` });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    try {
      await logout();
      await api.disconnectGmail();
      setShowDisconnectModal(false);
      setBannerMessage({ type: 'info', text: 'Gmail account disconnected. Automated email monitoring suspended.' });
      await loadGmailData();
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Disconnect failed: ${err.message}` });
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await api.syncGmailInbox();
      await loadGmailData();
      if (onNotificationUpdate) onNotificationUpdate();
      setBannerMessage({
        type: 'success',
        text: `Inbox sync complete. Processed ${res.processedCount || 0} new messages.`
      });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Sync error: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  // Step 1 of Approval: Open explicit confirmation dialog
  const handleRequestApproveSend = (email: GmailEmailRecord, customText?: string) => {
    setConfirmOutboundSend({
      email,
      text: customText || email.proposedReply || ''
    });
  };

  // Step 2 of Approval: Execute the send through authenticated Gmail account
  const executeSendApprovedEmail = async (email: GmailEmailRecord, text: string) => {
    setIsApproving(true);
    try {
      const res = await api.approveGmailEmail(email.id, text);
      if (res.success) {
        setConfirmOutboundSend(null);
        setEditingEmail(null);
        setBannerMessage({
          type: 'success',
          text: `Reply to ${email.fromName || email.from} successfully sent via your authenticated Gmail account!`
        });
        await loadGmailData();
      } else {
        setBannerMessage({
          type: 'error',
          text: res.error || 'Failed to send reply via Gmail.'
        });
      }
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Failed to approve & send: ${err.message}` });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectReply = async () => {
    if (!rejectingEmail) return;
    try {
      await api.rejectGmailEmail(rejectingEmail.id, rejectReason || 'Rejected by supervisor');
      setRejectingEmail(null);
      setRejectReason('');
      setBannerMessage({ type: 'info', text: 'Email reply rejected and removed from queue.' });
      await loadGmailData();
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Rejection error: ${err.message}` });
    }
  };

  const handleTakeOverReply = async (email: GmailEmailRecord) => {
    try {
      const res = await api.takeOverGmailEmail(email.id);
      if (res.success) {
        setBannerMessage({
          type: 'info',
          text: `Manual takeover initiated for email "${email.subject}". High-priority task created for supervisor.`
        });
        await loadGmailData();
        if (onNotificationUpdate) onNotificationUpdate();
      }
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Takeover error: ${err.message}` });
    }
  };

  const handleRunTestMode = async (customPayload?: typeof testForm) => {
    setIsTesting(true);
    setTestResult(null);
    const payload = customPayload || testForm;
    if (customPayload) {
      setTestForm(customPayload);
    }
    try {
      const res = await api.runGmailTestEmail(payload);
      if (res.success) {
        setTestResult(res.email);
        setBannerMessage({ type: 'success', text: `Test email successfully processed via ${settings?.aiProvider === 'gemini' ? 'Gemini' : 'Groq'} AI engine.` });
        await loadGmailData();
      }
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Test execution error: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKnowledge = async (knowledge: BusinessKnowledge) => {
    if (!settings) return;
    try {
      const updated = await api.updateGmailSettings({
        businessKnowledge: knowledge
      });
      setSettings(updated);
      setBannerMessage({ type: 'success', text: 'Business knowledge base saved successfully!' });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Save error: ${err.message}` });
    }
  };

  const handleSaveSettings = async (newSettingsPartial: Partial<GmailSettings>) => {
    try {
      const updated = await api.updateGmailSettings(newSettingsPartial);
      setSettings(updated);
      setBannerMessage({ type: 'success', text: 'Gmail automation settings updated.' });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Settings update error: ${err.message}` });
    }
  };

  const getStatusBadge = (status: GmailEmailRecord['replyStatus']) => {
    switch (status) {
      case 'sent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Sent via Gmail
          </span>
        );
      case 'pending_approval':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Approval
          </span>
        );
      case 'human_required':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Human Required
          </span>
        );
      case 'draft_only':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
            <Edit className="w-3 h-3" /> Draft Only
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Send Failed
          </span>
        );
      case 'skipped':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Skipped / Unwanted
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const pendingApprovalEmails = emails.filter((e) => e.replyStatus === 'pending_approval');
  const filteredEmails = emails.filter((e) => {
    const matchesStatus = filterStatus === 'all' || e.replyStatus === filterStatus;
    const matchesCategory = filterCategory === 'all' || e.classification?.category === filterCategory;
    const matchesSearch =
      !searchQuery ||
      e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.fromName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.snippet.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Dynamic Feedback Banner */}
      {bannerMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-150 ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : bannerMessage.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-indigo-950/80 border-indigo-500/50 text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : bannerMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span className="font-medium">{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer px-1 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Gmail AI Automation Engine</h1>
                {settings?.connectionStatus === 'connected' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> CONNECTED
                  </span>
                ) : settings?.connectionStatus === 'authorization_expired' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    AUTHORIZATION EXPIRED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    NOT CONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {settings?.connectedEmail
                  ? `Authorized Inbox: ${settings.connectedEmail}`
                  : 'Requires Google OAuth 2.0 authorization to access Gmail.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {settings?.connectionStatus === 'connected' ? (
            <>
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Fetch unread emails from Gmail and execute AI classification"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Inbox Now'}</span>
              </button>
              <button
                onClick={() => setShowDisconnectModal(true)}
                className="px-3 py-2 rounded-xl border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="gsi-material-button shadow-lg transition-all cursor-pointer"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper flex items-center gap-2.5">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-semibold text-slate-800">
                  {isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          )}

          {/* Emergency Stop Switch */}
          {settings && (
            <button
              onClick={() => handleSaveSettings({ emergencyStop: !settings.emergencyStop })}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                settings.emergencyStop
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Global Emergency Switch: Suspends all automated outbound sending"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{settings.emergencyStop ? 'EMERGENCY STOPPED' : 'Emergency Stop'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Emergency Stop Warning Banner */}
      {settings?.emergencyStop && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="font-bold text-rose-100">GLOBAL EMERGENCY SWITCH ACTIVATED</h4>
              <p className="text-[11px] text-rose-300 mt-0.5">
                All automated email sending is paused. Incoming emails will continue to be classified, but responses will be held for human review.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSaveSettings({ emergencyStop: false })}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            Resume Automations
          </button>
        </div>
      )}

      {/* Operational Status Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Response Mode:</span>
            {settings?.responseMode === 'auto_reply' ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                <Send className="w-3 h-3" /> MODE 3 — REAL AUTO REPLY
              </span>
            ) : settings?.responseMode === 'human_approval' ? (
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
              <Brain className="w-3 h-3" /> {settings?.aiProvider === 'gemini' ? 'Gemini 3.8 Flash' : 'Groq LPU (qwen/qwen3.8-27b)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <RefreshCw className="w-3 h-3 text-slate-500" />
            <span>Last Sync:</span>
            <strong className="text-slate-300 font-mono">
              {settings?.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Continuous polling (30s)'}
            </strong>
          </div>
        </div>

        {/* Real vs Test Filter Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setStatsViewMode('real')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              statsViewMode === 'real'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            REAL GMAIL ACTIVITY
          </button>
          <button
            onClick={() => setStatsViewMode('test')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              statsViewMode === 'test'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TEST / SANDBOX ACTIVITY
          </button>
        </div>
      </div>

      {/* Statistics Grid (Distinctly Separated: Real vs Test) */}
      {(() => {
        const activeStats = statsViewMode === 'real' ? (stats.real || stats) : (stats.test || stats);
        const modeLabel = statsViewMode === 'real' ? 'Live bahiw271@gmail.com' : 'Dry-run Sandbox';
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Emails Received</span>
              <span className="text-lg font-bold text-white mt-1 block">{activeStats?.emailsReceived ?? 0}</span>
              <span className="text-[10px] text-slate-500">{modeLabel}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Processed</span>
              <span className="text-lg font-bold text-indigo-400 mt-1 block">{activeStats?.emailsProcessed ?? 0}</span>
              <span className="text-[10px] text-slate-500">AI intent extracted</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">AI Replies Generated</span>
              <span className="text-lg font-bold text-sky-400 mt-1 block">{activeStats?.aiRepliesGenerated ?? 0}</span>
              <span className="text-[10px] text-slate-500">Grounded in KB</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Replies Sent</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">{activeStats?.repliesSent ?? 0}</span>
              <span className="text-[10px] text-slate-500">Delivered via Gmail</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">In Approval Queue</span>
              <span className="text-lg font-bold text-amber-400 mt-1 block">{activeStats?.waitingForApproval ?? 0}</span>
              <span className="text-[10px] text-slate-500">Awaiting supervisor</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Human Escalated</span>
              <span className="text-lg font-bold text-rose-400 mt-1 block">{activeStats?.humanEscalations ?? 0}</span>
              <span className="text-[10px] text-slate-500">Sensitive / Low conf</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Failed</span>
              <span className="text-lg font-bold text-slate-300 mt-1 block">{activeStats?.failedExecutions ?? 0}</span>
              <span className="text-[10px] text-slate-500">Execution errors</span>
            </div>
          </div>
        );
      })()}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-semibold gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'queue'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Approval Queue</span>
          {pendingApprovalEmails.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingApprovalEmails.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inbox')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'inbox'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-4 h-4 text-indigo-400" />
          <span>Processed Inbox ({emails.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'test'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-emerald-400" />
          <span>Test Mode Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab('knowledge')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'knowledge'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-sky-400" />
          <span>Business Knowledge Base</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'settings'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4 text-purple-400" />
          <span>Rules & Mode Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('wizard')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'wizard'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Setup Wizard</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: APPROVAL QUEUE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Dedicated Human Approval Queue
              </h3>
              <p className="text-xs text-slate-400">
                Emails classified in approval-required categories, low AI confidence, or when Human Approval mode is enabled.
              </p>
            </div>
          </div>

          {pendingApprovalEmails.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto" />
              <p className="font-semibold text-slate-300">Approval queue is clear</p>
              <p className="text-slate-500 text-[11px]">
                {settings?.connectionStatus === 'connected'
                  ? 'No incoming emails are currently awaiting review. Click "Sync Inbox Now" to check for new messages.'
                  : 'Connect your Gmail account to start processing incoming emails.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovalEmails.map((email) => (
                <div
                  key={email.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4 shadow-xl"
                >
                  {/* Top Sender & Subject */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{email.fromName || email.from}</span>
                        <span className="text-xs text-slate-400 font-mono">({email.from})</span>
                      </div>
                      <h4 className="text-xs font-semibold text-indigo-300 mt-0.5">{email.subject}</h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 text-[11px] font-mono">
                        {new Date(email.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Classification & Reasoning Box */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">AI Category</span>
                      <span className="font-bold text-white mt-0.5 block">{email.classification?.category || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Confidence</span>
                      <span className="font-mono font-bold text-emerald-400 mt-0.5 block">
                        {email.classification?.confidence ? `${Math.round(email.classification.confidence * 100)}%` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">AI Assessment Reason</span>
                      <span className="text-slate-300 text-[11px] mt-0.5 block line-clamp-2">
                        {email.classification?.reason || 'Standard classification'}
                      </span>
                    </div>
                  </div>

                  {/* Original Email Content */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Original Inbound Message
                    </span>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                      {email.bodyText || email.snippet}
                    </div>
                  </div>

                  {/* Proposed AI Reply */}
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                      Proposed Reply (Generated via Gemini using Business Knowledge)
                    </span>
                    <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-100 leading-relaxed font-sans max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                      {email.proposedReply}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEmail(email);
                          setCustomReplyText(email.proposedReply || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Draft</span>
                      </button>
                      <button
                        onClick={() => setRejectingEmail(email)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleRequestApproveSend(email)}
                      disabled={isApproving}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isApproving ? 'Sending through Gmail...' : 'Approve & Send via Gmail'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PROCESSED INBOX AUDIT LIST */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sender, subject, content..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent via Gmail</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="human_required">Human Required</option>
                <option value="draft_only">Draft Only</option>
                <option value="skipped">Skipped / Spam</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email Cards Table / List */}
          <div className="space-y-3">
            {filteredEmails.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
                {emails.length === 0
                  ? 'No real Gmail activity yet. Connect Gmail and click "Sync Inbox Now".'
                  : 'No emails match the selected filters.'}
              </div>
            ) : (
              filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-white">{email.fromName || email.from}</span>
                      <span className="text-slate-400 font-mono text-[11px]">&lt;{email.from}&gt;</span>
                      {email.isTest && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px] font-bold">
                          TEST SIMULATION
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(email.replyStatus)}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <p className="font-semibold text-indigo-300">{email.subject}</p>
                  <p className="text-slate-400 line-clamp-2 leading-relaxed text-[11px]">
                    {email.bodyText || email.snippet}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                    <div className="flex items-center gap-3">
                      <span>Category: <strong className="text-slate-300">{email.classification?.category || '—'}</strong></span>
                      {email.classification?.confidence !== undefined && (
                        <span>Confidence: <strong className="text-emerald-400">{Math.round(email.classification.confidence * 100)}%</strong></span>
                      )}
                      <span>Gmail ID: <strong className="text-slate-400">{email.gmailMessageId}</strong></span>
                    </div>

                    {email.sentMessageId && (
                      <span className="text-emerald-400">
                        Sent Message ID: {email.sentMessageId}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: TEST MODE SANDBOX */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'test' && (
        <div className="space-y-5 max-w-4xl">
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-200">TEST MODE — NO REAL EMAIL WILL BE SENT</h4>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                Test Mode safely simulates the full Gmail pipeline: extracts incoming customer email fields, calls Gemini to classify category and assess confidence, and formats a reply against your business knowledge base without sending anything externally.
              </p>
            </div>
          </div>

          {/* Quick Preset Questions (Requirement 4 & 20) */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Quick Test Scenarios (Click any preset to simulate complete pipeline):
              </span>
              <span className="text-[10px] text-slate-500">1-click AI inference</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: 'What does your software do & cost?',
                  subject: 'Software capabilities and pricing',
                  body: 'Hello, what does your AI platform do and how much does it cost?'
                },
                {
                  label: 'Explain Pro plan',
                  subject: 'Pro plan inquiry',
                  body: 'Can you explain your Pro plan in detail and what features are included?'
                },
                {
                  label: '40 employees fit',
                  subject: 'Team fit question',
                  body: 'I have 40 employees, can your system help us automate our customer communications?'
                },
                {
                  label: 'How do I connect Gmail?',
                  subject: 'Gmail setup inquiry',
                  body: 'How do I connect my Gmail account to AutoPilot AI?'
                },
                {
                  label: 'Can AI answer customer emails?',
                  subject: 'Email automation capabilities',
                  body: 'Can your AI answer incoming customer emails automatically in the same thread?'
                },
                {
                  label: 'Tell me about features',
                  subject: 'Features inquiry',
                  body: 'Tell me about your platform features and what autonomous agents do.'
                },
                {
                  label: 'Full Refund Request (Tests Human Escalation)',
                  subject: 'Urgent: I want a refund',
                  body: 'I want a full refund for my subscription immediately. Please process my money back.'
                },
                {
                  label: 'Follow-up thread question',
                  subject: 'Re: Software capabilities and pricing',
                  body: 'Thanks for the quick answer! Does the Pro plan also include CRM synchronization and support for custom workflows?'
                }
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    handleRunTestMode({
                      from: 'prospect@acmecorp.com',
                      fromName: 'Sarah Jenkins',
                      subject: preset.subject,
                      bodyText: preset.body
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-[11px] font-medium cursor-pointer"
                >
                  &ldquo;{preset.label}&rdquo;
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit className="w-4 h-4 text-emerald-400" /> Custom Test Email Payload
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Sender Name</label>
                <input
                  type="text"
                  value={testForm.fromName}
                  onChange={(e) => setTestForm({ ...testForm, fromName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Sender Email</label>
                <input
                  type="email"
                  value={testForm.from}
                  onChange={(e) => setTestForm({ ...testForm, from: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Subject Line</label>
              <input
                type="text"
                value={testForm.subject}
                onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Email Body</label>
              <textarea
                rows={5}
                value={testForm.bodyText}
                onChange={(e) => setTestForm({ ...testForm, bodyText: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleRunTestMode()}
                disabled={isTesting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{isTesting ? 'Simulating Pipeline...' : 'Run Test Pipeline'}</span>
              </button>
            </div>
          </div>

          {/* Test Mode Simulation Result */}
          {testResult && (
            <div className="p-5 rounded-2xl bg-slate-900 border-2 border-indigo-500/50 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pipeline Simulation Succeeded
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
                  NO REAL EMAIL SENT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Classified Category</span>
                  <span className="font-bold text-white mt-1 block">{testResult.classification?.category}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Confidence Score</span>
                  <span className="font-bold text-emerald-400 mt-1 block">
                    {Math.round((testResult.classification?.confidence || 0) * 100)}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Simulated Action</span>
                  <span className="font-bold text-indigo-300 mt-1 block capitalize">
                    {testResult.replyStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  AI Classification Reasoning
                </span>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  {testResult.classification?.reason}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Generated Reply (What WOULD be sent or drafted)
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                  {testResult.proposedReply}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: BUSINESS KNOWLEDGE BASE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'knowledge' && settings && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveKnowledge(settings.businessKnowledge);
          }}
          className="space-y-5 max-w-4xl text-xs"
        >
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200">
            <h4 className="font-bold text-indigo-300">Grounding Knowledge Base</h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              Gemini strictly refers to this business knowledge to answer pricing, product, contact, policy, and FAQ questions. It is instructed <strong>never to invent</strong> unverified rates, SLA dates, or refund terms.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Business Name</label>
                <input
                  type="text"
                  value={settings.businessKnowledge.businessName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessKnowledge: { ...settings.businessKnowledge, businessName: e.target.value }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Contact Email / Phone</label>
                <input
                  type="text"
                  value={settings.businessKnowledge.contactInfo}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessKnowledge: { ...settings.businessKnowledge, contactInfo: e.target.value }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Business Description</label>
              <textarea
                rows={2}
                value={settings.businessKnowledge.businessDescription}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessKnowledge: { ...settings.businessKnowledge, businessDescription: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Products & Services</label>
                <textarea
                  rows={3}
                  value={settings.businessKnowledge.productsServices}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessKnowledge: { ...settings.businessKnowledge, productsServices: e.target.value }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Pricing Information</label>
                <textarea
                  rows={3}
                  value={settings.businessKnowledge.pricing}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessKnowledge: { ...settings.businessKnowledge, pricing: e.target.value }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Business Hours</label>
                <input
                  type="text"
                  value={settings.businessKnowledge.businessHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessKnowledge: { ...settings.businessKnowledge, businessHours: e.target.value }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Refund Policy</label>
                <input
                  type="text"
                  value={settings.businessKnowledge.refundInfo}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessKnowledge: { ...settings.businessKnowledge, refundInfo: e.target.value }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Frequently Asked Questions (FAQs)</label>
              <textarea
                rows={4}
                value={settings.businessKnowledge.faqs}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    businessKnowledge: { ...settings.businessKnowledge, faqs: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
              >
                Save Knowledge Base
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: RULES & AUTOMATION SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-5 max-w-4xl text-xs">
          {/* AI Provider Selector Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" /> AI Provider for Gmail Processing
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                Active: {settings.aiProvider || 'groq'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSaveSettings({ aiProvider: 'groq' })}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  (settings.aiProvider || 'groq') === 'groq'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/40'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-white">Groq Provider</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Connected
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Fastest response & classification. Powered by server-side Groq API using <code className="text-slate-300 font-mono text-[10px]">GROQ_API_KEY</code>.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSaveSettings({ aiProvider: 'gemini' })}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  settings.aiProvider === 'gemini'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/40'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-white">Google Gemini</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Google GenAI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Google Gemini 3.8 Flash model via Google AI Studio API key integration.
                </p>
              </button>
            </div>
          </div>

          {/* Response Mode Selector (Requirement 15 & 22) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Gmail Automation Response Mode</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">
                  TEST MODE ACTIVE BY DEFAULT
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Configure how the AI handles incoming customer inquiries to {settings.connectedEmail || 'bahiw271@gmail.com'}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* MODE 1: TEST MODE */}
              <button
                type="button"
                onClick={() => handleSaveSettings({ responseMode: 'test_mode' })}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  settings.responseMode === 'test_mode'
                    ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500/50'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="font-bold text-xs text-sky-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4" /> MODE 1 — TEST MODE
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">SAFE</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 font-medium">
                  Process real messages &amp; generate AI replies without sending.
                </p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Processes live incoming emails, extracts intent, and generates grounded responses. Output is displayed in the dashboard and audit log. <strong>Zero outbound emails are sent.</strong>
                </p>
              </button>

              {/* MODE 2: HUMAN APPROVAL */}
              <button
                type="button"
                onClick={() => handleSaveSettings({ responseMode: 'human_approval' })}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  settings.responseMode === 'human_approval'
                    ? 'border-amber-500 bg-amber-950/40 text-white ring-1 ring-amber-500/50'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="font-bold text-xs text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> MODE 2 — HUMAN APPROVAL
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">SUPERVISED</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 font-medium">
                  Generate replies and queue for one-click human review.
                </p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  AI generates verified replies and routes them into the Approval Queue. Replies are only dispatched after a supervisor clicks "Approve &amp; Send" or edits the text.
                </p>
              </button>

              {/* MODE 3: REAL AUTO REPLY */}
              <button
                type="button"
                onClick={() => {
                  if (settings.responseMode !== 'auto_reply') {
                    handleOpenAutoReplyModal();
                  }
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  settings.responseMode === 'auto_reply'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white ring-1 ring-emerald-500/50'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="font-bold text-xs text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Send className="w-4 h-4" /> MODE 3 — REAL AUTO REPLY
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">AUTOMATIC</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 font-medium">
                  Automatically send verified replies for safe business questions.
                </p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Directly delivers grounded replies through your Gmail account in real time for safe, high-confidence business questions. Sensitive topics and complaints remain human-supervised.
                </p>
              </button>
            </div>
          </div>

          {/* Intelligent Scope & Safety Policy (Requirements 10, 11, 12) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Intelligent Business Inquiry Policy &amp; Safety Guardrails
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CONTENT-BASED DECISION ENGINE
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                The AI dynamically determines the appropriate response based on the sender's actual question. Template restrictions have been removed in favor of real natural-language understanding.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left Column: Normal Business Inquiries */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h4 className="font-bold text-slate-200">Enabled for Automatic Replies</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  In Real Auto Reply mode, incoming emails with confidence &ge; 85% and verified facts in the Business Knowledge Base receive automatic Gmail replies:
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <strong>Product &amp; Feature Questions:</strong> Capabilities, integrations, compatibility.
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <strong>Pricing &amp; Plans:</strong> Cost breakdowns, Starter vs Pro vs Enterprise.
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <strong>General Company Questions:</strong> Business info, hours, overview.
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <strong>Setup &amp; How-To Guides:</strong> How to connect Gmail, onboarding steps.
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <strong>Sales Inquiries:</strong> Organization size fit (e.g. 40 employees), quotes.
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <strong>Customer Support:</strong> Issues answerable from approved knowledge base.
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <strong>Follow-up Inquiries:</strong> Context-aware replies in active threads.
                  </li>
                </ul>
              </div>

              {/* Right Column: Guaranteed Human Review */}
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="font-bold text-amber-200">Guaranteed Human Review Required</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The system <strong>NEVER auto-sends</strong> for sensitive topics. These cases are automatically flagged and routed to the Human Approval Queue:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Refunds &amp; Chargebacks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Payment &amp; Billing Disputes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Legal Matters &amp; Lawsuits</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Contracts &amp; NDAs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Security Incidents &amp; Breaches</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Account Ownership &amp; Lockout</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Password Reset Demands</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Personal Identity Data (SSN)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>Angry / Serious Complaints</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Confidence &lt; 85% Threshold</span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-400/80 pt-1 border-t border-slate-800">
                  &bull; If knowledge base lacks specific facts, AI says so and escalates to human review.
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Safety & Polling */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Confidence Safety & Operational Rules</h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    AI Confidence Threshold: {Math.round(settings.confidenceThreshold * 100)}%
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Below this value &rarr; Flagged as Human Required
                  </span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="0.99"
                  step="0.01"
                  value={settings.confidenceThreshold}
                  onChange={(e) => handleSaveSettings({ confidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Automated Background Polling</span>
                  <span className="text-[11px] text-slate-400">
                    Checks Gmail inbox every {settings.pollingIntervalSeconds} seconds for new customer inquiries.
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.globalAutomation}
                    onChange={(e) => handleSaveSettings({ globalAutomation: e.target.checked })}
                    className="rounded accent-indigo-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-200">Enabled</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: FIRST-TIME SETUP WIZARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'wizard' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-3xl space-y-6 text-xs">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> AutoPilot AI Gmail Setup Wizard
            </h3>
            <p className="text-slate-400 mt-1">
              Follow these 6 steps to configure and verify real Gmail AI email automation.
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Step 1</span>
                <h4 className="font-bold text-white text-xs">Connect Gmail Account via OAuth 2.0</h4>
                <p className="text-slate-400 text-[11px]">
                  Status: {settings?.connectionStatus === 'connected' ? (
                    <strong className="text-emerald-400">Connected ({settings.connectedEmail})</strong>
                  ) : (
                    <strong className="text-amber-400">Not Connected</strong>
                  )}
                </p>
              </div>
              {settings?.connectionStatus === 'connected' ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  ✓ Done
                </span>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                >
                  Connect Now
                </button>
              )}
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Step 2</span>
                <h4 className="font-bold text-white text-xs">Choose Response Mode</h4>
                <p className="text-slate-400 text-[11px]">
                  Current mode: <strong className="text-slate-200 capitalize">{settings?.responseMode.replace('_', ' ')}</strong>
                </p>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Configure Mode
              </button>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Step 3</span>
                <h4 className="font-bold text-white text-xs">Enter Business Information</h4>
                <p className="text-slate-400 text-[11px]">
                  Products, verified pricing, refund policies, FAQs for Gemini to reference.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('knowledge')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Edit Knowledge
              </button>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Step 4</span>
                <h4 className="font-bold text-white text-xs">Configure Allowed Auto-Reply Categories</h4>
                <p className="text-slate-400 text-[11px]">
                  {settings?.autoReplyCategories.length} categories enabled for automated answers.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Select Categories
              </button>
            </div>

            {/* Step 5 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Step 5</span>
                <h4 className="font-bold text-white text-xs">Run a Safe Test Mode Email</h4>
                <p className="text-slate-400 text-[11px]">
                  Simulate Gemini understanding and drafting without sending external emails.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('test')}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 cursor-pointer"
              >
                Run Test Simulation
              </button>
            </div>

            {/* Step 6 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Step 6</span>
                <h4 className="font-bold text-white text-xs">Verify Real Mode Readiness</h4>
                <p className="text-slate-400 text-[11px]">
                  {settings?.connectionStatus === 'connected' ? (
                    <span className="text-emerald-400 font-bold">AutoPilot AI Gmail Automation is ready.</span>
                  ) : (
                    <span className="text-amber-400">Complete Gmail connection in Step 1 to activate.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT DRAFT BEFORE APPROVING */}
      {/* ------------------------------------------------------------- */}
      {editingEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Edit Draft Reply Before Sending</h3>
              </div>
              <button onClick={() => setEditingEmail(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-semibold block">To: {editingEmail.fromName} ({editingEmail.from})</span>
                <span className="text-slate-300 block mt-0.5 font-semibold">Subject: Re: {editingEmail.subject}</span>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Reply Message Body</label>
                <textarea
                  rows={8}
                  value={customReplyText}
                  onChange={(e) => setCustomReplyText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-sans leading-relaxed text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingEmail(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={() => handleRequestApproveSend(editingEmail, customReplyText)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isApproving ? 'Sending...' : 'Review & Approve via Gmail'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANDATORY CONFIRMATION FOR OUTBOUND GMAIL MUTATION */}
      {/* ------------------------------------------------------------- */}
      {confirmOutboundSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Send className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">Confirm Outbound Email Delivery</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Are you sure you want to send this email reply to{' '}
                  <strong className="text-white">
                    {confirmOutboundSend.email.fromName || confirmOutboundSend.email.from}
                  </strong>{' '}
                  (<span className="font-mono text-indigo-300">{confirmOutboundSend.email.from}</span>)?
                </p>
              </div>
              <button
                onClick={() => setConfirmOutboundSend(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">From Account:</span>
                  <span className="font-mono text-slate-200">
                    {settings?.connectedEmail || 'Authenticated Google Account'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Subject Line:</span>
                  <span className="font-semibold text-slate-200">
                    Re: {confirmOutboundSend.email.subject}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Gmail Thread ID:</span>
                  <span className="font-mono text-slate-400 text-[10px]">
                    {confirmOutboundSend.email.gmailThreadId}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold text-[10px] uppercase tracking-wider">
                  Outbound Email Message Preview
                </label>
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap custom-scrollbar font-sans">
                  {confirmOutboundSend.text}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  This action will transmit an authentic RFC 2822 email directly via Google Workspace API.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmOutboundSend(null)}
                  disabled={isApproving}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={() => executeSendApprovedEmail(confirmOutboundSend.email, confirmOutboundSend.text)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isApproving ? 'Sending through Gmail API...' : 'Confirm & Send Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DISCONNECT GMAIL CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Disconnect Gmail Integration?</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Disconnecting will revoke the current Google OAuth session token on the server.
                </p>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Automated background inbox polling, Gemini AI email triage, and outbound email dispatching will be paused until you re-authorize.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: REJECT REPLY */}
      {/* ------------------------------------------------------------- */}
      {rejectingEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Reject Proposed Reply</h3>
              <button onClick={() => setRejectingEmail(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Rejecting will cancel sending an automated reply for <strong>"{rejectingEmail.subject}"</strong>.
              </p>

              <div>
                <label className="text-slate-400 block mb-1">Reason for Rejection (Optional)</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Needs custom pricing calculation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingEmail(null)}
                  className="px-4 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectReply}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PREFLIGHT VERIFICATION & AUTO-REPLY WARNING (Req 21 & 23) */}
      {/* ------------------------------------------------------------- */}
      {showAutoReplyConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/60 shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Pre-Flight Safety Verification</h3>
                  <p className="text-xs text-slate-400">Prerequisites check before enabling Real Auto Reply</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoReplyConfirmModal(false)}
                className="text-slate-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Warning Message Box */}
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                WARNING: LIVE OUTBOUND GMAIL DISPATCH
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Enabling <strong>MODE 3: REAL AUTO REPLY</strong> allows AutoPilot AI to send real emails from your authenticated Gmail account (<span className="text-amber-200 font-mono">{settings.connectedEmail || 'bahiw271@gmail.com'}</span>) to incoming customers automatically for safe, high-confidence business inquiries.
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Sensitive topics (refunds, disputes, legal, contracts, security, password resets, and low confidence &lt; 85%) will continue to be safely held in the Human Approval Queue.
              </p>
            </div>

            {/* 8 Prerequisite Checks Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Verification Pipeline Status:
              </span>

              {loadingPreflight ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Running automated pre-flight checks...</span>
                </div>
              ) : preflightResult ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'gmailOAuth', title: '1. Gmail OAuth Valid', check: preflightResult.checks.gmailOAuth },
                    { key: 'gmailSendScope', title: '2. Gmail Send Scope', check: preflightResult.checks.gmailSendScope },
                    { key: 'groqConnection', title: '3. Groq AI Inference', check: preflightResult.checks.groqConnection },
                    { key: 'businessKnowledge', title: '4. Knowledge Base', check: preflightResult.checks.businessKnowledge },
                    { key: 'duplicateProtection', title: '5. Duplicate Protection', check: preflightResult.checks.duplicateProtection },
                    { key: 'threadReply', title: '6. Thread Reply Headers', check: preflightResult.checks.threadReply },
                    { key: 'emergencyStop', title: '7. Emergency Stop Ready', check: preflightResult.checks.emergencyStop },
                    { key: 'testMode', title: '8. Test Mode Sandbox', check: preflightResult.checks.testMode }
                  ].map(({ key, title, check }) => (
                    <div
                      key={key}
                      className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                        check.passed
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] block">{title}</span>
                        <p className="text-[10px] text-slate-400 leading-tight truncate" title={check.message}>
                          {check.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                  Pre-flight check data unavailable.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">
                You can disengage or trigger Emergency Stop at any time.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAutoReplyConfirmModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(preflightResult && !preflightResult.canEnableRealAutoReply)}
                  onClick={() => {
                    setShowAutoReplyConfirmModal(false);
                    handleSaveSettings({ responseMode: 'auto_reply' });
                  }}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    preflightResult?.canEnableRealAutoReply
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>I Understand, Enable Real Auto Reply</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
