import { EmailAttachmentMeta, ThreadMessageContext } from '../src/types.ts';

export interface ParsedEmail {
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
  rawHeaders: Record<string, string>;
  attachments?: EmailAttachmentMeta[];
  threadHistory?: ThreadMessageContext[];
}

// Convert base64 / base64url string to UTF-8
function decodeBase64Url(base64UrlStr: string): string {
  try {
    let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (err) {
    return '';
  }
}

// Convert UTF-8 to safe base64url string for Gmail API
function encodeBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Clean HTML to readable plain text
export function cleanHtmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// Parse sender header "Name <email@domain.com>" or "email@domain.com"
export function parseSenderHeader(headerValue: string): { email: string; name: string } {
  if (!headerValue) return { email: '', name: '' };
  const match = headerValue.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1].replace(/^["']|["']$/g, '').trim();
    const email = match[2].trim().toLowerCase();
    return { name: name || email, email };
  }
  const cleanEmail = headerValue.trim().toLowerCase();
  return { email: cleanEmail, name: cleanEmail.split('@')[0] };
}

// Recursively extract body from Gmail message parts
function extractBodyFromPayload(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    text += decodeBase64Url(payload.body.data);
  } else if (payload.mimeType === 'text/html' && payload.body?.data) {
    html += decodeBase64Url(payload.body.data);
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const extracted = extractBodyFromPayload(part);
      if (extracted.text) text += (text ? '\n' : '') + extracted.text;
      if (extracted.html) html += (html ? '\n' : '') + extracted.html;
    }
  }

  return { text, html };
}

// Recursively extract attachments metadata from Gmail parts
export function extractAttachmentsFromPayload(payload: any): EmailAttachmentMeta[] {
  const attachments: EmailAttachmentMeta[] = [];
  if (!payload) return attachments;

  function traverse(part: any) {
    if (!part) return;
    if (part.filename && part.filename.trim().length > 0) {
      attachments.push({
        filename: part.filename.trim(),
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body?.size || 0
      });
    }
    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  }

  traverse(payload);
  return attachments;
}

// Detect automated, bot, newsletter, bounce, or system loop messages
export function isAutomatedOrBotMessage(email: {
  from: string;
  fromName: string;
  subject: string;
  rawHeaders: Record<string, string>;
}): { isBot: boolean; reason?: string } {
  const fromEmail = email.from.toLowerCase();
  const subject = email.subject.toLowerCase();
  const headers = email.rawHeaders || {};

  // 1. Auto-Submitted header (RFC 3834)
  const autoSubmitted = (headers['auto-submitted'] || '').toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') {
    return { isBot: true, reason: `RFC 3834 Auto-Submitted header: ${autoSubmitted}` };
  }

  // 2. Auto-reply header
  if (headers['x-autoreply'] || headers['x-autorespond']) {
    return { isBot: true, reason: 'Detected X-Autoreply header' };
  }

  // 3. Precedence bulk / junk / list
  const precedence = (headers['precedence'] || '').toLowerCase();
  if (['bulk', 'junk', 'list', 'auto_reply'].includes(precedence)) {
    return { isBot: true, reason: `Precedence header indicated non-personal mail: ${precedence}` };
  }

  // 4. List unsubscribe (Mass newsletters/marketing)
  if (headers['list-unsubscribe'] || headers['list-id']) {
    return { isBot: true, reason: 'Detected newsletter / mailing list headers' };
  }

  // 5. Bot & system sender email prefixes
  const botPrefixes = [
    'mailer-daemon@',
    'postmaster@',
    'noreply@',
    'no-reply@',
    'donotreply@',
    'do-not-reply@',
    'notifications@',
    'notification@',
    'bounce@',
    'bounces@',
    'auto-confirm@',
    'support-noreply@'
  ];
  for (const prefix of botPrefixes) {
    if (fromEmail.startsWith(prefix) || fromEmail.includes(`+${prefix}`)) {
      return { isBot: true, reason: `Sender address is automated: ${fromEmail}` };
    }
  }

  // 6. Subject line loop / out of office patterns
  const botSubjectPatterns = [
    'automatic reply:',
    'auto reply:',
    'out of office:',
    'out of the office:',
    'undeliverable:',
    'delivery status notification (failure)',
    'mail delivery failed',
    'returned mail:'
  ];
  for (const pattern of botSubjectPatterns) {
    if (subject.startsWith(pattern) || subject.includes(pattern)) {
      return { isBot: true, reason: `Subject indicates automated notification: "${email.subject}"` };
    }
  }

  return { isBot: false };
}

// 1. Get user profile from Gmail
export async function getGmailUserProfile(accessToken: string): Promise<{ email: string; messagesTotal: number } | null> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Failed to get Gmail profile:', res.status, errText);
    return null;
  }
  const data = await res.json();
  return {
    email: data.emailAddress,
    messagesTotal: data.messagesTotal
  };
}

// 2. List incoming inbox messages
export async function listInboxMessages(
  accessToken: string,
  maxResults: number = 10,
  query: string = 'label:INBOX'
): Promise<string[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    q: query
  });
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Gmail API list messages error: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.messages || !Array.isArray(data.messages)) {
    return [];
  }
  return data.messages.map((m: any) => m.id);
}

