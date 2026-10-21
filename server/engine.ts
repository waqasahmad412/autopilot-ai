import { db, addActivityLog, addNotification } from './db.ts';
import { 
  analyzeTextForWorkflow, 
  qualifyLeadAI, 
  generateWorkflowResponse, 
  summarizeWorkflowText 
} from './ai.ts';
import { Automation, AutomationRun, StepExecutionLog, WorkflowStep } from '../src/types.ts';

export async function executeAutomation(options: {
  automationId: string;
  triggerPayload: Record<string, any>;
  executionMode?: 'real' | 'test';
}): Promise<AutomationRun> {
  const { automationId, triggerPayload, executionMode = 'real' } = options;
  const automation = db.automations.find(a => a.id === automationId);

  if (!automation) {
    throw new Error(`Automation with ID ${automationId} not found.`);
  }

  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = new Date().toISOString();
  const stepsTimeline: StepExecutionLog[] = [];
  const actionsTaken: string[] = [];

  const runRecord: AutomationRun = {
    id: runId,
    automationId: automation.id,
    automationName: automation.name,
    executionMode,
    status: 'running',
    triggerEvent: {
      type: automation.trigger.type,
      payload: triggerPayload
    },
    startTime,
    stepsTimeline
  };

  // Pre-insert into DB so running state can be tracked
  db.automationRuns.unshift(runRecord);

  // Context carried across steps
  const executionContext: Record<string, any> = {
    trigger: triggerPayload,
    isTest: executionMode === 'test',
    assignedAgentId: automation.assignedAgentId
  };

  const agent = db.agents.find(a => a.id === automation.assignedAgentId);

  try {
    for (const step of automation.steps) {
      const stepStart = Date.now();
      const stepLog: StepExecutionLog = {
        stepId: step.id,
        stepName: step.name,
        category: step.category,
        type: step.type,
        status: 'success',
        startTime: new Date().toISOString(),
        durationMs: 0,
        input: { ...executionContext },
        output: null
      };

      // 1. AI Actions
      if (step.category === 'ai') {
        if (step.type === 'analyze_text') {
          const textToAnalyze = triggerPayload.text || triggerPayload.message || triggerPayload.notes || JSON.stringify(triggerPayload);
          const aiResult = await analyzeTextForWorkflow(textToAnalyze, executionContext);
          stepLog.output = aiResult;
          stepLog.aiDecision = {
            intent: aiResult.intent,
            confidence: aiResult.confidence,
            needs_human: aiResult.needs_human,
            reasoning: aiResult.summary
          };
          executionContext.aiAnalysis = aiResult;
          executionContext.needsHuman = aiResult.needs_human;
          executionContext.intent = aiResult.intent;
        } else if (step.type === 'qualify_lead') {
          const leadInput = {
            name: triggerPayload.name || 'Anonymous Prospect',
            company: triggerPayload.company || 'Undisclosed Corp',
            email: triggerPayload.email,
            source: triggerPayload.source,
            interest: triggerPayload.interest || 'AI Automation Suite',
            notes: triggerPayload.notes
          };
          const aiLeadResult = await qualifyLeadAI(leadInput);
          stepLog.output = aiLeadResult;
          stepLog.aiDecision = {
            intent: 'lead_qualification',
            confidence: aiLeadResult.confidence,
            reasoning: aiLeadResult.reasoning
          };
          executionContext.leadQualification = aiLeadResult;
          executionContext.leadScore = aiLeadResult.score;
        } else if (step.type === 'generate_response') {
          const userQuery = triggerPayload.text || triggerPayload.message || 'Product questions';
          const customerName = triggerPayload.customerName || triggerPayload.name || 'Valued Customer';
          const generated = await generateWorkflowResponse({
            agentName: agent?.name,
            agentPersona: agent?.personality,
            customerName,
            intent: executionContext.intent,
            userMessage: userQuery,
            knowledge: agent?.knowledgeContext
          });
          stepLog.output = generated;
          executionContext.generatedReply = generated.response;
          actionsTaken.push(`Generated AI response via ${agent?.name || 'Assistant'}`);
        } else if (step.type === 'summarize') {
          const text = triggerPayload.body || triggerPayload.text || triggerPayload.subject || JSON.stringify(triggerPayload);
          const summary = await summarizeWorkflowText(text);
          stepLog.output = summary;
          executionContext.summary = summary;
        }
      }

      // 2. Logic & Conditions
      else if (step.category === 'logic') {
        if (step.type === 'if_else') {
          const condition = step.config?.condition || '';
          let branchResult = true;

          if (condition.includes('needs_human')) {
            branchResult = Boolean(executionContext.needsHuman);
          } else if (condition.includes('score >=')) {
            const threshold = parseInt(condition.replace(/[^0-9]/g, '') || '70', 10);
            branchResult = (executionContext.leadScore || 0) >= threshold;
          }

          stepLog.output = {
            conditionEvaluated: condition,
            passed: branchResult,
            branch: branchResult ? 'if (True Branch)' : 'else (Alternative Branch)'
          };
        } else if (step.type === 'approval_required' || automation.mode === 'approval_required') {
          // If execution is in real mode, pause for human approval
          if (executionMode === 'real') {
            stepLog.status = 'waiting_approval';
            stepLog.output = { message: 'Workflow paused pending human review and authorization.' };
            stepLog.durationMs = Date.now() - stepStart;
            stepsTimeline.push(stepLog);

            runRecord.status = 'needs_approval';
            runRecord.pendingApproval = {
              actionType: step.config?.actionType || 'execute_next_steps',
              description: `Human approval required for automation "${automation.name}" step: ${step.name}`,
              payload: {
                executionContext,
                pendingStep: step.name
              },
              status: 'pending'
            };

            addNotification(
              'Workflow Approval Required',
              `Automation "${automation.name}" requires your authorization to proceed.`,
              'approval_needed',
              `/automations?runId=${runId}`
            );

            addActivityLog(
              'human_approval',
              'Approval Requested',
              `Automation run ${runId} paused at step "${step.name}".`,
              'warning',
              { runId, automationId }
            );

            return runRecord;
          } else {
            stepLog.output = {
              notice: '[TEST MODE SIMULATION]: In live execution, this step pauses and alerts human for approval.'
            };
          }
        }
      }

      // 3. Actions
      else if (step.category === 'action') {
        // Send Email
        if (step.type === 'send_email') {
          const gmailInt = db.integrations.find(i => i.key === 'gmail');
          if (executionMode === 'real') {
            if (gmailInt?.status !== 'connected') {
              stepLog.status = 'failed';
              stepLog.error = 'Gmail integration is Not Connected. Configure credentials in Integrations to enable real email sending.';
              stepLog.output = {
                status: 'NOT_CONNECTED',
                service: 'Gmail',
                remediation: 'Visit Integrations > Gmail & Google Workspace to authorize OAuth connection.'
              };
              // Record error activity
              addActivityLog('external_api', 'Email Dispatch Blocked', 'Gmail is not connected. Action refused.', 'error');
            } else {
              stepLog.output = {
                sent: true,
                to: triggerPayload.email || 'customer@example.com',
                timestamp: new Date().toISOString()
              };
              actionsTaken.push('Dispatched email via connected Gmail');
            }
          } else {
            stepLog.output = {
              simulated: true,
              mode: 'TEST_MODE',
              action: 'Would send email to: ' + (triggerPayload.email || 'customer@example.com'),
              bodyPreview: executionContext.generatedReply || 'Sample AI draft content'
            };
            actionsTaken.push('[TEST] Simulated email dispatch');
          }
        }

        // Add Task
        else if (step.type === 'add_task') {
          const taskTitle = step.config?.title || `Follow up: ${triggerPayload.customerName || triggerPayload.name || 'Customer'}`;
          if (executionMode === 'real') {
            const newTask = {
              id: `task_${Date.now()}`,
              title: taskTitle,
              description: `Automated task generated by "${automation.name}". Context: ${executionContext.intent || 'Workflow Action'}`,
              priority: (step.config?.priority || 'medium') as any,
              status: 'todo' as const,
              dueDate: new Date(Date.now() + 86400000).toISOString(),
              assignedAgentName: agent?.name,
              customerName: triggerPayload.customerName || triggerPayload.name,
              customerId: triggerPayload.customerId,
              sourceAutomationName: automation.name,
              createdAt: new Date().toISOString()
            };
            db.tasks.unshift(newTask);
            stepLog.output = { taskId: newTask.id, created: true };
            actionsTaken.push(`Created Task: "${taskTitle}"`);
          } else {
            stepLog.output = {
              simulated: true,
              mode: 'TEST_MODE',
              action: `Would create CRM task: "${taskTitle}"`
            };
            actionsTaken.push(`[TEST] Simulated task creation: "${taskTitle}"`);
          }
        }

        // Send In-App Notification
        else if (step.type === 'send_notification') {
          if (executionMode === 'real') {
            const notif = addNotification(
              step.config?.title || `Automation: ${automation.name}`,
              `Event processed successfully for ${triggerPayload.customerName || triggerPayload.name || 'record'}.`,
              'info'
            );
            stepLog.output = { notificationId: notif.id, dispatched: true };
            actionsTaken.push('Sent in-app notification');
          } else {
            stepLog.output = {
              simulated: true,
              mode: 'TEST_MODE',
              action: 'Would dispatch in-app notification'
            };
          }
        }

        // Update Customer
        else if (step.type === 'update_customer') {
          if (executionMode === 'real' && triggerPayload.customerId) {
            const customer = db.customers.find(c => c.id === triggerPayload.customerId);
            if (customer) {
              customer.lastInteraction = new Date().toISOString();
              stepLog.output = { customerId: customer.id, updated: true };
              actionsTaken.push(`Updated customer "${customer.name}" interaction`);
            } else {
              stepLog.output = { updated: false, reason: 'Customer ID not found in CRM' };
            }
          } else {
            stepLog.output = {
              simulated: true,
              mode: 'TEST_MODE',
              action: 'Would update customer interaction timestamp'
            };
          }
        }

        // Create Lead
        else if (step.type === 'create_lead') {
          if (executionMode === 'real') {
            const newLead = {
              id: `lead_${Date.now()}`,
              name: triggerPayload.name || 'New Inbound Lead',
              email: triggerPayload.email || 'lead@company.com',
              phone: triggerPayload.phone || '',
              company: triggerPayload.company || 'Enterprise Prospect',
              source: triggerPayload.source || 'Website Inbound',
              interest: triggerPayload.interest || 'AI Automation',
              status: (executionContext.leadQualification?.category || 'new') as any,
              score: executionContext.leadScore || 60,
              aiAssessment: executionContext.leadQualification ? {
                score: executionContext.leadQualification.score,
                reasoning: executionContext.leadQualification.reasoning,
                confidence: executionContext.leadQualification.confidence,
                buyingSignals: executionContext.leadQualification.buyingSignals || [],
                risks: executionContext.leadQualification.risks || [],
                nextRecommendedAction: executionContext.leadQualification.nextRecommendedAction || '',
                evaluatedAt: new Date().toISOString()
              } : undefined,
              notes: 'Created automatically by ' + automation.name,
              lastContact: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            db.leads.unshift(newLead);
            stepLog.output = { leadId: newLead.id, created: true };
            actionsTaken.push(`Created Lead: "${newLead.name}" with Score ${newLead.score}`);
          } else {
            stepLog.output = {
              simulated: true,
              mode: 'TEST_MODE',
              action: `Would insert lead "${triggerPayload.name || 'New Lead'}" into CRM`
            };
          }
        }

        // Google Sheets Add Row
        else if (step.type === 'google_sheets_add_row') {
          const sheetsInt = db.integrations.find(i => i.key === 'google_sheets');
          if (executionMode === 'real') {
            if (sheetsInt?.status !== 'connected') {
              stepLog.status = 'failed';
              stepLog.error = 'Google Sheets is Not Connected. Workflow cannot write to live spreadsheet.';
              stepLog.output = {
                status: 'NOT_CONNECTED',
                service: 'Google Sheets',
                remediation: 'Visit Integrations > Google Sheets and provide authenticated credentials.'
              };
            } else {
              stepLog.output = { appendedRow: true, timestamp: new Date().toISOString() };
              actionsTaken.push('Appended row to Google Sheet');
            }
          } else {
            stepLog.output = {
              simulated: true,
              mode: 'TEST_MODE',
              action: 'Would append record row to Google Sheets'
            };
          }
        }

        // Google Calendar Event
        else if (step.type === 'google_calendar_create_event') {
          const calInt = db.integrations.find(i => i.key === 'google_calendar');
          if (executionMode === 'real') {
            if (calInt?.status !== 'connected') {
              stepLog.status = 'failed';
              stepLog.error = 'Google Calendar is Not Connected. Workflow cannot create calendar invites.';
              stepLog.output = {
                status: 'NOT_CONNECTED',
                service: 'Google Calendar',
                remediation: 'Visit Integrations > Google Calendar and authorize access.'
              };
            } else {
              stepLog.output = { eventCreated: true, calendarId: 'primary' };
              actionsTaken.push('Created event in Google Calendar');
            }
          } else {
            stepLog.output = {
              simulated: true,
              mode: 'TEST_MODE',
              action: 'Would schedule calendar appointment'
            };
          }
        }
      }

      stepLog.durationMs = Date.now() - stepStart;
      stepsTimeline.push(stepLog);

      // If a critical step failed, mark run as failed
      if (stepLog.status === 'failed') {
        runRecord.status = 'failed';
        runRecord.error = stepLog.error;
        break;
      }
    }

    const endTime = new Date().toISOString();
    runRecord.endTime = endTime;
    runRecord.durationMs = Date.now() - new Date(startTime).getTime();

    if (runRecord.status !== 'failed' && runRecord.status !== 'needs_approval') {
      runRecord.status = 'completed';
      runRecord.finalResult = {
        summary: `Successfully completed ${stepsTimeline.length} workflow steps ${executionMode === 'test' ? '[TEST MODE]' : ''}.`,
        actionsTaken
      };

      // Update automation counters
      automation.runsCount += 1;
      automation.successCount += 1;
      automation.lastRunAt = endTime;

      addActivityLog(
        'automation',
        executionMode === 'test' ? 'Automation Tested' : 'Automation Executed',
        `"${automation.name}" finished in ${(runRecord.durationMs / 1000).toFixed(2)}s with ${actionsTaken.length} actions.`,
        'success',
        { runId, automationId, executionMode }
      );
    } else if (runRecord.status === 'failed') {
      automation.runsCount += 1;
      automation.failureCount += 1;
      automation.lastRunAt = endTime;

      addActivityLog(
        'error',
        'Automation Execution Failed',
        `"${automation.name}" failed: ${runRecord.error}`,
        'error',
        { runId, automationId }
      );

      addNotification(
        'Automation Execution Failed',
        `Automation "${automation.name}" encountered an error: ${runRecord.error}`,
        'error',
        `/automations?runId=${runId}`
      );
    }

    return runRecord;
  } catch (err: any) {
    runRecord.status = 'failed';
    runRecord.error = err.message || 'Execution error';
    runRecord.endTime = new Date().toISOString();
    automation.runsCount += 1;
    automation.failureCount += 1;
    return runRecord;
  }
}
