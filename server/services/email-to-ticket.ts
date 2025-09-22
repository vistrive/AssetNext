// Email-to-ticket conversion service
import { storage } from "../storage";
import type { InsertTicket } from "@shared/schema";

export interface EmailData {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
  headers?: string;
  envelope?: string;
}

// Extract clean email address from RFC5322 format ("Name <email@domain.com>" or "email@domain.com")
function extractEmailAddress(from: string, envelope?: string, headers?: string): string {
  let emailToExtract = from;
  
  // Try to use envelope data first if available (more reliable)
  if (envelope) {
    try {
      const envelopeData = JSON.parse(envelope);
      if (envelopeData.from) {
        emailToExtract = envelopeData.from;
      }
    } catch {
      // Ignore envelope parsing errors, fallback to from field
    }
  }
  
  // Extract email from "Display Name <email@domain.com>" format
  const emailMatch = emailToExtract.match(/<([^>]+)>/);
  if (emailMatch) {
    return emailMatch[1].toLowerCase().trim();
  }
  
  // If no angle brackets, assume it's already a plain email
  return emailToExtract.toLowerCase().trim();
}

// Extract display name from email "Display Name <email@domain.com>" format
function extractDisplayName(from: string): string {
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch) {
    return nameMatch[1].trim().replace(/"/g, '');
  }
  return '';
}

export interface ParsedTicket {
  title: string;
  description: string;
  category: string;
  priority: string;
  requestorEmail: string;
  requestorName?: string;
  tenantId?: string;
  requestorId?: string;
}

// Extract ticket information from email subject and body
export function parseEmailToTicket(emailData: EmailData): ParsedTicket {
  const { from, subject, text, html } = emailData;
  
  // Use email content as description (prefer text over html)
  let description = text || '';
  if (!description && html) {
    // Basic HTML to text conversion (remove tags)
    description = html.replace(/<[^>]*>/g, '').trim();
  }
  
  // If no description, use placeholder
  if (!description) {
    description = 'Ticket created from email. Please see original email for details.';
  }
  
  // Parse category from subject line keywords
  const category = extractCategoryFromSubject(subject);
  
  // Parse priority from subject line keywords
  const priority = extractPriorityFromSubject(subject);
  
  // Clean up subject for title
  let title = subject || 'Support Request';
  title = title.replace(/^(re:|fwd?:)/i, '').trim();
  
  // Truncate title if too long
  if (title.length > 200) {
    title = title.substring(0, 197) + '...';
  }
  
  // Extract clean email address and display name
  const cleanEmail = extractEmailAddress(from, emailData.envelope, emailData.headers);
  const displayName = extractDisplayName(from);
  const requestorName = displayName || extractNameFromEmail(cleanEmail);
  
  return {
    title,
    description,
    category,
    priority,
    requestorEmail: cleanEmail,
    requestorName
  };
}

// Extract category based on subject line keywords
function extractCategoryFromSubject(subject: string): string {
  const subjectLower = subject.toLowerCase();
  
  if (subjectLower.includes('password') || subjectLower.includes('login') || subjectLower.includes('access')) {
    return 'account';
  }
  if (subjectLower.includes('hardware') || subjectLower.includes('computer') || subjectLower.includes('laptop') || subjectLower.includes('printer')) {
    return 'hardware';
  }
  if (subjectLower.includes('software') || subjectLower.includes('application') || subjectLower.includes('program') || subjectLower.includes('install')) {
    return 'software';
  }
  if (subjectLower.includes('network') || subjectLower.includes('internet') || subjectLower.includes('wifi') || subjectLower.includes('connection')) {
    return 'network';
  }
  
  return 'other';
}

// Extract priority based on subject line keywords
function extractPriorityFromSubject(subject: string): string {
  const subjectLower = subject.toLowerCase();
  
  if (subjectLower.includes('urgent') || subjectLower.includes('emergency') || subjectLower.includes('critical')) {
    return 'urgent';
  }
  if (subjectLower.includes('high') || subjectLower.includes('important') || subjectLower.includes('asap')) {
    return 'high';
  }
  if (subjectLower.includes('low') || subjectLower.includes('minor') || subjectLower.includes('when possible')) {
    return 'low';
  }
  
  return 'medium';
}