// 3. Get thread context for conversational follow-ups
export async function getGmailThreadContext(
  accessToken: string,
  threadId: string,
  currentMessageId?: string
): Promise<ThreadMessageContext[]> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=from&metadataHeaders=date&metadataHeaders=subject`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.messages || !Array.isArray(data.messages)) return [];

    const history: ThreadMessageContext[] = [];
    for (const msg of data.messages) {
      if (currentMessageId && msg.id === currentMessageId) continue;
      const headers = msg.payload?.headers || [];
      const fromHeader = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
      const dateHeader = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value || '';
      history.push({
        from: fromHeader,
        date: dateHeader,
        snippet: msg.snippet || ''
      });
    }
    return history.slice(-5); // Keep last 5 messages for conversational context
  } catch (err) {
    console.error('Failed to get thread context:', err);
    return [];
  }
}

// 4. Get full message details
export async function getGmailMessage(accessToken: string, messageId: string): Promise<ParsedEmail | null> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    console.error(`Failed to get Gmail message ${messageId}:`, res.statusText);
    return null;
  }

  const data = await res.json();
  const headersList = data.payload?.headers || [];
  const rawHeaders: Record<string, string> = {};
  for (const h of headersList) {
    rawHeaders[h.name.toLowerCase()] = h.value;
  }

  const fromRaw = rawHeaders['from'] || '';
  const { name: fromName, email: fromEmail } = parseSenderHeader(fromRaw);
  const toRaw = rawHeaders['to'] || '';
  const subject = rawHeaders['subject'] || '(No Subject)';
  const date = rawHeaders['date'] || new Date(parseInt(data.internalDate || Date.now(), 10)).toISOString();

  const { text, html } = extractBodyFromPayload(data.payload);
  const bodyText = text.trim() || cleanHtmlToText(html) || data.snippet || '';
  const attachments = extractAttachmentsFromPayload(data.payload);

  return {
    gmailMessageId: data.id,
    gmailThreadId: data.threadId,
    from: fromEmail,
    fromName,
    to: toRaw,
    subject,
    date,
    snippet: data.snippet || '',
    bodyText,
    bodyHtml: html || undefined,
    rawHeaders,
    attachments: attachments.length > 0 ? attachments : undefined
  };
}

// 5. Send Gmail Reply in same thread with proper In-Reply-To and References
export async function sendGmailReply(
  accessToken: string,
  options: {
    to: string;
    from: string;
    subject: string;
    bodyText: string;
    threadId: string;
    inReplyToMessageId?: string;
    references?: string;
  }
): Promise<{ success: boolean; sentMessageId?: string; error?: string }> {
  try {
    const replySubject = options.subject.startsWith('Re:') ? options.subject : `Re: ${options.subject}`;

    // Format RFC 2822 Message-ID safely
    let messageIdHeader: string | undefined;
    if (options.inReplyToMessageId) {
      const trimmed = options.inReplyToMessageId.trim();
      messageIdHeader = trimmed.startsWith('<') && trimmed.endsWith('>') ? trimmed : `<${trimmed}>`;
    }
    
    // Construct standard RFC 2822 email format
    const lines = [
      `To: ${options.to}`,
      `From: ${options.from}`,
      `Subject: ${replySubject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `MIME-Version: 1.0`
    ];

    if (messageIdHeader) {
      lines.push(`In-Reply-To: ${messageIdHeader}`);
      const existingRefs = options.references ? `${options.references} ` : '';
      lines.push(`References: ${existingRefs}${messageIdHeader}`);
    }

    lines.push('');
    lines.push(options.bodyText);

    const rawMessage = lines.join('\r\n');
    const encodedRaw = encodeBase64Url(rawMessage);

    const payload: any = {
      raw: encodedRaw,
      threadId: options.threadId
    };

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gmail send failed [${res.status}]: ${errText}` };
    }

    const data = await res.json();
    return { success: true, sentMessageId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error sending Gmail reply' };
  }
}

// 5. Create Draft in Gmail
export async function createGmailDraft(
  accessToken: string,
  options: {
    to: string;
    from: string;
    subject: string;
    bodyText: string;
    threadId: string;
    inReplyToMessageId?: string;
  }
): Promise<{ success: boolean; draftId?: string; error?: string }> {
  try {
    const replySubject = options.subject.startsWith('Re:') ? options.subject : `Re: ${options.subject}`;
    const lines = [
      `To: ${options.to}`,
      `From: ${options.from}`,
      `Subject: ${replySubject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `MIME-Version: 1.0`
    ];
    if (options.inReplyToMessageId) {
      lines.push(`In-Reply-To: ${options.inReplyToMessageId}`);
      lines.push(`References: ${options.inReplyToMessageId}`);
    }
    lines.push('');
    lines.push(options.bodyText);

    const rawMessage = lines.join('\r\n');
    const encodedRaw = encodeBase64Url(rawMessage);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          raw: encodedRaw,
          threadId: options.threadId
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gmail draft creation failed [${res.status}]: ${errText}` };
    }

    const data = await res.json();
    return { success: true, draftId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error creating Gmail draft' };
  }
}
