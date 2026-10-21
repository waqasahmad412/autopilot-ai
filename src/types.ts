export type Status = 'active' | 'paused' | 'archived';

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstructions: string;
  personality: string;
  goals: string[];
  allowedActions: string[];
  connectedTools: string[];
  knowledgeContext: string;
  status: 'active' | 'paused';
  avatarColor: string;
  createdAt: string;
  lastActivity: string;
  stats: {
    interactions: number;
    successRate: number;
    avgResponseTime: string;
  };
}

export type TriggerType = 
  | 'new_message' 
  | 'new_customer' 
  | 'new_lead' 
  | 'new_email' 
  | 'form_submission' 
  | 'scheduled_time' 
  | 'webhook' 
  | 'manual_trigger';

export type AIActionType = 
  | 'analyze_text' 
  | 'summarize' 
  | 'classify_intent' 
  | 'extract_information' 
  | 'generate_response' 
  | 'qualify_lead' 
  | 'workflow_decision';

export type LogicType = 
  | 'if_else' 
  | 'delay' 
  | 'filter' 
  | 'approval_required';

export type ActionType = 
  | 'send_email' 
  | 'create_customer' 
  | 'update_customer' 
  | 'create_lead' 
  | 'update_lead' 
  | 'add_task' 
  | 'send_notification' 
  | 'save_to_db' 
  | 'google_sheets_add_row' 
  | 'google_calendar_create_event' 
  | 'call_webhook';

