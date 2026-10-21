import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  MessageSquare,
  Sparkles,
  Send,
  X,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { AIAgent } from '../types.ts';
import { api } from '../services/api.ts';

interface AgentsViewProps {
  agents: AIAgent[];
  onRefresh: () => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ agents, onRefresh }) => {
  const [selectedAgentForChat, setSelectedAgentForChat] = useState<AIAgent | null>(null);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'agent'; text: string; confidence?: number }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Edit / Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    description: '',
    personality: '',
    systemInstructions: '',
    goals: '',
    allowedActions: '',
    connectedTools: '',
    knowledgeContext: '',
    status: 'active' as 'active' | 'paused',
    avatarColor: 'indigo'
  });

  const openCreateModal = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      role: '',
      description: '',
      personality: 'Helpful, courteous, concise, proactive',
      systemInstructions: 'You are an intelligent business automation agent. Assist customers accurately and follow company guidelines.',
      goals: 'Resolve queries in under 2 minutes, Maintain high satisfaction',
      allowedActions: 'send_email, add_task, update_customer',
      connectedTools: 'CRM, Knowledge Base',
      knowledgeContext: 'Standard company SLA is 24 hours. Enterprise tier receives 1-hour response.',
      status: 'active',
      avatarColor: 'indigo'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      role: agent.role,
      description: agent.description,
      personality: agent.personality,
      systemInstructions: agent.systemInstructions,
      goals: agent.goals.join(', '),
      allowedActions: agent.allowedActions.join(', '),
      connectedTools: agent.connectedTools.join(', '),
      knowledgeContext: agent.knowledgeContext,
      status: agent.status,
      avatarColor: agent.avatarColor
    });
    setIsModalOpen(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      role: formData.role,
      description: formData.description,
      personality: formData.personality,
      systemInstructions: formData.systemInstructions,
      goals: formData.goals.split(',').map((s) => s.trim()).filter(Boolean),
      allowedActions: formData.allowedActions.split(',').map((s) => s.trim()).filter(Boolean),
      connectedTools: formData.connectedTools.split(',').map((s) => s.trim()).filter(Boolean),
      knowledgeContext: formData.knowledgeContext,
      status: formData.status,
      avatarColor: formData.avatarColor
    };

    if (editingAgent) {
      await api.updateAgent(editingAgent.id, payload);
    } else {
      await api.createAgent(payload);
    }
    setIsModalOpen(false);
    onRefresh();
  };

  const handleToggleStatus = async (agent: AIAgent) => {
    const nextStatus = agent.status === 'active' ? 'paused' : 'active';
    await api.updateAgent(agent.id, { status: nextStatus });
    onRefresh();
  };

  const handleDuplicate = async (agent: AIAgent) => {
    await api.createAgent({
      ...agent,
      id: undefined as any,
      name: `${agent.name} (Copy)`,
      status: 'active'
    });
    onRefresh();
  };

  const handleDelete = async (agent: AIAgent) => {
    if (confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      await api.deleteAgent(agent.id);
      onRefresh();
    }
  };

  const openTestChat = (agent: AIAgent) => {
    setSelectedAgentForChat(agent);
    setChatMessages([
      {
        sender: 'agent',
        text: `Hello! I am ${agent.name}, ${agent.role}. How can I assist you with your tasks or workflow tests today?`,
        confidence: 0.98
      }
    ]);
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedAgentForChat || isSendingChat) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setIsSendingChat(true);

    try {
      const res = await api.chatWithAgent(selectedAgentForChat.id, userText);
      setChatMessages((prev) => [
        ...prev,
        { sender: 'agent', text: res.text, confidence: res.confidence }
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'agent', text: `Error: ${err.message || 'Failed to generate response'}` }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            AI Autonomous Agents
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure personalities, system instructions, allowed tools, and run interactive live tests.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create AI Agent</span>
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
          >
            {/* Top metadata */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                      agent.avatarColor === 'emerald'
                        ? 'bg-emerald-600'
                        : agent.avatarColor === 'amber'
                        ? 'bg-amber-600'
                        : agent.avatarColor === 'sky'
                        ? 'bg-sky-600'
                        : 'bg-indigo-600'
                    }`}
                  >
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-indigo-400 font-medium">{agent.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      agent.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {agent.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {agent.description}
              </p>

              {/* Personality & Goals badges */}
              <div className="mt-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-slate-300">Personality:</span> {agent.personality}
                </div>

                <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300">Allowed Actions: </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {agent.allowedActions.join(' • ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Interactions</span>
                <span className="text-xs font-bold text-white">{agent.stats.interactions}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Success Rate</span>
                <span className="text-xs font-bold text-emerald-400">{agent.stats.successRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Avg Latency</span>
                <span className="text-xs font-bold text-slate-300">{agent.stats.avgResponseTime}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openTestChat(agent)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Test Agent Chat</span>
                </button>
                <button
                  onClick={() => handleToggleStatus(agent)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title={agent.status === 'active' ? 'Pause Agent' : 'Activate Agent'}
                >
                  {agent.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDuplicate(agent)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Duplicate Agent"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(agent)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Edit Configuration"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(agent)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Delete Agent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Agent Testing Chat Drawer */}
      {selectedAgentForChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedAgentForChat.name}</h3>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Server Sandbox Chat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentForChat(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction banner */}
            <div className="px-4 py-2.5 bg-indigo-950/40 border-b border-indigo-500/20 text-[11px] text-indigo-200 leading-relaxed">
              <strong>Testing Mode:</strong> Chat directly with this agent. It responds adhering to its system instructions, knowledge base, and allowed actions.
            </div>

            {/* Messages stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-400 mb-1 px-1">
                    {msg.sender === 'user' ? 'You (Test User)' : `${selectedAgentForChat.name} (AI)`}
                  </span>
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/80'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.confidence !== undefined && (
                      <div className="mt-1.5 pt-1 border-t border-slate-700/60 text-[9px] text-emerald-400 font-mono">
                        Confidence: {Math.round(msg.confidence * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSendingChat && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  {selectedAgentForChat.name} is thinking...
                </div>
              )}
            </div>

            {/* Input composer */}
            <form onSubmit={handleSendTestMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask ${selectedAgentForChat.name} anything...`}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isSendingChat || !chatInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Agent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-base font-bold text-white">
                {editingAgent ? `Edit ${editingAgent.name}` : 'Create New AI Agent'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sentinel Fraud Screener"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Role / Specialization</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Compliance & Risk Analyst"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short summary of what this agent accomplishes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">System Instructions (Prompt)</label>
                <textarea
                  rows={4}
                  required
                  value={formData.systemInstructions}
                  onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
                  placeholder="Detailed guidelines defining how this agent speaks, reasons, handles edge cases, and escalates."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Personality Attributes</label>
                  <input
                    type="text"
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    placeholder="e.g. Empathetic, analytical, concise"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Goals (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    placeholder="Fast response, high accuracy, clear escalation"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Allowed Actions</label>
                <input
                  type="text"
                  value={formData.allowedActions}
                  onChange={(e) => setFormData({ ...formData, allowedActions: e.target.value })}
                  placeholder="send_email, add_task, update_customer, send_notification"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Knowledge Context</label>
                <textarea
                  rows={2}
                  value={formData.knowledgeContext}
                  onChange={(e) => setFormData({ ...formData, knowledgeContext: e.target.value })}
                  placeholder="Reference policies, product facts, pricing rules, or office hours."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  {editingAgent ? 'Save Changes' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
