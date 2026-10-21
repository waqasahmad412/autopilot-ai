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
} from '../types.ts';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Dashboard
  getDashboardStats: () => fetchJSON<any>('/api/dashboard/stats'),

  // Agents
  getAgents: () => fetchJSON<AIAgent[]>('/api/agents'),
  createAgent: (data: Partial<AIAgent>) => fetchJSON<AIAgent>('/api/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: string, data: Partial<AIAgent>) => fetchJSON<AIAgent>(`/api/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAgent: (id: string) => fetchJSON<{ success: boolean; deletedId: string }>(`/api/agents/${id}`, { method: 'DELETE' }),
  chatWithAgent: (id: string, message: string, history?: any[]) => 
    fetchJSON<{ text: string; confidence: number; error?: string }>(`/api/agents/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, history })
    }),

  // Automations
  getAutomations: () => fetchJSON<Automation[]>('/api/automations'),
  createAutomation: (data: Partial<Automation>) => fetchJSON<Automation>('/api/automations', { method: 'POST', body: JSON.stringify(data) }),
  updateAutomation: (id: string, data: Partial<Automation>) => fetchJSON<Automation>(`/api/automations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAutomation: (id: string) => fetchJSON<{ success: boolean; deletedId: string }>(`/api/automations/${id}`, { method: 'DELETE' }),
  runAutomation: (id: string, payload?: any, executionMode: 'real' | 'test' = 'real') =>
    fetchJSON<AutomationRun>(`/api/automations/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ payload, executionMode })
    }),

  // Runs
  getRuns: (params?: { automationId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.automationId) query.set('automationId', params.automationId);
    if (params?.status) query.set('status', params.status);
    return fetchJSON<AutomationRun[]>(`/api/runs?${query.toString()}`);
  },
  getRunById: (id: string) => fetchJSON<AutomationRun>(`/api/runs/${id}`),
  approveRun: (id: string) => fetchJSON<{ success: boolean; run: AutomationRun }>(`/api/runs/${id}/approve`, { method: 'POST' }),
  rejectRun: (id: string, reason?: string) => fetchJSON<{ success: boolean; run: AutomationRun }>(`/api/runs/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Customers
  getCustomers: () => fetchJSON<Customer[]>('/api/customers'),
  createCustomer: (data: Partial<Customer>) => fetchJSON<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Partial<Customer>) => fetchJSON<Customer>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => fetchJSON<{ success: boolean; deletedId: string }>(`/api/customers/${id}`, { method: 'DELETE' }),

  // Leads
  getLeads: () => fetchJSON<Lead[]>('/api/leads'),
  createLead: (data: Partial<Lead> & { autoScore?: boolean }) => fetchJSON<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Partial<Lead>) => fetchJSON<Lead>(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) => fetchJSON<{ success: boolean; deletedId: string }>(`/api/leads/${id}`, { method: 'DELETE' }),
  aiQualifyLead: (id: string) => fetchJSON<Lead>(`/api/leads/${id}/ai-qualify`, { method: 'POST' }),

  // Conversations
  getConversations: () => fetchJSON<Conversation[]>('/api/conversations'),
  sendMessage: (convId: string, text: string, sender: 'customer' | 'human_agent' = 'human_agent', senderName: string = 'Supervisor') =>
    fetchJSON<{ conversation: Conversation; message: any }>(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, sender, senderName })
    }),
  takeoverConversation: (convId: string, status: string = 'human_required') =>
    fetchJSON<Conversation>(`/api/conversations/${convId}/takeover`, { method: 'POST', body: JSON.stringify({ status }) }),

  // Tasks
  getTasks: () => fetchJSON<Task[]>('/api/tasks'),
  createTask: (data: Partial<Task>) => fetchJSON<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task>) => fetchJSON<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) => fetchJSON<{ success: boolean; deletedId: string }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Gmail AI Automation
  getGmailStatus: () => fetchJSON<{
    connectionStatus: 'connected' | 'not_connected' | 'authorization_expired' | 'error';
    connectedEmail: string | null;
    lastConnectedAt?: string;
    stats: any;
    settings: any;
  }>('/api/gmail/status'),

  getGmailEmails: (params?: { status?: string; category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    return fetchJSON<any[]>(`/api/gmail/emails?${query.toString()}`);
  },

  syncGmailInbox: () => fetchJSON<{ success: boolean; processedCount: number; newEmails: any[]; stats: any }>('/api/gmail/sync', { method: 'POST' }),

  runGmailTestEmail: (data: { from?: string; fromName?: string; subject?: string; bodyText?: string }) =>
    fetchJSON<{ success: boolean; testMode: boolean; email: any }>('/api/gmail/test-email', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  approveGmailEmail: (id: string, replyText?: string) =>
    fetchJSON<{ success: boolean; stats?: any; error?: string }>(`/api/gmail/emails/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ replyText })
    }),

  rejectGmailEmail: (id: string, reason?: string) =>
    fetchJSON<{ success: boolean; stats: any }>(`/api/gmail/emails/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),

  takeOverGmailEmail: (id: string, notes?: string) =>
    fetchJSON<{ success: boolean; stats: any }>(`/api/gmail/emails/${id}/takeover`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    }),

  getGmailSettings: () => fetchJSON<any>('/api/gmail/settings'),

  updateGmailSettings: (data: any) =>
    fetchJSON<any>('/api/gmail/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  getGmailPreflightCheck: () => fetchJSON<any>('/api/gmail/preflight-check'),

  disconnectGmail: () => fetchJSON<{ success: boolean }>('/api/gmail/auth/disconnect', { method: 'POST' }),

  // Integrations
  getIntegrations: () => fetchJSON<Integration[]>('/api/integrations'),
  updateIntegration: (key: string, data: { config?: any; status?: string }) =>
    fetchJSON<Integration>(`/api/integrations/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
  testIntegration: (key: string) =>
    fetchJSON<{ success: boolean; status: string; message: string }>(`/api/integrations/${key}/test`, { method: 'POST' }),

  // Activity Logs
  getActivityLogs: (category?: string, status?: string) => {
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (status) query.set('status', status);
    return fetchJSON<ActivityLog[]>(`/api/activity?${query.toString()}`);
  },

  // Analytics
  getAnalytics: () => fetchJSON<any>('/api/analytics'),

  // Notifications
  getNotifications: () => fetchJSON<AppNotification[]>('/api/notifications'),
  markNotificationRead: (id: string) => fetchJSON<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => fetchJSON<{ success: boolean }>('/api/notifications/mark-all-read', { method: 'POST' }),

  // Settings
  getSettings: () => fetchJSON<AppSettings>('/api/settings'),
  updateSettings: (data: Partial<AppSettings>) => fetchJSON<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // AI Provider & Groq
  getAiStatus: () =>
    fetchJSON<{
      groqConnected: boolean;
      geminiConnected: boolean;
      activeProvider: 'groq' | 'gemini';
      groqModel: string;
      geminiModel: string;
    }>('/api/ai/status'),
  testGroqConnection: () =>
    fetchJSON<{
      success: boolean;
      model: string;
      message: string;
      error?: string;
    }>('/api/ai/test-groq', { method: 'POST' })
};
