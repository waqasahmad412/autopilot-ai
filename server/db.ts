import dotenv from 'dotenv';
dotenv.config();

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
  AppSettings,
  GmailSettings,
  GmailEmailRecord,
  GmailStats,
  DetailedGmailStats
} from '../src/types.ts';

// Initial pre-seeded business data
export const db = {
  agents: [
    {
      id: 'agent_support',
      name: 'Atlas Support Specialist',
      role: 'Customer Support Agent',
      description: 'Handles incoming tier-1 & tier-2 inquiries, troubleshooting, policy explanations, and ticket escalation.',
      systemInstructions: 'You are Atlas, a courteous, highly competent customer support specialist for AutoPilot AI. You resolve customer issues efficiently, cite policies accurately, and escalate complex technical or billing issues immediately.',
      personality: 'Empathetic, concise, professional, proactive',
      goals: ['Resolve inquiries in under 2 minutes', 'Detect customer frustration early', 'Maintain 98%+ satisfaction'],
      allowedActions: ['send_email', 'add_task', 'update_customer', 'send_notification'],
      connectedTools: ['Knowledge Base', 'CRM Directory', 'Order History'],
      knowledgeContext: 'AutoPilot AI pricing starts at $49/mo for Starter, $199/mo for Pro, and Custom for Enterprise. SLA for Enterprise is 99.99%. Refund policy allows 30-day money-back guarantee without questions.',
      status: 'active',
      avatarColor: 'indigo',
      createdAt: '2026-08-15T09:00:00Z',
      lastActivity: '2026-09-29T07:15:00Z',
      stats: {
        interactions: 1420,
        successRate: 97.4,
        avgResponseTime: '1.2s'
      }
    },
    {
      id: 'agent_sales',
      name: 'Vanguard Sales Qualifier',
      role: 'Sales & Lead Qualification Agent',
      description: 'Scores incoming inbound leads, analyzes buying power, extracts budget/timeline, and routes hot deals to executive sales reps.',
      systemInstructions: 'You are Vanguard, an elite B2B sales development AI. You evaluate prospects based on BANT (Budget, Authority, Need, Timeline). You provide an objective assessment score (0-100) and articulate clear risk/reward factors.',
      personality: 'Strategic, inquisitive, persuasive, consultative',
      goals: ['Identify high-value enterprise accounts', 'Calculate accurate lead scores', 'Flag buying signals'],
      allowedActions: ['create_lead', 'update_lead', 'add_task', 'google_calendar_create_event'],
      connectedTools: ['Company Clearbit Enrichment', 'Lead Scoring Matrix', 'Calendar Booking'],
      knowledgeContext: 'Ideal Customer Profile (ICP): Tech companies with 20-500 employees looking to automate customer operations or sales pipelines. Budget minimum $1,500/year.',
      status: 'active',
      avatarColor: 'emerald',
      createdAt: '2026-08-20T11:30:00Z',
      lastActivity: '2026-09-29T06:50:00Z',
      stats: {
        interactions: 864,
        successRate: 94.8,
        avgResponseTime: '1.5s'
      }
    },
    {
      id: 'agent_email',
      name: 'Hermes Mail Dispatcher',
      role: 'Email Assistant',
      description: 'Reads inbound business emails, determines urgency, extracts action items, and prepares polished draft responses for approval.',
      systemInstructions: 'You are Hermes, an executive email drafting AI. You filter out spam, summarize dense threads into bullet points, and craft context-aware email replies for human approval.',
      personality: 'Polished, diplomatic, detail-oriented',
      goals: ['Zero inbox backlog', 'Draft human-caliber replies', 'Never send external email without required approval'],
      allowedActions: ['send_email', 'add_task', 'summarize'],
      connectedTools: ['Gmail Inbox', 'Executive Style Guide', 'Calendar'],
      knowledgeContext: 'Company tone is modern, friendly yet executive. Never promise unreleased features or commit to dates without verification.',
      status: 'active',
      avatarColor: 'sky',
      createdAt: '2026-09-01T14:15:00Z',
      lastActivity: '2026-09-29T05:30:00Z',
      stats: {
        interactions: 529,
        successRate: 98.9,
        avgResponseTime: '0.9s'
      }
    },
    {
      id: 'agent_calendar',
      name: 'Chronos Scheduler',
      role: 'Appointment & Meeting Assistant',
      description: 'Coordinates appointment requests, cross-references availability, and books calendar invites without double-booking.',
      systemInstructions: 'You are Chronos. You parse scheduling requests, find slots within business hours (9am-5pm EST), and format calendar events cleanly.',
      personality: 'Organized, prompt, courteous',
      goals: ['Eliminate scheduling friction', 'Prevent double bookings'],
      allowedActions: ['google_calendar_create_event', 'send_notification'],
      connectedTools: ['Google Calendar API', 'Timezone Converter'],
      knowledgeContext: 'Standard demo slot is 30 minutes. Buffer time between meetings is 15 minutes. Office hours are Monday through Friday, 9:00 AM to 5:00 PM EST.',
      status: 'paused',
      avatarColor: 'amber',
      createdAt: '2026-09-10T16:00:00Z',
      lastActivity: '2026-09-27T18:40:00Z',
      stats: {
        interactions: 310,
        successRate: 96.1,
        avgResponseTime: '1.1s'
      }
    }
  ] as AIAgent[],

  automations: [
    {
      id: 'auto_support_triage',
      name: 'Customer Support Auto-Triage & Resolution',
      description: 'Evaluates new incoming customer messages, determines intent & sentiment, resolves common questions, or flags for human takeover.',
      status: 'active',
      mode: 'auto',
      assignedAgentId: 'agent_support',
      trigger: {
        type: 'new_message',
        config: { channel: 'all', priorityFilter: 'any' }
      },
      steps: [
        {
          id: 'step_1',
          name: 'Analyze Customer Intent & Sentiment',
          category: 'ai',
          type: 'analyze_text',
          description: 'Extract customer intent, sentiment urgency, and determine if human intervention is needed.',
          config: { model: 'gemini-3.8-flash', extractEntities: true },
          order: 1
        },
        {
          id: 'step_2',
          name: 'Human Escalation Check',
          category: 'logic',
          type: 'if_else',
          description: 'If AI confidence < 0.75 or customer is frustrated, flag conversation as Human Required.',
          config: { condition: 'needs_human == true || confidence < 0.75' },
          order: 2
        },
        {
          id: 'step_3',
          name: 'Generate Contextual Answer',
          category: 'ai',
          type: 'generate_response',
          description: 'Compose an empathetic, factual solution based on knowledge base.',
          config: { agentId: 'agent_support', includeKnowledge: true },
          order: 3
        },
        {
          id: 'step_4',
          name: 'Update Customer Record & Activity',
          category: 'action',
          type: 'update_customer',
          description: 'Log the interaction timestamp and customer sentiment tag.',
          config: { updateLastInteraction: true },
          order: 4
        }
      ],
      runsCount: 1248,
      successCount: 1215,
      failureCount: 33,
      lastRunAt: '2026-09-29T07:18:22Z',
      createdAt: '2026-08-16T10:00:00Z',
      updatedAt: '2026-09-28T14:20:00Z'
    },
    {
      id: 'auto_lead_scoring',
      name: 'Inbound Lead AI Qualifier & CRM Pipeline',
      description: 'Parses newly submitted leads, runs Gemini qualification scoring (0-100), tags ICP match, and notifies sales.',
      status: 'active',
      mode: 'auto',
      assignedAgentId: 'agent_sales',
      trigger: {
        type: 'new_lead',
        config: { source: 'all_forms' }
      },
      steps: [
        {
          id: 'step_l1',
          name: 'AI Lead Qualification & Scoring',
          category: 'ai',
          type: 'qualify_lead',
          description: 'Calculate lead score, identify buying signals, and outline risks.',
          config: { criteria: 'BANT_Enterprise' },
          order: 1
        },
        {
          id: 'step_l2',
          name: 'High-Value Lead Routing',
          category: 'logic',
          type: 'if_else',
          description: 'If Lead Score >= 75, create priority sales task and send urgent alert.',
          config: { condition: 'score >= 75' },
          order: 2
        },
        {
          id: 'step_l3',
          name: 'Create CRM Follow-up Task',
          category: 'action',
          type: 'add_task',
          description: 'Assign follow-up task to account executive within 4 hours.',
          config: { priority: 'high', dueHours: 4 },
          order: 3
        },
        {
          id: 'step_l4',
          name: 'Dispatch In-App Notification',
          category: 'action',
          type: 'send_notification',
          description: 'Notify sales manager in real-time.',
          config: { channel: 'in_app' },
          order: 4
        }
      ],
      runsCount: 582,
      successCount: 574,
      failureCount: 8,
      lastRunAt: '2026-09-29T06:45:10Z',
      createdAt: '2026-08-22T08:30:00Z',
      updatedAt: '2026-09-27T11:00:00Z'
    },
    {
      id: 'auto_email_approvals',
      name: 'Executive Email Drafter & Approval Queue',
      description: 'Inspects high-priority inbound emails, drafts professional response, and places it in Human Approval queue before sending.',
      status: 'active',
      mode: 'approval_required',
      assignedAgentId: 'agent_email',
      trigger: {
        type: 'new_email',
        config: { filterUnread: true }
      },
      steps: [
        {
          id: 'step_e1',
          name: 'Email Summarizer & Intent Classifier',
          category: 'ai',
          type: 'summarize',
          description: 'Summarize email body into 2 key points and detect urgency.',
          config: { length: 'bullet_points' },
          order: 1
        },
        {
          id: 'step_e2',
          name: 'Draft Polished Response',
          category: 'ai',
          type: 'generate_response',
          description: 'Write custom reply adhering to executive voice.',
          config: { agentId: 'agent_email' },
          order: 2
        },
        {
          id: 'step_e3',
          name: 'Require Human Approval',
          category: 'logic',
          type: 'approval_required',
          description: 'Halt workflow and display draft in Human Approval dashboard before sending.',
          config: { timeoutHours: 24 },
          order: 3
        },
        {
          id: 'step_e4',
          name: 'Send Verified Email',
          category: 'action',
          type: 'send_email',
          description: 'Deliver response via Gmail integration after human greenlight.',
          config: { integration: 'gmail' },
          order: 4
        }
      ],
      runsCount: 341,
      successCount: 335,
      failureCount: 6,
      lastRunAt: '2026-09-29T05:22:00Z',
      createdAt: '2026-09-02T13:00:00Z',
      updatedAt: '2026-09-26T16:30:00Z'
    },
    {
      id: 'auto_appointment_booking',
      name: 'Smart Appointment & Calendar Sync',
      description: 'Processes meeting requests, checks calendar openings, and records schedule appointments in Google Calendar.',
      status: 'paused',
      mode: 'approval_required',
      assignedAgentId: 'agent_calendar',
      trigger: {
        type: 'new_message',
        config: { keywordFilter: 'schedule, demo, meet, call, appointment' }
      },
      steps: [
        {
          id: 'step_c1',
          name: 'Extract Date, Time & Topic',
          category: 'ai',
          type: 'extract_information',
          description: 'Extract requested meeting duration, date preferences, and attendee email.',
          config: { schema: 'calendar_event' },
          order: 1
        },
        {
          id: 'step_c2',
          name: 'Create Calendar Event',
          category: 'action',
          type: 'google_calendar_create_event',
          description: 'Schedule meeting with attendees.',
          config: { calendarId: 'primary' },
          order: 2
        }
      ],
      runsCount: 118,
      successCount: 110,
      failureCount: 8,
      lastRunAt: '2026-09-27T18:40:00Z',
      createdAt: '2026-09-12T15:00:00Z',
      updatedAt: '2026-09-27T18:40:00Z'
    }
  ] as Automation[],

  customers: [
    {
      id: 'cust_101',
      name: 'Sarah Jenkins',
      email: 's.jenkins@acmecorp.com',
      phone: '+1 (415) 890-2341',
      company: 'Acme Corporation',
      status: 'vip',
      tags: ['Enterprise', 'Automations Heavy', 'Fast Responder'],
      notes: 'Requested SSO integration for 150 team members. Highly satisfied with Atlas AI support.',
      source: 'Website Inbound',
      lastInteraction: '2026-09-29T07:18:00Z',
      createdAt: '2026-07-10T14:20:00Z',
      totalSpent: 4200
    },
    {
      id: 'cust_102',
      name: 'Marcus Sterling',
      email: 'm.sterling@novalabs.io',
      phone: '+1 (512) 441-9870',
      company: 'NovaLabs AI',
      status: 'active',
      tags: ['Pro Plan', 'Developer API', 'Webhook Power User'],
      notes: 'Setting up custom WhatsApp bot for internal field technicians.',
      source: 'Referral',
      lastInteraction: '2026-09-28T19:45:00Z',
      createdAt: '2026-08-01T11:00:00Z',
      totalSpent: 1200
    },
    {
      id: 'cust_103',
      name: 'Elena Rostova',
      email: 'elena@heliosretail.com',
      phone: '+44 20 7946 0912',
      company: 'Helios Retail Global',
      status: 'active',
      tags: ['E-Commerce', 'Multi-channel', 'WhatsApp User'],
      notes: 'Evaluating auto-responses for 5,000 monthly WhatsApp customer inquiries.',
      source: 'Google Search',
      lastInteraction: '2026-09-27T13:10:00Z',
      createdAt: '2026-08-14T09:30:00Z',
      totalSpent: 850
    },
    {
      id: 'cust_104',
      name: 'David Chen',
      email: 'david@synthetix.tech',
      phone: '+1 (650) 782-1144',
      company: 'Synthetix Dynamics',
      status: 'lead',
      tags: ['Evaluating', 'High Growth', 'Lead Score 88'],
      notes: 'Completed discovery demo. Awaiting procurement signoff.',
      source: 'LinkedIn Ad',
      lastInteraction: '2026-09-26T16:05:00Z',
      createdAt: '2026-09-15T16:00:00Z',
      totalSpent: 0
    },
    {
      id: 'cust_105',
      name: 'Amara Okafor',
      email: 'amara@pulsehealth.co',
      phone: '+1 (312) 555-0199',
      company: 'Pulse Health Systems',
      status: 'vip',
      tags: ['Healthcare', 'HIPAA Review', 'Enterprise Tier'],
      notes: 'Signed 2-year contract. Requires human approval for all patient-facing notifications.',
      source: 'Partner Channel',
      lastInteraction: '2026-09-29T06:12:00Z',
      createdAt: '2026-06-20T10:00:00Z',
      totalSpent: 9600
    }
  ] as Customer[],

  leads: [
    {
      id: 'lead_201',
      name: 'Julian Vance',
      email: 'julian@vancemedia.com',
      phone: '+1 (212) 555-8391',
      company: 'Vance Digital Media',
      source: 'Product Webinar',
      interest: 'AI Email Drafts & Social Messaging Workflows',
      status: 'qualified',
      score: 88,
      aiAssessment: {
        score: 88,
        reasoning: 'Matches ICP target profile. Team of 45 marketers looking to cut email response time from 4 hours to 5 minutes. Decision maker with confirmed $15k quarterly software budget.',
        confidence: 0.94,
        buyingSignals: ['Active hiring for ops manager', 'Mentioned urgent deadline next month', 'Requested Enterprise security sheet'],
        risks: ['Needs Google Workspace OAuth verification'],
        nextRecommendedAction: 'Schedule 30-min tailored workflow architecture demo with founder.',
        evaluatedAt: '2026-09-29T06:45:00Z'
      },
      notes: 'Expressed excitement about human-in-the-loop approval features.',
      lastContact: '2026-09-29T06:45:00Z',
      createdAt: '2026-09-29T06:30:00Z'
    },
    {
      id: 'lead_202',
      name: 'Chloe Tremblay',
      email: 'c.tremblay@aeroflux.ca',
      phone: '+1 (514) 555-0144',
      company: 'AeroFlux Logistics',
      source: 'Contact Us Form',
      interest: 'Automated Carrier Tracking & Customer Dispatches',
      status: 'interested',
      score: 72,
      aiAssessment: {
        score: 72,
        reasoning: 'Substantial volume (10k dispatches/mo) but procurement cycles are 60+ days. Strong need for automated Sheets logging and webhook alerts.',
        confidence: 0.89,
        buyingSignals: ['High message volume pain point', 'Legacy tool contract expiring in 45 days'],
        risks: ['Lengthy IT compliance review required'],
        nextRecommendedAction: 'Send logistics case study and invite to sandbox trial.',
        evaluatedAt: '2026-09-28T14:10:00Z'
      },
      notes: 'Mentioned they currently use Zapier but are hitting rate limits.',
      lastContact: '2026-09-28T14:10:00Z',
      createdAt: '2026-09-28T13:55:00Z'
    },
    {
      id: 'lead_203',
      name: 'Rajiv Patel',
      email: 'rajiv.p@nexora.org',
      phone: '+91 98200 12345',
      company: 'Nexora Ventures',
      source: 'Direct Search',
      interest: 'Portfolio Company Automation Suite',
      status: 'new',
      score: 65,
      aiAssessment: {
        score: 65,
        reasoning: 'Inbound inquiry seeking bulk licensing for 12 seed-stage startups. Early exploratory stage.',
        confidence: 0.82,
        buyingSignals: ['Multi-license demand', 'Managing Partner involvement'],
        risks: ['May take time for individual startups to adopt'],
        nextRecommendedAction: 'Send Partner Program overview and introductory questionnaire.',
        evaluatedAt: '2026-09-28T09:00:00Z'
      },
      notes: 'Looking for white-label or agency tier.',
      lastContact: '2026-09-28T09:00:00Z',
      createdAt: '2026-09-28T08:45:00Z'
    },
    {
      id: 'lead_204',
      name: 'Claire Dupont',
      email: 'claire@dupontdesigns.fr',
      phone: '+33 1 42 68 55 00',
      company: 'Dupont Luxury Design',
      source: 'Instagram Inbound',
      interest: 'Automated Client Questionnaire',
      status: 'follow_up',
      score: 54,
      aiAssessment: {
        score: 54,
        reasoning: 'Solo boutique design studio. Great brand aesthetic but low monthly transaction volume. May be better suited for Starter plan than Enterprise.',
        confidence: 0.91,
        buyingSignals: ['Wants instant setup today'],
        risks: ['Price sensitive beyond $49/mo'],
        nextRecommendedAction: 'Offer self-service Starter plan onboarding link with template pack.',
        evaluatedAt: '2026-09-27T17:20:00Z'
      },
      notes: 'Follow up if no signup in 3 days.',
      lastContact: '2026-09-27T17:20:00Z',
      createdAt: '2026-09-27T16:15:00Z'
    }
  ] as Lead[],

  conversations: [
    {
      id: 'conv_1',
      customerId: 'cust_101',
      customerName: 'Sarah Jenkins',
      customerEmail: 's.jenkins@acmecorp.com',
      channel: 'web_chat',
      status: 'ai_handling',
      lastMessageAt: '2026-09-29T07:18:00Z',
      unread: false,
      assignedAgentId: 'agent_support',
      messages: [
        {
          id: 'msg_101',
          sender: 'customer',
          senderName: 'Sarah Jenkins',
          text: 'Hi there! We are rolling out AutoPilot to our operations squad. Can you clarify how rate limiting works on custom Webhooks?',
          timestamp: '2026-09-29T07:16:30Z',
          isAi: false
        },
        {
          id: 'msg_102',
          sender: 'agent',
          senderName: 'Atlas Support Specialist (AI)',
          text: 'Hello Sarah! On your Enterprise plan, incoming webhooks support up to 600 requests per minute with automatic burst queuing. If you exceed this threshold, we gracefully buffer requests for up to 10 minutes without dropping payload events. Would you like me to enable dedicated queue priority for your endpoint?',
          timestamp: '2026-09-29T07:18:00Z',
          isAi: true,
          metadata: {
            confidence: 0.96,
            intent: 'technical_inquiry_webhooks',
            requiresHumanReview: false,
            agentId: 'agent_support'
          }
        }
      ]
    },
    {
      id: 'conv_2',
      customerId: 'cust_103',
      customerName: 'Elena Rostova',
      customerEmail: 'elena@heliosretail.com',
      channel: 'whatsapp',
      status: 'human_required',
      lastMessageAt: '2026-09-29T06:55:00Z',
      unread: true,
      assignedAgentId: 'agent_support',
      messages: [
        {
          id: 'msg_201',
          sender: 'customer',
          senderName: 'Elena Rostova',
          text: 'We noticed a billing discrepancy on our last invoice #INV-8821. It looks like an extra seat charge was billed after our team consolidation.',
          timestamp: '2026-09-29T06:52:00Z',
          isAi: false
        },
        {
          id: 'msg_202',
          sender: 'agent',
          senderName: 'Atlas Support Specialist (AI)',
          text: 'Thank you for bringing this to our attention, Elena. I have flagged this invoice discrepancy (#INV-8821) and paused automated charge adjustments. I am routing this immediately to our finance operations team for human verification.',
          timestamp: '2026-09-29T06:55:00Z',
          isAi: true,
          metadata: {
            confidence: 0.71,
            intent: 'billing_dispute',
            requiresHumanReview: true,
            agentId: 'agent_support'
          }
        }
      ]
    },
    {
      id: 'conv_3',
      customerId: 'cust_105',
      customerName: 'Amara Okafor',
      customerEmail: 'amara@pulsehealth.co',
      channel: 'email',
      status: 'waiting_customer',
      lastMessageAt: '2026-09-29T06:12:00Z',
      unread: false,
      assignedAgentId: 'agent_support',
      messages: [
        {
          id: 'msg_301',
          sender: 'customer',
          senderName: 'Amara Okafor',
          text: 'Could you share the Business Associate Agreement (BAA) document for our legal team review before we launch the patient reminder agent?',
          timestamp: '2026-09-29T05:50:00Z',
          isAi: false
        },
        {
          id: 'msg_302',
          sender: 'human_agent',
          senderName: 'Alex Mercer (Security Lead)',
          text: 'Hi Amara, attached is our signed BAA document along with our SOC2 Type II audit summary. Please let us know if your compliance officer has any specific addendums.',
          timestamp: '2026-09-29T06:12:00Z',
          isAi: false
        }
      ]
    }
  ] as Conversation[],

  tasks: [
    {
      id: 'task_1',
      title: 'Review invoice discrepancy #INV-8821 for Helios Retail',
      description: 'Customer Elena Rostova flagged extra seat charge. Verify seat count in billing ledger and issue credit memo.',
      priority: 'high',
      status: 'todo',
      dueDate: '2026-09-29T12:00:00Z',
      assignedAgentName: 'Atlas Support Specialist',
      customerName: 'Elena Rostova',
      customerId: 'cust_103',
      sourceAutomationName: 'Customer Support Auto-Triage & Resolution',
      createdAt: '2026-09-29T06:55:00Z'
    },
    {
      id: 'task_2',
      title: 'Conduct Enterprise Workflow Demo with Julian Vance (Vance Media)',
      description: 'Lead scored 88 by Vanguard AI. High intent for email automation and multi-channel marketing workflows.',
      priority: 'urgent',
      status: 'in_progress',
      dueDate: '2026-09-29T18:00:00Z',
      assignedAgentName: 'Vanguard Sales Qualifier',
      customerName: 'Julian Vance',
      sourceAutomationName: 'Inbound Lead AI Qualifier & CRM Pipeline',
      createdAt: '2026-09-29T06:45:00Z'
    },
    {
      id: 'task_3',
      title: 'Configure Google Sheets Sync for carrier tracking dispatches',
      description: 'AeroFlux Logistics requested automated spreadsheet logging for 10k monthly shipment receipts.',
      priority: 'medium',
      status: 'todo',
      dueDate: '2026-09-30T17:00:00Z',
      assignedAgentName: 'Hermes Mail Dispatcher',
      customerName: 'Chloe Tremblay',
      createdAt: '2026-09-28T14:15:00Z'
    },
    {
      id: 'task_4',
      title: 'Confirm SSO Provisioning on Okta for Acme Corporation',
      description: 'Setup SAML 2.0 endpoint for Sarah Jenkins team (150 members).',
      priority: 'medium',
      status: 'completed',
      dueDate: '2026-09-28T16:00:00Z',
      customerName: 'Sarah Jenkins',
      customerId: 'cust_101',
      createdAt: '2026-09-27T10:00:00Z'
    }
  ] as Task[],

  integrations: [
    {
      id: 'int_gmail',
      key: 'gmail',
      name: 'Gmail & Google Workspace',
      category: 'email',
      status: 'not_connected',
      description: 'Read inbound emails, filter business messages, generate AI drafts, and send approved outbound responses.',
      icon: 'Mail',
      authType: 'oauth',
      config: {
        accountEmail: '',
        clientId: ''
      },
      requiredFields: [
        {
          name: 'OAuth Client ID',
          key: 'clientId',
          type: 'text',
          description: 'From Google Cloud Console under APIs & Services > Credentials.',
          placeholder: '123456789-abc.apps.googleusercontent.com',
          required: true
        },
        {
          name: 'Authorized Account Email',
          key: 'accountEmail',
          type: 'text',
          description: 'The email address of the inbox AutoPilot will monitor.',
          placeholder: 'support@yourdomain.com',
          required: true
        }
      ]
    },
    {
      id: 'int_sheets',
      key: 'google_sheets',
      name: 'Google Sheets',
      category: 'productivity',
      status: 'not_connected',
      description: 'Read spreadsheet rows, append customer data, sync leads, and update records in real-time.',
      icon: 'FileSpreadsheet',
      authType: 'oauth',
      config: {
        spreadsheetId: ''
      },
      requiredFields: [
        {
          name: 'Spreadsheet ID',
          key: 'spreadsheetId',
          type: 'text',
          description: 'The ID string found in your Google Sheet URL (docs.google.com/spreadsheets/d/{ID}/edit).',
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          required: true
        }
      ]
    },
    {
      id: 'int_calendar',
      key: 'google_calendar',
      name: 'Google Calendar',
      category: 'productivity',
      status: 'not_connected',
      description: 'Cross-reference calendar slots, avoid double bookings, and book meetings directly through AI scheduling agents.',
      icon: 'Calendar',
      authType: 'oauth',
      config: {
        calendarId: 'primary'
      },
      requiredFields: [
        {
          name: 'Calendar ID',
          key: 'calendarId',
          type: 'text',
          description: 'Usually "primary" or your specific resource calendar email address.',
          placeholder: 'primary',
          required: true
        }
      ]
    },
    {
      id: 'int_whatsapp',
      key: 'whatsapp',
      name: 'WhatsApp Business Cloud API',
      category: 'messaging',
      status: 'not_connected',
      description: 'Receive customer messages via WhatsApp, generate AI replies, support human takeover, and broadcast notifications.',
      icon: 'MessageSquare',
      authType: 'api_key',
      config: {
        apiKey: '',
        phoneNumberId: '',
        environment: 'sandbox'
      },
      requiredFields: [
        {
          name: 'Meta Cloud API Access Token',
          key: 'apiKey',
          type: 'password',
          description: 'Permanent System User token with whatsapp_business_messaging permission.',
          placeholder: 'EAAOx...',
          required: true
        },
        {
          name: 'Phone Number ID',
          key: 'phoneNumberId',
          type: 'text',
          description: 'Found in Meta App Dashboard > WhatsApp > API Setup.',
          placeholder: '108927481928410',
          required: true
        },
        {
          name: 'Environment',
          key: 'environment',
          type: 'select',
          description: 'Use Sandbox for testing with test numbers or Production for live traffic.',
          placeholder: 'sandbox',
          options: ['sandbox', 'production'],
          required: true
        }
      ]
    },
    {
      id: 'int_slack',
      key: 'slack',
      name: 'Slack Alerts & Approvals',
      category: 'messaging',
      status: 'not_connected',
      description: 'Deliver instant alerts for high-value leads, automation failures, and interactive human approval buttons into Slack channels.',
      icon: 'Hash',
      authType: 'webhook',
      config: {
        webhookUrl: '',
        channelName: '#autopilot-alerts'
      },
      requiredFields: [
        {
          name: 'Incoming Webhook URL',
          key: 'webhookUrl',
          type: 'url',
          description: 'Create an Incoming Webhook in your Slack Workspace App configuration.',
          placeholder: 'YOUR_SLACK_INCOMING_WEBHOOK_URL',
          required: true
        },
        {
          name: 'Target Channel',
          key: 'channelName',
          type: 'text',
          description: 'Slack channel where alerts and approvals will post.',
          placeholder: '#autopilot-alerts',
          required: false
        }
      ]
    },
    {
      id: 'int_webhook',
      key: 'webhook',
      name: 'Custom Webhook Dispatcher',
      category: 'api',
      status: 'connected',
      description: 'Trigger automations from any external HTTP POST event or dispatch outbound payloads to your internal servers.',
      icon: 'Webhook',
      authType: 'api_key',
      lastSync: '2026-09-29T07:18:22Z',
      config: {
        webhookUrl: 'https://api.autopilot.internal/v1/inbound-events',
        apiKey: ''
      },
      requiredFields: [
        {
          name: 'Target Endpoint URL',
          key: 'webhookUrl',
          type: 'url',
          description: 'Your server destination URL for automated HTTP POST payloads.',
          placeholder: 'https://api.yourdomain.com/webhooks/autopilot',
          required: true
        },
        {
          name: 'Signing Secret / Authorization Header',
          key: 'apiKey',
          type: 'password',
          description: 'HMAC secret key used to sign dispatch headers for security validation.',
          placeholder: 'sec_live_...',
          required: false
        }
      ]
    }
  ] as Integration[],

  automationRuns: [
    {
      id: 'run_901',
      automationId: 'auto_support_triage',
      automationName: 'Customer Support Auto-Triage & Resolution',
      executionMode: 'real',
      status: 'completed',
      triggerEvent: {
        type: 'new_message',
        payload: {
          customerId: 'cust_101',
          customerName: 'Sarah Jenkins',
          text: 'Can you clarify how rate limiting works on custom Webhooks?'
        }
      },
      startTime: '2026-09-29T07:16:30Z',
      endTime: '2026-09-29T07:18:00Z',
      durationMs: 1500,
      stepsTimeline: [
        {
          stepId: 'step_1',
          stepName: 'Analyze Customer Intent & Sentiment',
          category: 'ai',
          type: 'analyze_text',
          status: 'success',
          startTime: '2026-09-29T07:16:30Z',
          durationMs: 640,
          input: { message: 'Can you clarify how rate limiting works on custom Webhooks?' },
          output: {
            intent: 'technical_inquiry_webhooks',
            sentiment: 'neutral',
            confidence: 0.96,
            needs_human: false,
            urgency: 'low'
          },
          aiDecision: {
            intent: 'technical_inquiry_webhooks',
            confidence: 0.96,
            needs_human: false,
            reasoning: 'Customer asked straightforward architectural question regarding webhook throughput limits.'
          }
        },
        {
          stepId: 'step_2',
          stepName: 'Human Escalation Check',
          category: 'logic',
          type: 'if_else',
          status: 'success',
          startTime: '2026-09-29T07:16:31Z',
          durationMs: 12,
          input: { needs_human: false, confidence: 0.96 },
          output: { branch: 'else (AI auto-resolution path)' }
        },
        {
          stepId: 'step_3',
          stepName: 'Generate Contextual Answer',
          category: 'ai',
          type: 'generate_response',
          status: 'success',
          startTime: '2026-09-29T07:16:31Z',
          durationMs: 780,
          input: { context: 'Enterprise plan, 600 req/min' },
          output: { responseSent: 'Hello Sarah! On your Enterprise plan, incoming webhooks support up to 600 requests per minute...' }
        },
        {
          stepId: 'step_4',
          stepName: 'Update Customer Record & Activity',
          category: 'action',
          type: 'update_customer',
          status: 'success',
          startTime: '2026-09-29T07:16:32Z',
          durationMs: 68,
          input: { customerId: 'cust_101' },
          output: { updated: true, lastInteraction: '2026-09-29T07:18:00Z' }
        }
      ],
      finalResult: {
        summary: 'Answer generated with 96% AI confidence and delivered to customer web chat.',
        actionsTaken: ['Evaluated intent', 'Generated response', 'Updated customer record']
      }
    },
    {
      id: 'run_902',
      automationId: 'auto_lead_scoring',
      automationName: 'Inbound Lead AI Qualifier & CRM Pipeline',
      executionMode: 'real',
      status: 'completed',
      triggerEvent: {
        type: 'new_lead',
        payload: {
          leadId: 'lead_201',
          name: 'Julian Vance',
          company: 'Vance Digital Media',
          budget: '$15k quarterly'
        }
      },
      startTime: '2026-09-29T06:45:00Z',
      endTime: '2026-09-29T06:45:03Z',
      durationMs: 2840,
      stepsTimeline: [
        {
          stepId: 'step_l1',
          stepName: 'AI Lead Qualification & Scoring',
          category: 'ai',
          type: 'qualify_lead',
          status: 'success',
          startTime: '2026-09-29T06:45:00Z',
          durationMs: 1420,
          input: { name: 'Julian Vance', company: 'Vance Digital Media' },
          output: { score: 88, category: 'qualified', buyingSignals: ['Confirmed budget', 'Urgent timeline'] },
          aiDecision: {
            confidence: 0.94,
            reasoning: 'Strong ICP match, decision maker with clear budget authorization.'
          }
        },
        {
          stepId: 'step_l2',
          stepName: 'High-Value Lead Routing',
          category: 'logic',
          type: 'if_else',
          status: 'success',
          startTime: '2026-09-29T06:45:01Z',
          durationMs: 15,
          input: { score: 88 },
          output: { branch: 'if (High Value - Score >= 75)' }
        },
        {
          stepId: 'step_l3',
          stepName: 'Create CRM Follow-up Task',
          category: 'action',
          type: 'add_task',
          status: 'success',
          startTime: '2026-09-29T06:45:02Z',
          durationMs: 80,
          input: { priority: 'high', leadName: 'Julian Vance' },
          output: { taskId: 'task_2', created: true }
        },
        {
          stepId: 'step_l4',
          stepName: 'Dispatch In-App Notification',
          category: 'action',
          type: 'send_notification',
          status: 'success',
          startTime: '2026-09-29T06:45:02Z',
          durationMs: 40,
          input: { title: 'High-Score Lead Arrived' },
          output: { dispatched: true }
        }
      ],
      finalResult: {
        summary: 'Lead qualified at Score 88/100. Priority task generated and sales alerted.',
        actionsTaken: ['Evaluated lead scoring', 'Created Task #task_2', 'Sent notification']
      }
    },
    {
      id: 'run_903',
      automationId: 'auto_email_approvals',
      automationName: 'Executive Email Drafter & Approval Queue',
      executionMode: 'real',
      status: 'needs_approval',
      triggerEvent: {
        type: 'new_email',
        payload: {
          from: 'investors@apexhorizon.com',
          subject: 'Due Diligence Questionnaire Follow-up',
          body: 'We are reviewing the data room for Series A. Could you provide the updated MRR retention cohort table?'
        }
      },
      startTime: '2026-09-29T05:22:00Z',
      durationMs: 1200,
      stepsTimeline: [
        {
          stepId: 'step_e1',
          stepName: 'Email Summarizer & Intent Classifier',
          category: 'ai',
          type: 'summarize',
          status: 'success',
          startTime: '2026-09-29T05:22:00Z',
          durationMs: 510,
          input: { subject: 'Due Diligence Questionnaire Follow-up' },
          output: { summary: 'Investor inquiry requesting updated MRR retention cohort table.', urgency: 'high' }
        },
        {
          stepId: 'step_e2',
          stepName: 'Draft Polished Response',
          category: 'ai',
          type: 'generate_response',
          status: 'success',
          startTime: '2026-09-29T05:22:01Z',
          durationMs: 650,
          input: { agentId: 'agent_email' },
          output: {
            draftSubject: 'Re: Due Diligence Questionnaire Follow-up',
            draftBody: 'Thank you for following up. We have refreshed the retention cohort matrix in Folder 2.4 of the secure data room. Please let us know if any metrics require further clarification.'
          }
        },
        {
          stepId: 'step_e3',
          stepName: 'Require Human Approval',
          category: 'logic',
          type: 'approval_required',
          status: 'waiting_approval',
          startTime: '2026-09-29T05:22:02Z',
          durationMs: 40,
          input: { mode: 'approval_required' },
          output: { message: 'Workflow paused pending executive human approval.' }
        }
      ],
      pendingApproval: {
        actionType: 'send_email',
        description: 'Send response email to investors@apexhorizon.com regarding due diligence cohort table',
        payload: {
          to: 'investors@apexhorizon.com',
          subject: 'Re: Due Diligence Questionnaire Follow-up',
          body: 'Thank you for following up. We have refreshed the retention cohort matrix in Folder 2.4 of the secure data room. Please let us know if any metrics require further clarification.'
        },
        status: 'pending'
      }
    }
  ] as AutomationRun[],

  activityLogs: [
    {
      id: 'act_1',
      timestamp: '2026-09-29T07:18:22Z',
      category: 'automation',
      action: 'Execution Succeeded',
      description: 'Automation "Customer Support Auto-Triage & Resolution" resolved message for Sarah Jenkins.',
      status: 'success',
      metadata: { runId: 'run_901', duration: '1.5s' }
    },
    {
      id: 'act_2',
      timestamp: '2026-09-29T06:55:10Z',
      category: 'ai_action',
      action: 'Human Escalation Triggered',
      description: 'Atlas AI escalated conversation with Elena Rostova due to billing dispute keyword and lower confidence score (0.71).',
      status: 'warning',
      metadata: { conversationId: 'conv_2', customer: 'Elena Rostova' }
    },
    {
      id: 'act_3',
      timestamp: '2026-09-29T06:45:03Z',
      category: 'lead',
      action: 'Lead Qualified by AI',
      description: 'Vanguard AI scored Julian Vance at 88/100 (Enterprise Qualified). Created follow-up task #task_2.',
      status: 'success',
      metadata: { leadId: 'lead_201', score: 88 }
    },
    {
      id: 'act_4',
      timestamp: '2026-09-29T05:22:02Z',
      category: 'human_approval',
      action: 'Approval Required',
      description: 'Hermes AI generated email response for investors@apexhorizon.com. Paused workflow for executive approval.',
      status: 'warning',
      metadata: { runId: 'run_903' }
    },
    {
      id: 'act_5',
      timestamp: '2026-09-28T22:10:00Z',
      category: 'external_api',
      action: 'API Connection Refused',
      description: 'Google Sheets sync failed: Integration is Not Connected. User prompted to configure credentials in Integrations screen.',
      status: 'error',
      metadata: { integration: 'google_sheets', code: 'AUTH_REQUIRED' }
    }
  ] as ActivityLog[],

  notifications: [
    {
      id: 'notif_1',
      title: 'Action Requires Approval',
      message: 'Hermes AI prepared an email response for investors@apexhorizon.com awaiting your review.',
      type: 'approval_needed',
      read: false,
      timestamp: '2026-09-29T05:22:00Z',
      actionUrl: '/automations?runId=run_903'
    },
    {
      id: 'notif_2',
      title: 'Human Attention Required',
      message: 'Conversation with Elena Rostova (Helios Retail) escalated to human queue: billing invoice dispute.',
      type: 'warning',
      read: false,
      timestamp: '2026-09-29T06:55:00Z',
      actionUrl: '/conversations?id=conv_2'
    },
    {
      id: 'notif_3',
      title: 'High-Score Lead Qualified',
      message: 'Julian Vance scored 88/100 by Vanguard AI. High probability enterprise account.',
      type: 'success',
      read: true,
      timestamp: '2026-09-29T06:45:00Z',
      actionUrl: '/leads?id=lead_201'
    }
  ] as AppNotification[],

  settings: {
    profile: {
      name: 'Bahi W.',
      email: 'bahiw271@gmail.com',
      company: 'AutoPilot AI Technologies',
      timezone: 'America/Los_Angeles'
    },
    ai: {
      provider: process.env.GROQ_API_KEY ? 'groq' : 'gemini',
      model: process.env.GROQ_API_KEY ? 'qwen/qwen3.8-27b' : 'gemini-3.8-flash',
      temperature: 0.7,
      autoTakeoverThreshold: 0.75,
      leadScoringStrictness: 'balanced',
      groqConnected: Boolean(process.env.GROQ_API_KEY),
      geminiConnected: Boolean(process.env.GEMINI_API_KEY)
    },
    automationDefaults: {
      testModeDefault: false,
      requireApprovalForExternalActions: true,
      maxRetries: 3,
      logRetentionDays: 90
    },
    notifications: {
      inApp: true,
      emailOnFailure: true,
      emailOnApprovalNeeded: true,
      urgentAlertsOnly: false
    },
    security: {
      webhookSecret: '',
      rateLimitingEnabled: true
    }
  } as AppSettings,

  gmailToken: null as string | null,

  gmailSettings: {
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
    aiProvider: (process.env.GROQ_API_KEY ? 'groq' : 'gemini') as 'groq' | 'gemini',
    businessKnowledge: {
      businessName: 'AutoPilot AI Technologies',
      businessDescription: 'AutoPilot AI is an enterprise autonomous customer operations and workflow automation platform. It features autonomous AI agents, visual workflow builders, multi-channel orchestration, live CRM sync, and intelligent email triage and reply systems.',
      productsServices: '1. Starter Plan ($49/month): For solo entrepreneurs and small teams up to 5 users. Includes standard email triage and basic agents.\n2. Pro Plan ($199/month): Designed for teams of 20 to 500 employees. Includes advanced autonomous multi-agent workflows, real-time Gmail OAuth integration with automatic reply generation, Groq ultra-low-latency inference, CRM directory sync, and priority support.\n3. Enterprise Plan (Custom, starts at $899/month): Custom dedicated cloud infrastructure, 99.99% uptime SLA, dedicated technical account manager, custom ERP integrations, and unlimited automated actions.',
      pricing: 'Starter Plan: $49/month. Pro Plan: $199/month. Enterprise Plan starts at $899/month with dedicated support, 99.99% SLA, and custom agent integrations. Billed monthly or annually with a 20% discount on annual billing.',
      businessHours: 'Monday through Friday, 9:00 AM to 6:00 PM EST. AI Agents and email automations operate 24/7/365 without interruption.',
      contactInfo: 'support@autopilot.ai or +1 (800) 555-AUTO. Sales team: sales@autopilot.ai.',
      policies: 'SOC2 Type II certified and GDPR compliant. All subscriptions come with a 30-day no-questions-asked 100% money-back guarantee. Enterprise contracts include a 99.99% uptime guarantee. Customer data is strictly protected and never used to train public AI models.',
      faqs: 'Q: What does your software do?\nA: AutoPilot AI automates inbound customer communication, email triage, lead qualification, and business workflows using autonomous AI agents with human-in-the-loop controls.\n\nQ: How much does it cost?\nA: Starter is $49/mo, Pro is $199/mo, and Enterprise starts at $899/mo.\n\nQ: Can you explain your Pro plan?\nA: The Pro plan ($199/mo) includes full autonomous agent workflows, Gmail automatic replies with thread context, Groq ultra-fast LPU inference, lead scoring, CRM integration, and human approval queues.\n\nQ: I have 40 employees, can your system help us?\nA: Absolutely! Our Pro plan is specifically tailored for companies with 20 to 500 employees to eliminate inbox backlog, triage support tickets, and qualify inbound sales inquiries automatically.\n\nQ: How do I connect Gmail?\nA: In the Gmail Automation section, click "Sign in with Google" to authorize your inbox via official Google OAuth 2.0 with one click.\n\nQ: Can your AI answer customer emails?\nA: Yes! AutoPilot AI reads inbound emails, understands questions in any phrasing, references verified business knowledge, and generates or sends natural, professional replies in the same thread.\n\nQ: Tell me about your features.\nA: Key features include autonomous AI agents (Atlas Support, Vanguard Sales, Hermes Email, Chronos Scheduler), visual drag-and-drop workflow builder, real-time Gmail OAuth integration with thread reply context, Groq & Gemini AI engine support, CRM sync, loop protection, and a global Emergency Stop kill-switch.',
      shippingDelivery: 'Instant digital cloud provisioning within 60 seconds of account activation.',
      refundInfo: 'Full refunds granted within 30 days of purchase upon written request to support@autopilot.ai. Requests for refunds are processed by human staff within 24-48 business hours.'
    }
  } as GmailSettings,

  gmailEmails: [] as GmailEmailRecord[]
};

