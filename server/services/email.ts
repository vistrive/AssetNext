// Email service using SendGrid integration - referenced from blueprint:javascript_sendgrid
import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set - email functionality will be disabled");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured - cannot send email');
    return false;
  }

  try {
    await sgMail.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function generateSecurePassword(length: number = 12): string {
  const crypto = require('crypto');
  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category using cryptographically secure random
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];
  
  // Fill the rest with cryptographically secure random characters
  for (let i = 4; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password using Fisher-Yates algorithm with cryptographically secure random
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }
  
  return passwordArray.join('');
}

export function createWelcomeEmailTemplate(
  firstName: string,
  lastName: string,
  username: string,
  tempPassword: string,
  organizationName: string
): { subject: string; html: string; text: string } {
  const subject = `Welcome to ${organizationName} - Your Account Details`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
        Welcome to ${organizationName}
      </h2>
      
      <p>Hello ${firstName} ${lastName},</p>
      
      <p>Your account has been created successfully! Here are your login credentials:</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Login Details</h3>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
      </div>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #856404;">⚠️ Important Security Notice</h4>
        <p style="margin-bottom: 0; color: #856404;">
          For security reasons, you will be required to change this password when you first log in. 
          Please choose a strong, unique password that you haven't used elsewhere.
        </p>
      </div>
      
      <p>To access your account:</p>
      <ol>
        <li>Visit the IT Asset Management portal</li>
        <li>Enter your username and temporary password</li>
        <li>Follow the prompts to set your new password</li>
      </ol>
      
      <p>If you have any questions or need assistance, please contact your system administrator.</p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This email was sent automatically by the ${organizationName} IT Asset Management system. 
        Please do not reply to this email.
      </p>
    </div>
  `;
  
  const text = `
Welcome to ${organizationName}

Hello ${firstName} ${lastName},

Your account has been created successfully! Here are your login credentials:

Username: ${username}
Temporary Password: ${tempPassword}

IMPORTANT SECURITY NOTICE:
For security reasons, you will be required to change this password when you first log in. 
Please choose a strong, unique password that you haven't used elsewhere.

To access your account:
1. Visit the IT Asset Management portal
2. Enter your username and temporary password
3. Follow the prompts to set your new password

If you have any questions or need assistance, please contact your system administrator.

---
This email was sent automatically by the ${organizationName} IT Asset Management system. 
Please do not reply to this email.
  `;
  
  return { subject, html, text };
}