export interface WorkflowStep {
  id: string;
  name: string;
  category: 'trigger' | 'ai' | 'logic' | 'action';
  type: TriggerType | AIActionType | LogicType | ActionType;
  description?: string;
  config: Record<string, any>;
  order: number;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused';
  mode: 'auto' | 'approval_required' | 'draft_only';
  assignedAgentId?: string;
  trigger: {
    type: TriggerType;
    config: Record<string, any>;
  };
  steps: WorkflowStep[];
  runsCount: number;
  successCount: number;
  failureCount: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StepExecutionLog {
  stepId: string;
  stepName: string;
  category: 'trigger' | 'ai' | 'logic' | 'action';
  type: string;
  status: 'success' | 'failed' | 'skipped' | 'waiting_approval';
  startTime: string;
  durationMs: number;
  input: any;
  output: any;
  aiDecision?: {
    intent?: string;
    confidence?: number;
    needs_human?: boolean;
    reasoning?: string;
    extractedData?: Record<string, any>;
  };
  error?: string;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  automationName: string;
  executionMode: 'real' | 'test';
  status: 'running' | 'completed' | 'failed' | 'needs_approval';
  triggerEvent: {
    type: string;
    payload: any;
  };
  startTime: string;
  endTime?: string;
  durationMs?: number;
  stepsTimeline: StepExecutionLog[];
  pendingApproval?: {
    actionType: string;
    description: string;
    payload: any;
    status: 'pending' | 'approved' | 'rejected';
  };
  finalResult?: {
    summary: string;
    actionsTaken: string[];
  };
  error?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'lead' | 'churned' | 'vip';
  tags: string[];
  notes: string;
  source: string;
  lastInteraction: string;
  createdAt: string;
  totalSpent?: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  interest: string;
  status: 'new' | 'interested' | 'qualified' | 'follow_up' | 'converted' | 'not_interested';
  score: number;
  aiAssessment?: {
    score: number;
    reasoning: string;
    confidence: number;
    buyingSignals: string[];
    risks: string[];
    nextRecommendedAction: string;
    evaluatedAt: string;
  };
  notes: string;
  lastContact: string;
  createdAt: string;
}

export interface Message {
  id: string;
  sender: 'customer' | 'agent' | 'human_agent';
  senderName: string;
  text: string;
  timestamp: string;
  isAi: boolean;
  metadata?: {
    confidence?: number;
    intent?: string;
    requiresHumanReview?: boolean;
    agentId?: string;
  };
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  channel: 'email' | 'whatsapp' | 'web_chat' | 'sms';
  status: 'open' | 'ai_handling' | 'waiting_customer' | 'human_required' | 'resolved';
  messages: Message[];
  assignedAgentId?: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: string;
  assignedAgentName?: string;
  customerName?: string;
  customerId?: string;
  sourceAutomationName?: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  key: 'gmail' | 'google_sheets' | 'google_calendar' | 'whatsapp' | 'slack' | 'webhook';
  name: string;
  category: 'email' | 'productivity' | 'messaging' | 'api';
  status: 'connected' | 'not_connected' | 'error';
  description: string;
  icon: string;
  lastSync?: string;
  errorMessage?: string;
  config: {
    apiKey?: string;
    clientId?: string;
    accountEmail?: string;
    webhookUrl?: string;
    phoneNumberId?: string;
    spreadsheetId?: string;
    calendarId?: string;
    channelName?: string;
    environment?: 'sandbox' | 'production';
  };
  requiredFields: {
    name: string;
    key: string;
    type: 'text' | 'password' | 'select' | 'url';
    description: string;
    placeholder: string;
    required: boolean;
    options?: string[];
  }[];
  authType: 'oauth' | 'api_key' | 'webhook';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  category: 'agent' | 'automation' | 'ai_action' | 'external_api' | 'customer' | 'lead' | 'integration' | 'human_approval' | 'error';
  action: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any>;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'approval_needed';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

export type EmailCategory =
  | 'General Question'
  | 'Product Question'
  | 'Pricing Question'
  | 'Customer Support'
  | 'Sales Inquiry'
  | 'Appointment Request'
  | 'Order/Service Request'
  | 'Complaint'
  | 'Follow-up'
  | 'Spam/Unwanted'
  | 'Newsletter/Marketing'
  | 'Human Required'
  | 'Unknown';

export type AIProvider = 'groq' | 'gemini';

export interface BusinessKnowledge {
  businessName: string;
  businessDescription: string;
  productsServices: string;
  pricing: string;
  businessHours: string;
  contactInfo: string;
  policies: string;
  faqs: string;
  shippingDelivery: string;
  refundInfo: string;
}

export interface GmailSettings {
  connectionStatus: 'connected' | 'not_connected' | 'authorization_expired' | 'error';
  connectedEmail: string | null;
  lastConnectedAt?: string;
  responseMode: 'test_mode' | 'human_approval' | 'auto_reply' | 'draft_only';
  autoReplyCategories: EmailCategory[];
  confidenceThreshold: number;
  globalAutomation: boolean;
  emergencyStop: boolean;
  pollingIntervalSeconds: number;
  aiProvider?: AIProvider;
  businessKnowledge: BusinessKnowledge;
  lastSyncAt?: string;
}

export interface EmailAttachmentMeta {
  filename: string;
  mimeType: string;
  size: number;
}

export interface ThreadMessageContext {
  from: string;
  date: string;
  snippet: string;
  bodySnippet?: string;
}

export interface GmailEmailRecord {
  id: string;
  gmailMessageId: string;
  gmailThreadId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  bodyText: string;
  bodyHtml?: string;
  attachments?: EmailAttachmentMeta[];
  threadHistory?: ThreadMessageContext[];
  classification?: {
    category: EmailCategory;
    confidence: number;
    needs_human: boolean;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    reason: string;
    canAutoReply?: boolean;
    knowledgeSourcesUsed?: string[];
    sensitiveFlags?: string[];
  };
  proposedReply?: string;
  replyStatus: 'pending_approval' | 'approved' | 'sent' | 'rejected' | 'skipped' | 'failed' | 'draft_only' | 'human_required' | 'test_mode';
  sentMessageId?: string;
  error?: string;
  escalationReason?: string;
  isTest: boolean;
  processedAt: string;
}

export interface GmailStats {
  emailsReceived: number;
  emailsProcessed: number;
  aiRepliesGenerated: number;
  repliesSent: number;
  waitingForApproval: number;
  humanEscalations: number;
  failedExecutions: number;
}

export interface DetailedGmailStats extends GmailStats {
  real: GmailStats;
  test: GmailStats;
}

export interface PreflightCheckItem {
  passed: boolean;
  message: string;
  detail?: string;
}

export interface PreflightCheckResult {
  allPassed: boolean;
  canEnableRealAutoReply: boolean;
  checks: {
    gmailOAuth: PreflightCheckItem;
    gmailSendScope: PreflightCheckItem;
    groqConnection: PreflightCheckItem;
    businessKnowledge: PreflightCheckItem;
    duplicateProtection: PreflightCheckItem;
    threadReply: PreflightCheckItem;
    emergencyStop: PreflightCheckItem;
    testMode: PreflightCheckItem;
  };
}

export interface AppSettings {
  profile: {
    name: string;
    email: string;
    company: string;
    timezone: string;
  };
  ai: {
    provider: AIProvider;
    model: string;
    temperature: number;
    autoTakeoverThreshold: number; // confidence threshold below which AI alerts human
    leadScoringStrictness: 'lenient' | 'balanced' | 'strict';
    groqConnected?: boolean;
    geminiConnected?: boolean;
  };
  automationDefaults: {
    testModeDefault: boolean;
    requireApprovalForExternalActions: boolean;
    maxRetries: number;
    logRetentionDays: number;
  };
  notifications: {
    inApp: boolean;
    emailOnFailure: boolean;
    emailOnApprovalNeeded: boolean;
    urgentAlertsOnly: boolean;
  };
  security: {
    webhookSecret: string;
    rateLimitingEnabled: boolean;
  };
}