// Extract name from email address
function extractNameFromEmail(email: string): string {
  // Get the part before @
  const localPart = email.split('@')[0];
  
  // Convert dots and underscores to spaces, capitalize words
  const name = localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return name;
}

// Find user by email and get their tenant information
export async function findUserByEmail(email: string): Promise<{ userId: string; tenantId: string; firstName: string; lastName: string } | null> {
  try {
    // Normalize email to lowercase for consistent matching
    const normalizedEmail = email.toLowerCase().trim();
    const user = await storage.getUserByEmail(normalizedEmail);
    if (user && user.isActive) {
      return {
        userId: user.id,
        tenantId: user.tenantId,
        firstName: user.firstName,
        lastName: user.lastName
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

// Convert email to ticket and create it in the system
export async function processEmailToTicket(emailData: EmailData): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    // Parse email content to ticket data
    const parsedTicket = parseEmailToTicket(emailData);
    
    // Find user by email
    const user = await findUserByEmail(parsedTicket.requestorEmail);
    
    if (!user) {
      console.warn(`User not found for email: ${parsedTicket.requestorEmail}`);
      return {
        success: false,
        error: `No user account found for email address: ${parsedTicket.requestorEmail}. User must have an account to create tickets via email.`
      };
    }
    
    // Create ticket data
    const ticketData: InsertTicket = {
      title: parsedTicket.title,
      description: parsedTicket.description,
      category: parsedTicket.category,
      priority: parsedTicket.priority,
      status: 'open',
      requestorId: user.userId,
      requestorName: `${user.firstName} ${user.lastName}`,
      requestorEmail: parsedTicket.requestorEmail,
      tenantId: user.tenantId,
      // Optional fields
      assignedToId: undefined,
      assignedToName: undefined,
      assignedById: undefined,
      assignedByName: undefined,
      assignedAt: undefined,
      resolvedAt: undefined,
      closedAt: undefined,
      dueDate: undefined,
      resolution: undefined,
      resolutionNotes: undefined,
      assetId: undefined,
      assetName: undefined,
      attachments: emailData.attachments && emailData.attachments.length > 0 ? emailData.attachments : undefined,
      tags: undefined
    };
    
    // Create the ticket
    const createdTicket = await storage.createTicket(ticketData);
    
    console.log(`Ticket created from email: ${createdTicket.ticketNumber} for user ${user.firstName} ${user.lastName}`);
    
    return {
      success: true,
      ticketId: createdTicket.id
    };
    
  } catch (error) {
    console.error('Error processing email to ticket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Validate email data from webhook
export function validateEmailData(data: any): EmailData | null {
  if (!data.from || !data.to) {
    console.error('Missing required email fields: from or to');
    return null;
  }
  
  // Safely parse attachments JSON
  let attachments: any[] | undefined = undefined;
  if (data.attachments) {
    try {
      attachments = JSON.parse(data.attachments);
    } catch (error) {
      console.warn('Failed to parse attachments JSON, ignoring:', error);
      attachments = undefined;
    }
  }
  
  return {
    from: data.from,
    to: data.to,
    subject: data.subject || 'No Subject',
    text: data.text,
    html: data.html,
    attachments,
    headers: data.headers,
    envelope: data.envelope
  };
}

// Validate webhook authenticity (basic shared secret)
export function validateWebhookAuth(req: any): boolean {
  // For now, we'll implement a basic check
  // In production, you should use SendGrid's Event Webhook signature verification
  // or implement a shared secret in query parameters or headers
  
  // For MVP, we'll just validate that the request has expected SendGrid headers/format
  const userAgent = req.headers['user-agent'] || '';
  const contentType = req.headers['content-type'] || '';
  
  // SendGrid typically sends with specific user agent and content type
  if (contentType.includes('multipart/form-data')) {
    return true; // Basic validation passed
  }
  
  console.warn('Webhook validation failed - suspicious request format');
  return false;
}