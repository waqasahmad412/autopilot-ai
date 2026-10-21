import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Zap,
  GitBranch,
  Users,
  Target,
  MessageSquareText,
  CheckSquare,
  Network,
  History,
  BarChart3,
  Settings,
  Plus,
  ShieldCheck,
  Sparkles,
  Mail
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  pendingApprovalsCount: number;
  humanRequiredCount: number;
  gmailQueueCount?: number;
  onCreateAutomation: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpen,
  onCloseMobile,
  pendingApprovalsCount,
  humanRequiredCount,
  gmailQueueCount = 0,
  onCreateAutomation
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agents', label: 'AI Agents', icon: Bot, badge: '4' },
    { id: 'gmail', label: 'Gmail Automation', icon: Mail, badge: gmailQueueCount > 0 ? `${gmailQueueCount} Queue` : undefined, badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    { id: 'automations', label: 'Automations', icon: Zap, badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Alert` : undefined, badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'workflows', label: 'Workflows', icon: GitBranch },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'leads', label: 'Leads', icon: Target },
    { id: 'conversations', label: 'Conversations', icon: MessageSquareText, badge: humanRequiredCount > 0 ? `${humanRequiredCount} Action` : undefined, badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'integrations', label: 'Integrations', icon: Network },
    { id: 'activity', label: 'Activity Logs', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-tight">AutoPilot</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Orchestration</p>
            </div>
          </div>
        </div>

        {/* Quick action button */}
        <div className="p-3">
          <button
            onClick={() => {
              onCreateAutomation();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>Create Automation</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Platform Menu
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info & system state */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-[11px]">
                <p className="text-slate-300 font-medium leading-none">Gemini 3.8 Flash</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Engine Online</p>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </aside>
    </>
  );
};
