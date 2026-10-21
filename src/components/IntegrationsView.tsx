import React, { useState } from 'react';
import {
  Network,
  Mail,
  FileSpreadsheet,
  Calendar,
  MessageSquare,
  Hash,
  Webhook,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Settings,
  RefreshCw,
  X,
  Info,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Integration } from '../types.ts';
import { api } from '../services/api.ts';
import { googleSignIn, logout as googleLogout } from '../services/firebaseAuth.ts';

interface IntegrationsViewProps {
  integrations: Integration[];
  onRefresh: () => void;
  onNavigateToView?: (view: any) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  integrations,
  onRefresh,
  onNavigateToView
}) => {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const getIntegrationIcon = (key: string) => {
    switch (key) {
      case 'gmail':
        return <Mail className="w-6 h-6 text-rose-400" />;
      case 'google_sheets':
        return <FileSpreadsheet className="w-6 h-6 text-emerald-400" />;
      case 'google_calendar':
        return <Calendar className="w-6 h-6 text-sky-400" />;
      case 'whatsapp':
        return <MessageSquare className="w-6 h-6 text-emerald-500" />;
      case 'slack':
        return <Hash className="w-6 h-6 text-purple-400" />;
      default:
        return <Webhook className="w-6 h-6 text-indigo-400" />;
    }
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Error / Auth Expired
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" /> Not Connected
          </span>
        );
    }
  };

  const openConfigModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    setTestResult(null);
    const initialConfig: Record<string, string> = {};
    integration.requiredFields.forEach((field) => {
      initialConfig[field.key] = (integration.config as any)[field.key] || '';
    });
    setConfigForm(initialConfig);
  };

  const handleGoogleOAuthConnect = async () => {
    setIsSigningInGoogle(true);
    setTestResult(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setTestResult({
          success: true,
          message: `Successfully authenticated with Google as ${res.user.email}. Gmail AI automation active!`
        });
        onRefresh();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Google OAuth sign-in was interrupted.'
      });
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntegration || isTesting) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      // 1. Save config first
      await api.updateIntegration(selectedIntegration.key, {
        config: configForm
      });

      // 2. Run real verification check
      const testRes = await api.testIntegration(selectedIntegration.key);
      setTestResult({
        success: testRes.success,
        message: testRes.message
      });

      onRefresh();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedIntegration) return;
    if (selectedIntegration.key === 'gmail') {
      await googleLogout();
      await api.disconnectGmail();
      setSelectedIntegration(null);
      onRefresh();
      return;
    }

    await api.updateIntegration(selectedIntegration.key, {
      status: 'not_connected',
      config: {}
    });
    setSelectedIntegration(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            Integrations & API Connectors
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Connect verified external channels (Google Workspace, WhatsApp Cloud API, Slack, Webhooks) with cryptographic validation.
          </p>
        </div>

        {onNavigateToView && (
          <button
            onClick={() => onNavigateToView('gmail_automation')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer self-start sm:self-auto"
          >
            <Mail className="w-4 h-4" />
            <span>Open Gmail AI Automation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Security Guidance Banner */}
      <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-indigo-300">Production Security Policy</h4>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            AutoPilot AI enforces least-privilege API authorization. Integration credentials remain strictly server-side and are never exposed in browser bundles. Integrations remain in <strong>"Not Connected"</strong> state until valid authentication parameters are verified.
          </p>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  {getIntegrationIcon(item.key)}
                </div>
                {getStatusBadge(item.status)}
              </div>

              <div className="mt-3">
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {item.errorMessage && (
                <div className="mt-3 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300">
                  {item.errorMessage}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                {item.lastSync ? `Synced: ${new Date(item.lastSync).toLocaleTimeString()}` : 'Never connected'}
              </span>

              <button
                onClick={() => openConfigModal(item)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration & Credentials Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {getIntegrationIcon(selectedIntegration.key)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedIntegration.name}</h3>
                  <div className="mt-0.5">{getStatusBadge(selectedIntegration.status)}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedIntegration.key === 'gmail' ? (
              /* Dedicated Real Google OAuth UI for Gmail */
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Google OAuth 2.0 Security
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    AutoPilot AI connects directly to your Google Workspace account through Google OAuth 2.0. No password or secret keys are stored locally.
                  </p>
                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                    <p className="font-medium text-slate-300">Authorized Scopes Requested:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400 font-mono text-[10px]">
                      <li>https://www.googleapis.com/auth/gmail.readonly (Read incoming emails)</li>
                      <li>https://www.googleapis.com/auth/gmail.send (Send approved replies)</li>
                      <li>https://www.googleapis.com/auth/gmail.compose (Create drafts)</li>
                    </ul>
                  </div>
                </div>

                {selectedIntegration.status === 'connected' ? (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="font-bold block">Connected to Gmail Account</span>
                        <span className="text-[11px] text-emerald-300 font-mono">
                          {(selectedIntegration.config as any)?.accountEmail || 'Authorized Account'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
                      {onNavigateToView && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIntegration(null);
                            onNavigateToView('gmail_automation');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Open Gmail Automation Dashboard</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                    <p className="text-slate-300 text-xs">
                      Authenticate with your Google account to grant AutoPilot permission to monitor your inbox and draft responses.
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={handleGoogleOAuthConnect}
                        disabled={isSigningInGoogle}
                        className="gsi-material-button shadow-lg cursor-pointer"
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
                            {isSigningInGoogle ? 'Connecting to Google...' : 'Sign in with Google'}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedIntegration(null)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Standard API Integrations Form */
              <form onSubmit={handleTestAndSave} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] leading-relaxed">
                  <p>
                    <strong>Setup Instructions:</strong> Please provide your authenticated API parameters below. Credentials are encrypted and validated in real time against the backend.
                  </p>
                </div>

                {/* Dynamic Credential Fields */}
                {selectedIntegration.requiredFields.map((field) => (
                  <div key={field.key}>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      {field.name} {field.required && <span className="text-rose-400">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={configForm[field.key] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        value={configForm[field.key] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      />
                    )}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {field.description}
                    </span>
                  </div>
                ))}

                {/* Test Connection Result Alert */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  {selectedIntegration.status === 'connected' ? (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : <span />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIntegration(null)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isTesting}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isTesting ? 'Validating...' : 'Verify & Connect'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
