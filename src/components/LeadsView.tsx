import React, { useState } from 'react';
import {
  Target,
  Plus,
  Search,
  Brain,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Clock,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { Lead } from '../types.ts';
import { api } from '../services/api.ts';

interface LeadsViewProps {
  leads: Lead[];
  onRefresh: () => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({ leads, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isQualifying, setIsQualifying] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'Contact Us Form',
    interest: 'AI Workflows & Email Automation',
    status: 'new' as Lead['status'],
    notes: 'Inbound prospect seeking enterprise automation trial.'
  });

  const filtered = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      source: 'Contact Us Form',
      interest: 'AI Workflows & Email Automation',
      status: 'new',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      await api.updateLead(editingLead.id, formData);
    } else {
      await api.createLead({ ...formData, autoScore: true });
    }
    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = async (lead: Lead) => {
    if (confirm(`Delete lead "${lead.name}"?`)) {
      await api.deleteLead(lead.id);
      if (selectedLead?.id === lead.id) setSelectedLead(null);
      onRefresh();
    }
  };

  const handleTriggerAIQualification = async (leadId: string) => {
    setIsQualifying(true);
    try {
      const updated = await api.aiQualifyLead(leadId);
      setSelectedLead(updated);
      onRefresh();
    } finally {
      setIsQualifying(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          {score} / 100 • Hot Tier
        </span>
      );
    } else if (score >= 60) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          {score} / 100 • Warm
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
          {score} / 100 • Cold
        </span>
      );
    }
  };

  const getStatusBadge = (status: Lead['status']) => {
    switch (status) {
      case 'qualified':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Qualified</span>;
      case 'interested':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">Interested</span>;
      case 'follow_up':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Follow Up</span>;
      case 'converted':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">Converted</span>;
      case 'not_interested':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">Not Interested</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">New Inbound</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Lead Qualification & Scoring
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Server-side AI evaluation of prospect intent, BANT parameters, buying signals, and scoring rationale.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Lead</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, company..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-medium">Stage:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Stages</option>
            <option value="qualified">Qualified</option>
            <option value="interested">Interested</option>
            <option value="follow_up">Follow Up</option>
            <option value="new">New Inbound</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {/* Leads Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((lead) => (
          <div
            key={lead.id}
            onClick={() => setSelectedLead(lead)}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-lg cursor-pointer group"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {lead.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{lead.company || 'Private Domain'}</span>
                    <span>•</span>
                    <span>{lead.source}</span>
                  </p>
                </div>
                {getScoreBadge(lead.score)}
              </div>

              <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Expressed Interest:</span>
                  {getStatusBadge(lead.status)}
                </div>
                <p className="text-slate-300 font-medium">{lead.interest}</p>
              </div>

              {/* AI Assessment Callout Preview */}
              {lead.aiAssessment && (
                <div className="mt-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-1">
                  <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" /> Automated AI Assessment
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {Math.round(lead.aiAssessment.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                    {lead.aiAssessment.reasoning}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
              <span className="text-slate-500 text-[11px]">
                Last evaluated: {new Date(lead.lastContact).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTriggerAIQualification(lead.id)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                  title="Re-run Gemini lead qualification"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Score</span>
                </button>
                <button
                  onClick={() => handleDelete(lead)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lead AI Assessment Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedLead.name}</h3>
                  <p className="text-xs text-slate-400">{selectedLead.company} • {selectedLead.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* AI Scoring Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-slate-950 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    Automated AI Qualification Assessment
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black text-white">{selectedLead.score}</span>
                    <span className="text-xs text-slate-400">/ 100 Overall Score</span>
                  </div>
                </div>
                <button
                  onClick={() => handleTriggerAIQualification(selectedLead.id)}
                  disabled={isQualifying}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isQualifying ? 'Analyzing...' : 'Re-Run AI Scoring'}</span>
                </button>
              </div>

              <div className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Assessment Notice:</strong> This lead score is an automated algorithmic assessment based on submitted data and ICP standards. It is not an assertion of fact.
                </span>
              </div>
            </div>

            {/* Assessment Details */}
            {selectedLead.aiAssessment && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-300 mb-1">Reasoning & Synthesis</h4>
                  <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed">
                    {selectedLead.aiAssessment.reasoning}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Detected Buying Signals
                    </h4>
                    <ul className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      {selectedLead.aiAssessment.buyingSignals.map((signal, idx) => (
                        <li key={idx} className="text-slate-300 flex items-start gap-1.5">
                          <span className="text-emerald-400">•</span> {signal}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-rose-400 mb-1 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Potential Blocker / Risks
                    </h4>
                    <ul className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      {selectedLead.aiAssessment.risks.map((risk, idx) => (
                        <li key={idx} className="text-slate-300 flex items-start gap-1.5">
                          <span className="text-rose-400">•</span> {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-indigo-400 mb-1">Recommended Next Action</h4>
                  <p className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-200 font-medium">
                    → {selectedLead.aiAssessment.nextRecommendedAction}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Create Inbound Lead</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Prospect Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Liam Vance"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Company</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Vance Media"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="liam@vancemedia.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Stated Interest</label>
                <input
                  type="text"
                  value={formData.interest}
                  onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                  placeholder="e.g. Autonomous customer service bots & Sheets sync"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Inbound Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Contact Us Form">Contact Us Form</option>
                  <option value="Product Webinar">Product Webinar</option>
                  <option value="LinkedIn Inbound">LinkedIn Inbound</option>
                  <option value="Google Organic">Google Organic</option>
                  <option value="Partner Referral">Partner Referral</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Create & Run AI Scoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
