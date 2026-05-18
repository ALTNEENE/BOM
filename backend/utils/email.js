import nodemailer from 'nodemailer';

/**
 * Email service for sending transactional emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  /**
   * Initialize the email transporter
   */
  initialize() {
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // <== allow self-signed certs (dev only)
        },
      });
      this.isConfigured = true;
      console.log('📧 Email service initialized');
    } else {
      console.warn('⚠️ Email service not configured - emails will be logged to console');
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   */
  async send({ to, subject, html, text }) {
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Team Sync'}" <${process.env.FROM_EMAIL || 'noreply@BOM Engineers.com'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log(`📧 Email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
      }
    } else {
      // Log email to console in development
      console.log('\n📧 Email would be sent:');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${text || html}\n`);
      return { success: true, messageId: 'dev-mode' };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcome(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Welcome toBOM Engineers! 🎉</h1>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for joiningBOM Engineers! We're excited to have you on board.</p>
        <p>WithBOM Engineers, you can:</p>
        <ul>
          <li>Create and manage projects</li>
          <li>Collaborate with your team</li>
          <li>Track tasks and progress</li>
          <li>Stay organized and productive</li>
        </ul>
        <p>Get started by creating your first project!</p>
        <a href="${process.env.FRONTEND_URL}" 
           style="display: inline-block; background-color: #3B82F6; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Go to Dashboard
        </a>
        <p style="margin-top: 20px; color: #666;">
          Best regards,<br>TheBOM Engineers Team
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: 'Welcome toBOM Engineers!',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user, resetUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Password Reset Request</h1>
        <p>Hi ${user.firstName},</p>
        <p>You requested a password reset for yourBOM Engineers account.</p>
        <p>Click the button below to reset your password. This link is valid for 30 minutes.</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #3B82F6; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Reset Password
        </a>
        <p style="margin-top: 20px; color: #666;">
          If you didn't request this, please ignore this email and your password will remain unchanged.
        </p>
        <p style="color: #666;">
          Best regards,<br>TheBOM Engineers Team
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: 'Password Reset -BOM Engineers',
      html,
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(user, verificationUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Verify Your Email</h1>
        <p>Hi ${user.firstName},</p>
        <p>Please verify your email address by clicking the button below.</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; background-color: #3B82F6; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Verify Email
        </a>
        <p style="margin-top: 20px; color: #666;">
          This link is valid for 24 hours.
        </p>
        <p style="color: #666;">
          Best regards,<br>TheBOM Engineers Team
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: 'Verify Your Email -BOM Engineers',
      html,
    });
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssigned(user, task, assignedBy) {
    const taskUrl = `${process.env.FRONTEND_URL}/tasks/${task._id}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">New Task Assigned</h1>
        <p>Hi ${user.firstName},</p>
        <p>${assignedBy.fullName} has assigned you a new task:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${task.title}</h3>
          ${task.description ? `<p style="color: #666; margin: 0;">${task.description}</p>` : ''}
          ${task.dueDate ? `<p style="color: #666; margin: 8px 0 0 0;"><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
        </div>
        <a href="${taskUrl}" 
           style="display: inline-block; background-color: #3B82F6; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Task
        </a>
        <p style="margin-top: 20px; color: #666;">
          Best regards,<br>TheBOM Engineers Team
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: `New Task Assigned: ${task.title}`,
      html,
    });
  }

  /**
   * Send project invitation
   */
  async sendProjectInvite(user, project, invitedBy) {
    const projectUrl = `${process.env.FRONTEND_URL}/projects/${project.slug}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Project Invitation</h1>
        <p>Hi ${user.firstName},</p>
        <p>${invitedBy.fullName} has invited you to join a project:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${project.name}</h3>
          ${project.description ? `<p style="color: #666; margin: 0;">${project.description}</p>` : ''}
        </div>
        <a href="${projectUrl}" 
           style="display: inline-block; background-color: #3B82F6; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Project
        </a>
        <p style="margin-top: 20px; color: #666;">
          Best regards,<br>TheBOM Engineers Team
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: `Project Invitation: ${project.name}`,
      html,
    });
  }

  /**
   * Send task due reminder
   */
  async sendTaskDueReminder(user, task) {
    const taskUrl = `${process.env.FRONTEND_URL}/tasks/${task._id}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F59E0B;">Task Due Soon ⏰</h1>
        <p>Hi ${user.firstName},</p>
        <p>This is a reminder that the following task is due soon:</p>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${task.title}</h3>
          <p style="color: #92400e; margin: 0;"><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
        </div>
        <a href="${taskUrl}" 
           style="display: inline-block; background-color: #F59E0B; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Task
        </a>
        <p style="margin-top: 20px; color: #666;">
          Best regards,<br>TheBOM Engineers Team
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: `Task Due Soon: ${task.title}`,
      html,
    });
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
