import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { TopNav } from './components/TopNav.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { AgentsView } from './components/AgentsView.tsx';
import { AutomationsView } from './components/AutomationsView.tsx';
import { WorkflowBuilderView } from './components/WorkflowBuilderView.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { LeadsView } from './components/LeadsView.tsx';
import { ConversationsView } from './components/ConversationsView.tsx';
import { TasksView } from './components/TasksView.tsx';
import { IntegrationsView } from './components/IntegrationsView.tsx';
import { ActivityLogsView } from './components/ActivityLogsView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { GmailAutomationView } from './components/GmailAutomationView.tsx';
import { RunExecutionModal } from './components/RunExecutionModal.tsx';
import { api } from './services/api.ts';
import {
  AIAgent,
  Automation,
  Customer,
  Lead,
  Conversation,
  Task,
  Integration,
  ActivityLog,
  AppNotification,
  AutomationRun,
  AppSettings
} from './types.ts';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalExecutionMode, setGlobalExecutionMode] = useState<'real' | 'test'>('real');
  const [searchQuery, setSearchQuery] = useState('');

  // Core Data
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [gmailQueueCount, setGmailQueueCount] = useState<number>(0);

  // Modals & Active Selections
  const [selectedRunForModal, setSelectedRunForModal] = useState<AutomationRun | null>(null);
  const [editingAutomationForBuilder, setEditingAutomationForBuilder] = useState<Automation | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [
        dashStats,
        agentsList,
        autosList,
        custsList,
        leadsList,
        convsList,
        tasksList,
        integrationsList,
        activityList,
        notifsList,
        settingsData,
        analyticsRes,
        gmailStatusRes
      ] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getAgents().catch(() => []),
        api.getAutomations().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getLeads().catch(() => []),
        api.getConversations().catch(() => []),
        api.getTasks().catch(() => []),
        api.getIntegrations().catch(() => []),
        api.getActivityLogs().catch(() => []),
        api.getNotifications().catch(() => []),
        api.getSettings().catch(() => null),
        api.getAnalytics().catch(() => null),
        api.getGmailStatus().catch(() => null)
      ]);

      if (dashStats) setDashboardStats(dashStats);
      setAgents(agentsList);
      setAutomations(autosList);
      setCustomers(custsList);
      setLeads(leadsList);
      setConversations(convsList);
      setTasks(tasksList);
      setIntegrations(integrationsList);
      setActivityLogs(activityList);
      setNotifications(notifsList);
      if (settingsData) setSettings(settingsData);
      if (analyticsRes) setAnalyticsData(analyticsRes);
      if (gmailStatusRes?.stats?.waitingForApproval !== undefined) {
        setGmailQueueCount(gmailStatusRes.stats.waitingForApproval);
      }
    } catch (err) {
      console.error('Failed to load AutoPilot data:', err);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Execute an automation
  const handleExecuteRun = async (automationId: string, payload: any, mode: 'real' | 'test' = globalExecutionMode) => {
    try {
      const runResult = await api.runAutomation(automationId, payload, mode);
      setSelectedRunForModal(runResult);
      showToast(
        mode === 'test'
          ? 'Simulation complete. Review execution steps.'
          : 'Automation executed live.',
        'success'
      );
      loadAllData();
    } catch (err: any) {
      showToast(`Automation failed: ${err.message}`, 'error');
    }
  };

  // Human approval handlers
  const handleApproveRun = async (runId: string) => {
    try {
      const res = await api.approveRun(runId);
      setSelectedRunForModal(res.run);
      showToast('Action approved and executed.', 'success');
      loadAllData();
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`, 'error');
    }
  };

  const handleRejectRun = async (runId: string, reason: string) => {
    try {
      const res = await api.rejectRun(runId, reason);
      setSelectedRunForModal(res.run);
      showToast('Action rejected.', 'info');
      loadAllData();
    } catch (err: any) {
      showToast(`Rejection error: ${err.message}`, 'error');
    }
  };

  const handleQuickRun = (automationId: string, mode: 'real' | 'test') => {
    const auto = automations.find((a) => a.id === automationId);
    let sample = { message: 'Can you help resolve my inquiry?' };
    if (auto?.trigger.type === 'new_lead') {
      sample = { name: 'Julian Vance', company: 'Vance Digital Media', source: 'Web Inbound' } as any;
    }
    handleExecuteRun(automationId, sample, mode);
  };

  const handleNavigate = (view: string) => {
    if (view === 'gmail_automation') {
      setCurrentView('gmail');
    } else {
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pendingApprovalsCount = automations.reduce((acc, a) => acc + (a.mode === 'approval_required' ? 1 : 0), 0);
  const humanRequiredCount = conversations.filter((c) => c.status === 'human_required').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl text-xs text-white animate-in slide-in-from-bottom-2 duration-150">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <Info className="w-4 h-4 text-indigo-400" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-500 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={handleNavigate}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        pendingApprovalsCount={pendingApprovalsCount}
        humanRequiredCount={humanRequiredCount}
        gmailQueueCount={gmailQueueCount}
        onCreateAutomation={() => {
          setEditingAutomationForBuilder(null);
          setCurrentView('workflows');
        }}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <TopNav
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          globalExecutionMode={globalExecutionMode}
          onToggleExecutionMode={(m) => {
            setGlobalExecutionMode(m);
            showToast(`Switched to ${m.toUpperCase()} Mode`, 'info');
          }}
          notifications={notifications}
          onMarkNotificationRead={async (id) => {
            await api.markNotificationRead(id);
            loadAllData();
          }}
          onMarkAllRead={async () => {
            await api.markAllNotificationsRead();
            loadAllData();
          }}
          onNavigateToView={handleNavigate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && dashboardStats && (
            <DashboardView
              stats={dashboardStats.metrics}
              recentRuns={dashboardStats.recentRuns || []}
              recentActivity={dashboardStats.recentActivity || []}
              onCreateAutomation={() => {
                setEditingAutomationForBuilder(null);
                setCurrentView('workflows');
              }}
              onOpenRun={(run) => setSelectedRunForModal(run)}
              onNavigateToView={handleNavigate}
              onQuickRun={handleQuickRun}
            />
          )}

          {currentView === 'agents' && (
            <AgentsView agents={agents} onRefresh={loadAllData} />
          )}

          {currentView === 'gmail' && (
            <GmailAutomationView onNotificationUpdate={loadAllData} />
          )}

          {currentView === 'automations' && (
            <AutomationsView
              automations={automations}
              onRefresh={loadAllData}
              onOpenWorkflowBuilder={(autoId) => {
                const auto = automations.find((a) => a.id === autoId) || null;
                setEditingAutomationForBuilder(auto);
                setCurrentView('workflows');
              }}
              onOpenRun={(run) => setSelectedRunForModal(run)}
              onExecuteRun={handleExecuteRun}
            />
          )}

          {currentView === 'workflows' && (
            <WorkflowBuilderView
              initialAutomation={editingAutomationForBuilder}
              onSaved={() => {
                showToast('Workflow automation saved.', 'success');
                loadAllData();
                setCurrentView('automations');
              }}
              onExecuteRun={handleExecuteRun}
            />
          )}

          {currentView === 'customers' && (
            <CustomersView
              customers={customers}
              onRefresh={loadAllData}
              onNavigateToConversation={() => setCurrentView('conversations')}
            />
          )}

          {currentView === 'leads' && (
            <LeadsView leads={leads} onRefresh={loadAllData} />
          )}

          {currentView === 'conversations' && (
            <ConversationsView
              conversations={conversations}
              onRefresh={loadAllData}
            />
          )}

          {currentView === 'tasks' && (
            <TasksView tasks={tasks} onRefresh={loadAllData} />
          )}

          {currentView === 'integrations' && (
            <IntegrationsView
              integrations={integrations}
              onRefresh={loadAllData}
              onNavigateToView={handleNavigate}
            />
          )}

          {currentView === 'activity' && (
            <ActivityLogsView
              logs={activityLogs}
              onRefresh={loadAllData}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView analyticsData={analyticsData} />
          )}

          {currentView === 'settings' && settings && (
            <SettingsView
              settings={settings}
              onRefresh={loadAllData}
            />
          )}
        </main>
      </div>

      {/* Global Run Execution & Step Timeline Modal */}
      <RunExecutionModal
        run={selectedRunForModal}
        onClose={() => setSelectedRunForModal(null)}
        onApprove={handleApproveRun}
        onReject={handleRejectRun}
      />
    </div>
  );
}
