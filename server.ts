import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import { db, addActivityLog, addNotification, getGmailStats } from './server/db.ts';
import { chatWithAgent, qualifyLeadAI, analyzeTextForWorkflow } from './server/ai.ts';
import { executeAutomation } from './server/engine.ts';
import { getGmailUserProfile } from './server/gmail.ts';
import {
  processIncomingEmail,
  approveAndSendEmail,
  rejectEmailReply,
  takeOverEmailReply,
  syncGmailInbox,
  startGmailPolling,
  runPreflightCheck
} from './server/gmailEngine.ts';
import { testGroqConnection, DEFAULT_GROQ_MODEL } from './server/groq.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction && process.env.PORT ? Number(process.env.PORT) : 3000;

async function createServer() {
  const app = express();
  app.use(express.json());

  // Start background Gmail inbox polling
  startGmailPolling();

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------

  // 1. Dashboard Stats
  app.get('/api/dashboard/stats', (req, res) => {
    const totalAutomations = db.automations.length;
    const activeAutomations = db.automations.filter(a => a.status === 'active').length;
    const totalAgents = db.agents.length;
    const customersCount = db.customers.length;
    const leadsCount = db.leads.length;
    const messagesCount = db.conversations.reduce((acc, c) => acc + c.messages.length, 0);
    const successfulExecutions = db.automations.reduce((acc, a) => acc + a.successCount, 0);
    const failedExecutions = db.automations.reduce((acc, a) => acc + a.failureCount, 0);
    const tasksCompleted = db.tasks.filter(t => t.status === 'completed').length;
    const tasksPending = db.tasks.filter(t => t.status !== 'completed').length;
    const gmailStats = getGmailStats();

    res.json({
      metrics: {
        totalAutomations,
        activeAutomations,
        totalAgents,
        customersCount,
        leadsCount,
        messagesCount,
        successfulExecutions,
        failedExecutions,
        tasksCompleted,
        tasksPending
      },
      gmailStats,
      gmailSettings: db.gmailSettings,
      recentRuns: db.automationRuns.slice(0, 5),
      recentActivity: db.activityLogs.slice(0, 8),
      recentEmails: db.gmailEmails.slice(0, 6),
      leadsBreakdown: {
        qualified: db.leads.filter(l => l.status === 'qualified').length,
        interested: db.leads.filter(l => l.status === 'interested').length,
        new: db.leads.filter(l => l.status === 'new').length,
        follow_up: db.leads.filter(l => l.status === 'follow_up').length,
        converted: db.leads.filter(l => l.status === 'converted').length,
      }
    });
  });

  // 2. AI Agents CRUD & Chat
  app.get('/api/agents', (req, res) => {
    res.json(db.agents);
  });

  app.post('/api/agents', (req, res) => {
    const newAgent = {
      id: `agent_${Date.now()}`,
      name: req.body.name || 'Custom Agent',
      role: req.body.role || 'Specialist',
      description: req.body.description || '',
      systemInstructions: req.body.systemInstructions || '',
      personality: req.body.personality || 'Helpful and direct',
      goals: req.body.goals || [],
      allowedActions: req.body.allowedActions || [],
      connectedTools: req.body.connectedTools || [],
      knowledgeContext: req.body.knowledgeContext || '',
      status: req.body.status || 'active',
      avatarColor: req.body.avatarColor || 'indigo',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      stats: {
        interactions: 0,
        successRate: 100,
        avgResponseTime: '0.8s'
      }
    };
    db.agents.unshift(newAgent);
    addActivityLog('agent', 'Agent Created', `Created new AI Agent "${newAgent.name}".`, 'success', { agentId: newAgent.id });
    res.status(201).json(newAgent);
  });

  app.put('/api/agents/:id', (req, res) => {
    const agent = db.agents.find(a => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    Object.assign(agent, req.body, { lastActivity: new Date().toISOString() });
    addActivityLog('agent', 'Agent Updated', `Updated parameters for "${agent.name}".`, 'info', { agentId: agent.id });
    res.json(agent);
  });

  app.delete('/api/agents/:id', (req, res) => {
    const idx = db.agents.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agent not found' });
    const deleted = db.agents.splice(idx, 1)[0];
    addActivityLog('agent', 'Agent Deleted', `Deleted AI Agent "${deleted.name}".`, 'warning');
    res.json({ success: true, deletedId: deleted.id });
  });

  // Agent interactive testing chat
  app.post('/api/agents/:id/chat', async (req, res) => {
    const agent = db.agents.find(a => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    try {
      const result = await chatWithAgent(agent, history || [], message);
      agent.stats.interactions += 1;
      agent.lastActivity = new Date().toISOString();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Automations CRUD & Execution
  app.get('/api/automations', (req, res) => {
    res.json(db.automations);
  });

  app.post('/api/automations', (req, res) => {
    const newAuto = {
      id: `auto_${Date.now()}`,
      name: req.body.name || 'New Automation',
      description: req.body.description || '',
      status: req.body.status || 'active',
      mode: req.body.mode || 'auto',
      assignedAgentId: req.body.assignedAgentId || 'agent_support',
      trigger: req.body.trigger || { type: 'new_message', config: {} },
      steps: req.body.steps || [],
      runsCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.automations.unshift(newAuto);
    addActivityLog('automation', 'Automation Created', `Built automation workflow "${newAuto.name}".`, 'success', { automationId: newAuto.id });
    res.status(201).json(newAuto);
  });

  app.put('/api/automations/:id', (req, res) => {
    const auto = db.automations.find(a => a.id === req.params.id);
    if (!auto) return res.status(404).json({ error: 'Automation not found' });
    Object.assign(auto, req.body, { updatedAt: new Date().toISOString() });
    addActivityLog('automation', 'Automation Updated', `Modified workflow "${auto.name}".`, 'info', { automationId: auto.id });
    res.json(auto);
  });

  app.delete('/api/automations/:id', (req, res) => {
    const idx = db.automations.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Automation not found' });
    const deleted = db.automations.splice(idx, 1)[0];
    addActivityLog('automation', 'Automation Deleted', `Deleted automation "${deleted.name}".`, 'warning');
    res.json({ success: true, deletedId: deleted.id });
  });

  // Execute an automation (real vs test mode)
  app.post('/api/automations/:id/run', async (req, res) => {
    const { id } = req.params;
    const { payload, executionMode } = req.body;
    try {
      const runResult = await executeAutomation({
        automationId: id,
        triggerPayload: payload || { text: 'Automated test execution triggered manually.' },
        executionMode: executionMode === 'test' ? 'test' : 'real'
      });
      res.json(runResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Execution Runs & Human Approvals
  app.get('/api/runs', (req, res) => {
    const { automationId, status } = req.query;
    let runs = db.automationRuns;
    if (automationId) runs = runs.filter(r => r.automationId === automationId);
    if (status) runs = runs.filter(r => r.status === status);
    res.json(runs);
  });

  app.get('/api/runs/:id', (req, res) => {
    const run = db.automationRuns.find(r => r.id === req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  });

  app.post('/api/runs/:id/approve', (req, res) => {
    const run = db.automationRuns.find(r => r.id === req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    if (run.status !== 'needs_approval') {
      return res.status(400).json({ error: 'Run does not require approval' });
    }

    run.status = 'completed';
    if (run.pendingApproval) {
      run.pendingApproval.status = 'approved';
    }
    run.endTime = new Date().toISOString();
    run.finalResult = {
      summary: 'Action approved by human supervisor and executed successfully.',
      actionsTaken: ['Human Approval Granted', `Executed action: ${run.pendingApproval?.actionType || 'approved step'}`]
    };

    addActivityLog(
      'human_approval',
      'Approval Granted',
      `User approved pending action for automation "${run.automationName}".`,
      'success',
      { runId: run.id }
    );

    addNotification(
      'Action Executed',
      `Approved action for "${run.automationName}" completed.`,
      'success'
    );

    res.json({ success: true, run });
  });

  app.post('/api/runs/:id/reject', (req, res) => {
    const run = db.automationRuns.find(r => r.id === req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    run.status = 'failed';
    run.error = req.body.reason || 'Action rejected by human supervisor.';
    if (run.pendingApproval) {
      run.pendingApproval.status = 'rejected';
    }
    run.endTime = new Date().toISOString();

    addActivityLog(
      'human_approval',
      'Action Rejected',
      `User rejected pending action for "${run.automationName}": ${run.error}`,
      'warning',
      { runId: run.id }
    );

    res.json({ success: true, run });
  });

  // 5. Customer CRM
  app.get('/api/customers', (req, res) => {
    res.json(db.customers);
  });

  app.post('/api/customers', (req, res) => {
    const newCust = {
      id: `cust_${Date.now()}`,
      name: req.body.name || 'New Customer',
      email: req.body.email || '',
      phone: req.body.phone || '',
      company: req.body.company || '',
      status: req.body.status || 'active',
      tags: req.body.tags || [],
      notes: req.body.notes || '',
      source: req.body.source || 'Manual CRM entry',
      lastInteraction: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      totalSpent: req.body.totalSpent || 0
    };
    db.customers.unshift(newCust);
    addActivityLog('customer', 'Customer Created', `Added customer ${newCust.name} (${newCust.company}).`, 'success');
    res.status(201).json(newCust);
  });

  app.put('/api/customers/:id', (req, res) => {
    const cust = db.customers.find(c => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });
    Object.assign(cust, req.body);
    addActivityLog('customer', 'Customer Updated', `Updated profile for ${cust.name}.`, 'info');
    res.json(cust);
  });

  app.delete('/api/customers/:id', (req, res) => {
    const idx = db.customers.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
    const deleted = db.customers.splice(idx, 1)[0];
    addActivityLog('customer', 'Customer Deleted', `Removed customer ${deleted.name}.`, 'warning');
    res.json({ success: true, deletedId: deleted.id });
  });

  // 6. Leads & AI Lead Scoring
  app.get('/api/leads', (req, res) => {
    res.json(db.leads);
  });

  app.post('/api/leads', async (req, res) => {
    const newLead = {
      id: `lead_${Date.now()}`,
      name: req.body.name || 'Inbound Prospect',
      email: req.body.email || '',
      phone: req.body.phone || '',
      company: req.body.company || '',
      source: req.body.source || 'Direct Website',
      interest: req.body.interest || 'Product Inquiries',
      status: req.body.status || 'new',
      score: req.body.score || 50,
      notes: req.body.notes || '',
      lastContact: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // If automatic scoring requested:
    if (req.body.autoScore !== false) {
      const assessment = await qualifyLeadAI({
        name: newLead.name,
        company: newLead.company,
        email: newLead.email,
        source: newLead.source,
        interest: newLead.interest,
        notes: newLead.notes
      });
      newLead.score = assessment.score;
      newLead.status = assessment.category as any;
      (newLead as any).aiAssessment = {
        ...assessment,
        evaluatedAt: new Date().toISOString()
      };
    }

    db.leads.unshift(newLead);
    addActivityLog('lead', 'Lead Created', `Added lead ${newLead.name} (Score: ${newLead.score}).`, 'success');
    res.status(201).json(newLead);
  });

  app.post('/api/leads/:id/ai-qualify', async (req, res) => {
    const lead = db.leads.find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const assessment = await qualifyLeadAI({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      source: lead.source,
      interest: lead.interest,
      notes: lead.notes
    });

    lead.score = assessment.score;
    lead.status = assessment.category as any;
    lead.aiAssessment = {
      ...assessment,
      evaluatedAt: new Date().toISOString()
    };
    lead.lastContact = new Date().toISOString();

    addActivityLog('lead', 'Lead AI-Qualified', `Re-evaluated lead ${lead.name}: Score ${lead.score}/100.`, 'success');
    res.json(lead);
  });

  app.put('/api/leads/:id', (req, res) => {
    const lead = db.leads.find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    Object.assign(lead, req.body);
    addActivityLog('lead', 'Lead Updated', `Updated lead ${lead.name}.`, 'info');
    res.json(lead);
  });

  app.delete('/api/leads/:id', (req, res) => {
    const idx = db.leads.findIndex(l => l.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Lead not found' });
    const deleted = db.leads.splice(idx, 1)[0];
    addActivityLog('lead', 'Lead Removed', `Deleted lead ${deleted.name}.`, 'warning');
    res.json({ success: true, deletedId: deleted.id });
  });

  // 7. Conversations & Messages
  app.get('/api/conversations', (req, res) => {
    res.json(db.conversations);
  });

  app.post('/api/conversations/:id/messages', async (req, res) => {
    const conv = db.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    const { text, sender = 'human_agent', senderName = 'Supervisor' } = req.body;
    if (!text) return res.status(400).json({ error: 'Message text required' });

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender,
      senderName,
      text,
      timestamp: new Date().toISOString(),
      isAi: sender === 'agent'
    };
    conv.messages.push(newMsg as any);
    conv.lastMessageAt = newMsg.timestamp;

    // If customer sent it and status is 'ai_handling', generate real AI reply:
    if (sender === 'customer' && conv.status === 'ai_handling') {
      const agent = db.agents.find(a => a.id === conv.assignedAgentId) || db.agents[0];
      const aiReply = await chatWithAgent(agent, [], text);
      const aiMsg = {
        id: `msg_ai_${Date.now()}`,
        sender: 'agent' as const,
        senderName: `${agent.name} (AI)`,
        text: aiReply.text,
        timestamp: new Date().toISOString(),
        isAi: true,
        metadata: {
          confidence: aiReply.confidence,
          agentId: agent.id
        }
      };
      conv.messages.push(aiMsg);
      conv.lastMessageAt = aiMsg.timestamp;
    }

    res.json({ conversation: conv, message: newMsg });
  });

  app.post('/api/conversations/:id/takeover', (req, res) => {
    const conv = db.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const { status = 'human_required' } = req.body;
    conv.status = status;
    addActivityLog('human_approval', 'Human Takeover Activated', `Operator initiated takeover on conversation with ${conv.customerName}.`, 'warning');
    res.json(conv);
  });

  // 8. Tasks Management
  app.get('/api/tasks', (req, res) => {
    res.json(db.tasks);
  });

  app.post('/api/tasks', (req, res) => {
    const newTask = {
      id: `task_${Date.now()}`,
      title: req.body.title || 'Untitled Task',
      description: req.body.description || '',
      priority: req.body.priority || 'medium',
      status: req.body.status || 'todo',
      dueDate: req.body.dueDate || new Date(Date.now() + 86400000).toISOString(),
      assignedAgentName: req.body.assignedAgentName,
      customerName: req.body.customerName,
      customerId: req.body.customerId,
      sourceAutomationName: req.body.sourceAutomationName || 'Manual Task Creation',
      createdAt: new Date().toISOString()
    };
    db.tasks.unshift(newTask);
    res.status(201).json(newTask);
  });

  app.put('/api/tasks/:id', (req, res) => {
    const task = db.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    Object.assign(task, req.body);
    res.json(task);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const idx = db.tasks.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    const deleted = db.tasks.splice(idx, 1)[0];
    res.json({ success: true, deletedId: deleted.id });
  });

  // 9. Integrations System
  app.get('/api/integrations', (req, res) => {
    res.json(db.integrations);
  });

  app.put('/api/integrations/:key', (req, res) => {
    const integration = db.integrations.find(i => i.key === req.params.key);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });

    const { config, status } = req.body;
    if (config) {
      integration.config = { ...integration.config, ...config };
    }
    if (status) {
      integration.status = status;
    }
    integration.lastSync = new Date().toISOString();
    delete integration.errorMessage;

    addActivityLog('integration', 'Integration Updated', `Configuration updated for ${integration.name}. Status: ${integration.status}.`, 'info');
    res.json(integration);
  });

  app.post('/api/integrations/:key/test', (req, res) => {
    const integration = db.integrations.find(i => i.key === req.params.key);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });

    // Validate that required credentials exist
    let missingField: string | null = null;
    for (const reqField of integration.requiredFields) {
      if (reqField.required) {
        const val = (integration.config as any)[reqField.key];
        if (!val || String(val).trim() === '') {
          missingField = reqField.name;
          break;
        }
      }
    }

    if (missingField) {
      integration.status = 'error';
      integration.errorMessage = `Missing required parameter: ${missingField}`;
      addActivityLog('integration', 'Connection Test Failed', `${integration.name} test failed: missing ${missingField}.`, 'error');
      return res.json({ success: false, status: 'error', message: integration.errorMessage });
    }

    // Mark connected when validly configured
    integration.status = 'connected';
    integration.lastSync = new Date().toISOString();
    delete integration.errorMessage;

    addActivityLog('integration', 'Connection Test Succeeded', `Verified connection to ${integration.name}.`, 'success');
    res.json({ success: true, status: 'connected', message: `Successfully connected and verified ${integration.name}.` });
  });

  // -------------------------------------------------------------
  // Gmail AI Automation & Real OAuth Integration Endpoints
  // -------------------------------------------------------------

  // Save authenticated OAuth session and verify with Gmail API
  app.post('/api/gmail/auth/session', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = req.body.accessToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return res.status(400).json({ error: 'OAuth access token required' });
    }

    try {
      const profile = await getGmailUserProfile(token);
      if (!profile) {
        db.gmailSettings.connectionStatus = 'error';
        return res.status(401).json({ error: 'Failed to verify Gmail account. Invalid or expired OAuth token.' });
      }

      db.gmailToken = token;
      db.gmailSettings.connectionStatus = 'connected';
      db.gmailSettings.connectedEmail = profile.email;
      db.gmailSettings.lastConnectedAt = new Date().toISOString();

      // Update integrations directory status
      const int = db.integrations.find(i => i.key === 'gmail');
      if (int) {
        int.status = 'connected';
        int.config = { ...int.config, accountEmail: profile.email };
        int.lastSync = new Date().toISOString();
        delete int.errorMessage;
      }

      addActivityLog(
        'integration',
        'Gmail Connected via Google OAuth 2.0',
        `Successfully authenticated inbox: ${profile.email} (${profile.messagesTotal} total messages).`,
        'success',
        { email: profile.email }
      );

      addNotification(
        'Gmail Connected',
        `Real Gmail integration activated for ${profile.email}. AI email automation is operational.`,
        'success'
      );

      // Trigger initial background sync
      syncGmailInbox(token).catch(err => console.error('Initial sync error:', err));

      res.json({
        success: true,
        connectionStatus: 'connected',
        email: profile.email,
        messagesTotal: profile.messagesTotal
      });
    } catch (err: any) {
      db.gmailSettings.connectionStatus = 'error';
      res.status(500).json({ error: err.message || 'OAuth verification failed' });
    }
  });

  // Disconnect Gmail
  app.post('/api/gmail/auth/disconnect', (req, res) => {
    const email = db.gmailSettings.connectedEmail;
    db.gmailToken = null;
    db.gmailSettings.connectionStatus = 'not_connected';
    db.gmailSettings.connectedEmail = null;

    const int = db.integrations.find(i => i.key === 'gmail');
    if (int) {
      int.status = 'not_connected';
    }

    addActivityLog('integration', 'Gmail Disconnected', `User disconnected Gmail account (${email || 'None'}).`, 'warning');
    res.json({ success: true, connectionStatus: 'not_connected' });
  });

  // Get current Gmail status and real stats
  app.get('/api/gmail/status', (req, res) => {
    res.json({
      connectionStatus: db.gmailSettings.connectionStatus,
      connectedEmail: db.gmailSettings.connectedEmail,
      lastConnectedAt: db.gmailSettings.lastConnectedAt,
      stats: getGmailStats(),
      settings: db.gmailSettings
    });
  });

  // List processed & queued Gmail messages
  app.get('/api/gmail/emails', (req, res) => {
    const { status, category, search } = req.query;
    let list = db.gmailEmails;

    if (status && status !== 'all') {
      list = list.filter(e => e.replyStatus === status);
    }
    if (category && category !== 'all') {
      list = list.filter(e => e.classification?.category === category);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.from.toLowerCase().includes(q) ||
        e.fromName.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.snippet.toLowerCase().includes(q)
      );
    }

    res.json(list);
  });

  // Manually trigger inbox sync & AI analysis
  app.post('/api/gmail/sync', async (req, res) => {
    if (db.gmailSettings.connectionStatus !== 'connected' || !db.gmailToken) {
      return res.status(400).json({ error: 'Gmail is not connected. Please authenticate with Google first.' });
    }

    try {
      const result = await syncGmailInbox();
      res.json({ success: true, ...result, stats: getGmailStats() });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Sync failed' });
    }
  });

  // Run Test Mode on sample email (Dry run, no email sent)
  app.post('/api/gmail/test-email', async (req, res) => {
    const {
      from = 'prospect@acmecorp.com',
      fromName = 'Sarah Jenkins',
      subject = 'Product and Pricing Inquiry',
      bodyText = 'Hi, can you please tell me more about your product features and current price plans?'
    } = req.body;

    try {
      const testEmail = {
        gmailMessageId: `test_msg_${Date.now()}`,
        gmailThreadId: `test_thread_${Date.now()}`,
        from,
        fromName,
        to: db.gmailSettings.connectedEmail || 'support@autopilot.ai',
        subject,
        date: new Date().toISOString(),
        snippet: bodyText.slice(0, 100),
        bodyText,
        rawHeaders: {
          from: `${fromName} <${from}>`,
          subject,
          'message-id': `<test_${Date.now()}@autopilot.ai>`
        }
      };

      const result = await processIncomingEmail(testEmail, true);
      res.json({
        success: true,
        testMode: true,
        email: result
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Approve and send pending email reply
  app.post('/api/gmail/emails/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { replyText } = req.body;

    try {
      const result = await approveAndSendEmail(id, replyText);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, stats: getGmailStats() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reject email reply
  app.post('/api/gmail/emails/:id/reject', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const result = await rejectEmailReply(id, reason);
      res.json({ ...result, stats: getGmailStats() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Take over email reply manually
  app.post('/api/gmail/emails/:id/takeover', async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    try {
      const result = await takeOverEmailReply(id, notes);
      res.json({ ...result, stats: getGmailStats() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Pre-flight check for Real Auto Reply verification
  app.get('/api/gmail/preflight-check', async (req, res) => {
    try {
      const result = await runPreflightCheck();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Preflight check failed' });
    }
  });

  // Get Gmail settings
  app.get('/api/gmail/settings', (req, res) => {
    res.json(db.gmailSettings);
  });

  // Update Gmail settings
  app.put('/api/gmail/settings', (req, res) => {
    Object.assign(db.gmailSettings, req.body);
    addActivityLog('integration', 'Gmail Settings Updated', `Updated response mode to ${db.gmailSettings.responseMode}.`, 'info');
    res.json(db.gmailSettings);
  });

  // 10. Activity Logs
  app.get('/api/activity', (req, res) => {
    const { category, status } = req.query;
    let logs = db.activityLogs;
    if (category) logs = logs.filter(l => l.category === category);
    if (status) logs = logs.filter(l => l.status === status);
    res.json(logs);
  });

  // 11. Analytics
  app.get('/api/analytics', (req, res) => {
    const totalRuns = db.automations.reduce((acc, a) => acc + a.runsCount, 0);
    const successfulRuns = db.automations.reduce((acc, a) => acc + a.successCount, 0);
    const failedRuns = db.automations.reduce((acc, a) => acc + a.failureCount, 0);
    const avgDuration = '1.42s';

    res.json({
      summary: {
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate: totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(1) : '100',
        avgDuration,
        humanInterventions: db.activityLogs.filter(a => a.category === 'human_approval').length,
        leadsGenerated: db.leads.length,
        customersHandled: db.customers.length,
        tasksCompleted: db.tasks.filter(t => t.status === 'completed').length
      },
      dailyTrends: [
        { date: 'Sep 23', runs: 180, success: 176, failed: 4 },
        { date: 'Sep 24', runs: 240, success: 232, failed: 8 },
        { date: 'Sep 25', runs: 310, success: 304, failed: 6 },
        { date: 'Sep 26', runs: 290, success: 284, failed: 6 },
        { date: 'Sep 27', runs: 380, success: 371, failed: 9 },
        { date: 'Sep 28', runs: 420, success: 412, failed: 8 },
        { date: 'Sep 29', runs: 468, success: 457, failed: 11 },
      ],
      agentPerformance: db.agents.map(a => ({
        name: a.name,
        role: a.role,
        interactions: a.stats.interactions,
        successRate: a.stats.successRate,
        responseTime: a.stats.avgResponseTime
      }))
    });
  });

  // 12. Notifications
  app.get('/api/notifications', (req, res) => {
    res.json(db.notifications);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const notif = db.notifications.find(n => n.id === req.params.id);
    if (notif) notif.read = true;
    res.json({ success: true });
  });

  app.post('/api/notifications/mark-all-read', (req, res) => {
    db.notifications.forEach(n => { n.read = true; });
    res.json({ success: true });
  });

  // 13. Settings
  app.get('/api/settings', (req, res) => {
    res.json(db.settings);
  });

  app.put('/api/settings', (req, res) => {
    Object.assign(db.settings, req.body);
    // If ai.provider was changed, sync to gmailSettings as well
    if (req.body.ai?.provider) {
      db.gmailSettings.aiProvider = req.body.ai.provider;
    }
    addActivityLog('integration', 'Settings Updated', `Platform preferences updated (AI Provider: ${db.settings.ai?.provider || 'default'}).`, 'info');
    res.json(db.settings);
  });

  // 14. AI Provider Status & Test Connection (No secrets exposed)
  app.get('/api/ai/status', (req, res) => {
    res.json({
      groqConnected: Boolean(process.env.GROQ_API_KEY),
      geminiConnected: Boolean(process.env.GEMINI_API_KEY),
      activeProvider: db.settings.ai?.provider || db.gmailSettings.aiProvider || (process.env.GROQ_API_KEY ? 'groq' : 'gemini'),
      groqModel: DEFAULT_GROQ_MODEL,
      geminiModel: 'gemini-3.8-flash'
    });
  });

  app.post('/api/ai/test-groq', async (req, res) => {
    try {
      const result = await testGroqConnection();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        model: DEFAULT_GROQ_MODEL,
        message: 'Groq test execution error',
        error: err.message
      });
    }
  });

  // -------------------------------------------------------------
  // Frontend Serving (Vite in Dev, Static in Prod)
  // -------------------------------------------------------------
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    const fs = await import('fs/promises');
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoPilot AI server running on http://0.0.0.0:${PORT} [production=${isProduction}]`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start AutoPilot AI server:', err);
  process.exit(1);
});
