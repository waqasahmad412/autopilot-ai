import React, { useState } from 'react';
import {
  MessageSquareText,
  Search,
  Filter,
  Bot,
  UserCheck,
  AlertTriangle,
  Send,
  ShieldAlert,
  Sparkles,
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Conversation, Message } from '../types.ts';
import { api } from '../services/api.ts';

interface ConversationsViewProps {
  conversations: Conversation[];
  onRefresh: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  conversations,
  onRefresh
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string>(
    conversations[0]?.id || ''
  );
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  const filteredConversations = conversations.filter((c) => {
    const matchesChannel = filterChannel === 'all' || c.channel === filterChannel;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesChannel && matchesStatus;
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConv || isSending) return;

    const textToSend = replyText.trim();
    setReplyText('');
    setIsSending(true);

    try {
      await api.sendMessage(selectedConv.id, textToSend, 'human_agent', 'Supervisor (Human)');
      onRefresh();
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateCustomerInbound = async () => {
    if (!selectedConv) return;
    const sampleCustomerMsg = "Hello, can you give me an update on our custom workflow configuration?";
    await api.sendMessage(selectedConv.id, sampleCustomerMsg, 'customer', selectedConv.customerName);
    onRefresh();
  };

  const handleToggleTakeover = async () => {
    if (!selectedConv) return;
    const nextStatus = selectedConv.status === 'human_required' ? 'ai_handling' : 'human_required';
    await api.takeoverConversation(selectedConv.id, nextStatus);
    onRefresh();
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const getStatusBadge = (status: Conversation['status']) => {
    switch (status) {
      case 'human_required':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" /> Human Required
          </span>
        );
      case 'ai_handling':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Bot className="w-3 h-3" /> AI Handling
          </span>
        );
      case 'waiting_customer':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Waiting on Customer
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            Open
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-indigo-400" />
            Unified Communication Inbox
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-channel feed with autonomous AI handling, confidence alerts, and one-click human takeover.
          </p>
        </div>

        <button
          onClick={handleSimulateCustomerInbound}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Simulate Customer Inbound</span>
        </button>
      </div>

      {/* Main Inbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl h-[680px]">
        {/* Left Column: Conversation Thread List */}
        <div className="border-r border-slate-800 flex flex-col h-full bg-slate-950/60">
          {/* Filters Bar */}
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Channels</option>
                <option value="web_chat">Web Chat</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="human_required">Human Required</option>
                <option value="ai_handling">AI Handling</option>
                <option value="waiting_customer">Waiting</option>
              </select>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No conversations match current filters
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                const lastMsg = conv.messages[conv.messages.length - 1];
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 text-left transition-colors cursor-pointer flex flex-col gap-1.5 ${
                      isSelected ? 'bg-indigo-950/40 border-l-4 border-indigo-500' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate">{conv.customerName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {getChannelIcon(conv.channel)}
                      <span className="text-[10px] text-slate-400 capitalize">{conv.channel.replace('_', ' ')}</span>
                      <span className="text-slate-600">•</span>
                      {getStatusBadge(conv.status)}
                    </div>

                    {lastMsg && (
                      <p className="text-[11px] text-slate-400 truncate line-clamp-1 mt-0.5">
                        <strong className="text-slate-300">{lastMsg.sender === 'customer' ? 'Customer:' : 'Agent:'}</strong>{' '}
                        {lastMsg.text}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Columns: Conversation View & Message Stream */}
        {selectedConv ? (
          <div className="lg:col-span-2 flex flex-col h-full bg-slate-900">
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/40">
                  {selectedConv.customerName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedConv.customerName}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{selectedConv.customerEmail}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedConv.channel.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Human Takeover Toggle Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleTakeover}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedConv.status === 'human_required'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                  }`}
                >
                  {selectedConv.status === 'human_required' ? (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>Resume AI Automation</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Human Takeover</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Human Required Alert Banner if active */}
            {selectedConv.status === 'human_required' && (
              <div className="px-4 py-2 bg-rose-950/40 border-b border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Human Takeover Active:</strong> AI automation is halted for this conversation. You are communicating directly.
                </span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar bg-slate-950/30">
              {selectedConv.messages.map((msg) => {
                const isCustomer = msg.sender === 'customer';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] text-slate-400 font-semibold">{msg.senderName}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/80 shadow-md'
                          : msg.isAi
                          ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-100 rounded-br-none shadow-md'
                          : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-100 rounded-br-none shadow-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {msg.metadata && (
                        <div className="mt-2 pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[10px]">
                          {msg.metadata.confidence !== undefined && (
                            <span className="text-emerald-400 font-mono">
                              AI Confidence: {Math.round(msg.metadata.confidence * 100)}%
                            </span>
                          )}
                          {msg.metadata.requiresHumanReview && (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Flagged for Human
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  selectedConv.status === 'human_required'
                    ? 'Write response as Human Supervisor...'
                    : 'Send message (AI will continue monitoring)...'
                }
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center text-xs text-slate-500">
            Select a conversation to view thread
          </div>
        )}
      </div>
    </div>
  );
};
