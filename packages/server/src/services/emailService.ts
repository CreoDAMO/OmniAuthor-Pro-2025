import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Configure nodemailer as fallback
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    try {
      if (process.env.SENDGRID_API_KEY) {
        await this.sendWithSendGrid(to, subject, html, text);
      } else {
        await this.sendWithNodemailer(to, subject, html, text);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  private async sendWithSendGrid(to: string, subject: string, html: string, text?: string): Promise<void> {
    const msg = {
      to,
      from: process.env.FROM_EMAIL || 'noreply@omniauthor.com',
      subject,
      text: text || '',
      html,
    };

    await sgMail.send(msg);
  }

  private async sendWithNodemailer(to: string, subject: string, html: string, text?: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@omniauthor.com',
      to,
      subject,
      text: text || '',
      html,
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = 'Welcome to OmniAuthor Pro!';
    const html = `
      <h1>Welcome to OmniAuthor Pro, ${name}!</h1>
      <p>Thank you for joining our platform. We're excited to help you on your writing journey.</p>
      <p>Get started by creating your first manuscript!</p>
    `;
    
    await this.sendEmail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const subject = 'Reset Your Password';
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `;
    
    await this.sendEmail(to, subject, html);
  }

  async sendSubscriptionConfirmation(to: string, tier: string): Promise<void> {
    const subject = 'Subscription Confirmed';
    const html = `
      <h1>Subscription Confirmed!</h1>
      <p>Your ${tier} subscription has been activated.</p>
      <p>Enjoy your enhanced writing experience!</p>
    `;
    
    await this.sendEmail(to, subject, html);
  }
}

export const emailService = new EmailService();
