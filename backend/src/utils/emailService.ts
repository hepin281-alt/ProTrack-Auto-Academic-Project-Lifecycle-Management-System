import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter only if SMTP_HOST is configured
const hasSmtpConfig = !!process.env.SMTP_HOST;

const transporter = hasSmtpConfig
    ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
          auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
          },
      })
    : null;

// Helper to send email or log to console
const sendEmail = async (to: string | string[], subject: string, html: string) => {
    if (!hasSmtpConfig || !transporter) {
        console.log('=================================================================');
        console.log(`[MOCK EMAIL] To: ${Array.isArray(to) ? to.join(', ') : to}`);
        console.log(`[MOCK EMAIL] Subject: ${subject}`);
        console.log(`[MOCK EMAIL] Body:\n${html}`);
        console.log('=================================================================');
        return;
    }

    try {
        await transporter.sendMail({
            from: `"ProTrack-Auto" <${process.env.SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject,
            html,
        });
        console.log(`[Email] Sent successfully to ${to}`);
    } catch (error) {
        console.error('[Email] Failed to send email:', error);
    }
};

// Base HTML Template
const getHtmlTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; color: #334155; line-height: 1.6; }
        .footer { background-color: #f8fafc; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .button { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ProTrack-Auto</h1>
        </div>
        <div class="content">
            <h2>${title}</h2>
            ${content}
        </div>
        <div class="footer">
            This is an automated message from ProTrack-Auto Academic Project Lifecycle Management System. Please do not reply to this email.
        </div>
    </div>
</body>
</html>
`;

export const sendLogbookReminderEmail = async (groupName: string, guideEmail: string, weekNumber: number | string) => {
    if (!guideEmail) return;
    
    const subject = `Logbook Reminder: ${groupName} (Week ${weekNumber})`;
    const content = `
        <p>Hello,</p>
        <p>This is a reminder that the group <strong>${groupName}</strong> has an overdue logbook for Week ${weekNumber}.</p>
        <p>Please review their status or remind them to submit their weekly progress.</p>
    `;
    
    await sendEmail(guideEmail, subject, getHtmlTemplate('Overdue Logbook Reminder', content));
};

export const sendLogbookApprovedEmail = async (studentEmails: string[], groupName: string, weekNumber: number | string) => {
    if (!studentEmails || studentEmails.length === 0) return;
    
    const subject = `Logbook Approved: Week ${weekNumber}`;
    const content = `
        <p>Hello Team <strong>${groupName}</strong>,</p>
        <p>Your logbook for Week ${weekNumber} has been reviewed and <strong>approved</strong> by your guide.</p>
        <p>Keep up the good work!</p>
    `;
    
    await sendEmail(studentEmails, subject, getHtmlTemplate('Logbook Approved', content));
};

export const sendGuideAssignedEmail = async (studentEmails: string[], guideName: string, groupName: string) => {
    if (!studentEmails || studentEmails.length === 0) return;
    
    const subject = `Guide Assigned: ${guideName}`;
    const content = `
        <p>Hello Team <strong>${groupName}</strong>,</p>
        <p>A project guide has been assigned to your group.</p>
        <p><strong>Guide Name:</strong> ${guideName}</p>
        <p>Please reach out to your guide to schedule your initial meeting.</p>
    `;
    
    await sendEmail(studentEmails, subject, getHtmlTemplate('Project Guide Assigned', content));
};

export const sendMilestoneReminderEmail = async (recipients: string[], milestoneName: string, dueDate: string, groupName: string) => {
    if (!recipients || recipients.length === 0) return;
    
    const subject = `Upcoming Milestone: ${milestoneName}`;
    const content = `
        <p>Hello Team <strong>${groupName}</strong>,</p>
        <p>This is a reminder for an upcoming academic milestone.</p>
        <p><strong>Milestone:</strong> ${milestoneName}</p>
        <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        <p>Please ensure all deliverables are completed by the due date.</p>
    `;
    
    await sendEmail(recipients, subject, getHtmlTemplate('Milestone Reminder', content));
};

export const sendWelcomeEmail = async (userEmail: string, fullName: string, role: string) => {
    if (!userEmail) return;
    
    const subject = 'Welcome to ProTrack-Auto';
    const content = `
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Welcome to ProTrack-Auto! Your account has been created successfully with the role of <strong>${role}</strong>.</p>
        <p>You can now log in to the system and access your dashboard.</p>
    `;
    
    await sendEmail(userEmail, subject, getHtmlTemplate('Welcome Aboard', content));
};

export const sendWhitelistInvitationEmail = async (email: string, fullName: string, role: string, appUrl: string = 'http://localhost:5173') => {
    if (!email) return;

    const subject = `Invitation to Join ProTrack-Auto (${role})`;
    const content = `
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>You have been whitelisted as a <strong>${role}</strong> in the ProTrack-Auto system.</p>
        <p>Please visit the portal and click <strong>"Claim Account"</strong> on the login page to set up your password and access your dashboard.</p>
        <br/>
        <a href="${appUrl}" class="button" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to ProTrack-Auto</a>
    `;

    await sendEmail(email, subject, getHtmlTemplate('Action Required: Claim Your Account', content));
};

export const sendTopicApprovalEmail = async (studentEmails: string[], groupName: string, topicTitle: string, status: 'APPROVED' | 'REJECTED', comments?: string) => {
    if (!studentEmails || studentEmails.length === 0) return;

    const subject = `Topic Proposal ${status === 'APPROVED' ? 'Approved' : 'Rejected'}: ${topicTitle}`;
    const statusColor = status === 'APPROVED' ? '#10b981' : '#ef4444';
    
    const content = `
        <p>Hello Team <strong>${groupName}</strong>,</p>
        <p>Your topic proposal for <strong>"${topicTitle}"</strong> has been reviewed by the Project Coordinator.</p>
        <p>Status: <strong style="color: ${statusColor}">${status}</strong></p>
        ${comments ? `<p><strong>Comments:</strong><br/><em style="color: #64748b;">"${comments}"</em></p>` : ''}
        
        ${status === 'REJECTED' ? '<p>Please log in to the system to submit your alternative topic proposals.</p>' : '<p>Congratulations! You can now proceed with your project logbooks and milestones.</p>'}
    `;

    await sendEmail(studentEmails, subject, getHtmlTemplate(`Topic ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`, content));
};
