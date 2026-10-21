import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Brain,
  Shield,
  Bell,
  Save,
  Key,
  Lock,
  RefreshCw,
  CheckCircle2,
  Cpu,
  Sparkles,
  Zap,
  AlertCircle
} from 'lucide-react';
import { AppSettings, AIProvider } from '../types.ts';
import { api } from '../services/api.ts';

interface SettingsViewProps {
  settings: AppSettings;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onRefresh }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    groqConnected: boolean;
    geminiConnected: boolean;
    activeProvider: 'groq' | 'gemini';
    groqModel: string;
    geminiModel: string;
  } | null>(null);
  const [isTestingGroq, setIsTestingGroq] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{
    success: boolean;
    model: string;
    message: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    api.getAiStatus()
      .then((status) => setAiStatus(status))
      .catch((err) => console.error('Failed to load AI status:', err));
  }, []);

  const handleTestGroq = async () => {
    setIsTestingGroq(true);
    setGroqTestResult(null);
    try {
      const res = await api.testGroqConnection();
      setGroqTestResult(res);
      // Refresh AI status
      const updatedStatus = await api.getAiStatus();
      setAiStatus(updatedStatus);
    } catch (err: any) {
      setGroqTestResult({
        success: false,
        model: 'Groq',
        message: 'Test failed',
        error: err.message
      });
    } finally {
      setIsTestingGroq(false);
    }
  };

  const handleSelectProvider = (provider: AIProvider) => {
    setFormData({
      ...formData,
      ai: {
        ...formData.ai,
        provider,
        model: provider === 'groq' ? (aiStatus?.groqModel || 'qwen/qwen3.8-27b') : 'gemini-3.8-flash'
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await api.updateSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateSecret = () => {
    const newSecret = `whsec_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    setFormData({
      ...formData,
      security: {
        ...formData.security,
        webhookSecret: newSecret
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Platform & Engine Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global AI model parameters, human approval thresholds, webhook secrets, and notification preferences.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Platform preferences updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Profile */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <User className="w-4 h-4 text-indigo-400" /> Administrative Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">User Name</label>
              <input
                type="text"
                value={formData.profile.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    profile: { ...formData.profile, name: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Admin Email</label>
              <input
                type="email"
                value={formData.profile.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    profile: { ...formData.profile, email: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Organization / Workspace</label>
              <input
                type="text"
                value={formData.profile.company}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    profile: { ...formData.profile, company: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Timezone</label>
              <select
                value={formData.profile.timezone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    profile: { ...formData.profile, timezone: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: AI Engine Configuration */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" /> AI Provider & Inference Engine
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Active Provider:</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                {formData.ai.provider || 'groq'}
              </span>
            </div>
          </div>

          {/* AI Provider Selector */}
          <div>
            <label className="text-slate-300 block mb-2 font-semibold">Select AI Provider</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Groq */}
              <div
                onClick={() => handleSelectProvider('groq')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  (formData.ai.provider || 'groq') === 'groq'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/50'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-white">Groq</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      aiStatus?.groqConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {aiStatus?.groqConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Ultra-fast OpenAI-compatible LPU inference. Reads server-side <code className="text-slate-300 font-mono text-[10px]">GROQ_API_KEY</code>.
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Model: {aiStatus?.groqModel || 'qwen/qwen3.8-27b'}</span>
                  <span className="text-emerald-400 font-sans font-medium">Sub-second Latency</span>
                </div>
              </div>

              {/* Option 2: Gemini */}
              <div
                onClick={() => handleSelectProvider('gemini')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  formData.ai.provider === 'gemini'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/50'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-white">Google Gemini</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      aiStatus?.geminiConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {aiStatus?.geminiConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Google GenAI SDK integration using <code className="text-slate-300 font-mono text-[10px]">GEMINI_API_KEY</code> environment secret.
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Model: {aiStatus?.geminiModel || 'gemini-3.8-flash'}</span>
                  <span className="text-indigo-400 font-sans font-medium">Google AI Studio</span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Groq Connection Action */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-200 block text-xs">Verify Groq Connection</span>
              <span className="text-[11px] text-slate-400">
                Pings the server-side Groq provider without exposing the secret key.
              </span>
            </div>
            <button
              type="button"
              onClick={handleTestGroq}
              disabled={isTestingGroq}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingGroq ? 'animate-spin' : ''}`} />
              <span>{isTestingGroq ? 'Testing Groq...' : 'Test Groq Connection'}</span>
            </button>
          </div>

          {/* Groq Test Result Feedback */}
          {groqTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                groqTestResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {groqTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <span className="font-bold">
                  {groqTestResult.success ? 'Connection Successful' : 'Connection Failed'}:
                </span>{' '}
                <span>{groqTestResult.message}</span>
                {groqTestResult.error && (
                  <p className="text-[11px] text-rose-400 mt-0.5">{groqTestResult.error}</p>
                )}
              </div>
            </div>
          )}

          {/* Model and Hyperparameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Active Model Identifier</label>
              <input
                type="text"
                disabled
                value={formData.ai.model}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Managed by selected provider configuration
              </span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Temperature ({formData.ai.temperature})
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={formData.ai.temperature}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ai: { ...formData.ai, temperature: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Lower for deterministic logic; higher for creative email drafting
              </span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Auto-Takeover Escalation Threshold ({formData.ai.autoTakeoverThreshold})
              </label>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={formData.ai.autoTakeoverThreshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ai: { ...formData.ai, autoTakeoverThreshold: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                If AI confidence is below this value, conversation status switches to "Human Required"
              </span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Lead Scoring Strictness</label>
              <select
                value={formData.ai.leadScoringStrictness}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ai: { ...formData.ai, leadScoringStrictness: e.target.value as any }
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="lenient">Lenient (Scores 80+ easily)</option>
                <option value="balanced">Balanced (B2B ICP Standard)</option>
                <option value="strict">Strict (Requires confirmed budget & timeline)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Human Approval & Automation Defaults */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Shield className="w-4 h-4 text-amber-400" /> Human Approval & Automation Defaults
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.automationDefaults.requireApprovalForExternalActions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    automationDefaults: {
                      ...formData.automationDefaults,
                      requireApprovalForExternalActions: e.target.checked
                    }
                  })
                }
                className="rounded accent-indigo-500 w-4 h-4"
              />
              <div>
                <span className="font-semibold text-slate-200">
                  Require human review before sending external emails or messages
                </span>
                <p className="text-[11px] text-slate-400">
                  When enabled, automations hold outbound messages in the Approval Queue until approved.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.automationDefaults.testModeDefault}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    automationDefaults: {
                      ...formData.automationDefaults,
                      testModeDefault: e.target.checked
                    }
                  })
                }
                className="rounded accent-indigo-500 w-4 h-4"
              />
              <div>
                <span className="font-semibold text-slate-200">
                  Default to Test Mode for manual workflow runs
                </span>
                <p className="text-[11px] text-slate-400">
                  Safely simulates executions without making changes to CRM or external integrations.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 4: Security & Webhooks */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock className="w-4 h-4 text-rose-400" /> Security & Inbound Webhook Signing
          </h3>

          <div>
            <label className="text-slate-300 block mb-1 font-semibold">Webhook Secret Key</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={formData.security.webhookSecret}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleRegenerateSecret}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Used to verify HMAC signatures on incoming trigger payloads
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};