export function getGmailStats(): DetailedGmailStats {
  const allEmails = db.gmailEmails;
  const realEmails = allEmails.filter((e) => !e.isTest);
  const testEmails = allEmails.filter((e) => e.isTest);

  const calc = (emails: typeof allEmails): GmailStats => ({
    emailsReceived: emails.length,
    emailsProcessed: emails.filter((e) => e.replyStatus !== 'failed' && e.replyStatus !== 'skipped').length,
    aiRepliesGenerated: emails.filter((e) => !!e.proposedReply).length,
    repliesSent: emails.filter((e) => e.replyStatus === 'sent').length,
    waitingForApproval: emails.filter((e) => e.replyStatus === 'pending_approval').length,
    humanEscalations: emails.filter((e) => e.replyStatus === 'human_required').length,
    failedExecutions: emails.filter((e) => e.replyStatus === 'failed').length
  });

  const total = calc(allEmails);
  const real = calc(realEmails);
  const test = calc(testEmails);

  return {
    ...total,
    real,
    test
  };
}

// Helper mutation methods
export function addActivityLog(
  category: ActivityLog['category'],
  action: string,
  description: string,
  status: ActivityLog['status'] = 'info',
  metadata?: Record<string, any>
) {
  const log: ActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    category,
    action,
    description,
    status,
    metadata
  };
  db.activityLogs.unshift(log);
  if (db.activityLogs.length > 500) {
    db.activityLogs.pop();
  }
  return log;
}

export function addNotification(
  title: string,
  message: string,
  type: AppNotification['type'] = 'info',
  actionUrl?: string
) {
  const notif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    message,
    type,
    read: false,
    timestamp: new Date().toISOString(),
    actionUrl
  };
  db.notifications.unshift(notif);
  if (db.notifications.length > 100) {
    db.notifications.pop();
  }
  return notif;
}
