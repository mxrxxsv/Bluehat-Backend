const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Email templates for job progress notifications
const EMAIL_TEMPLATES = {
  worker_invitation: {
    subject: "New Job Invitation - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Job Invitation - FixIt</h2>
        <p>Hello!</p>
        <p>You have received a new job invitation on FixIt platform.</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p><strong>Proposed Rate:</strong> ₱{proposedRate}</p>
        <p><strong>Message:</strong> {message}</p>
        <p>Please log in to your FixIt account to view the full details and respond to this invitation.</p>
        <p><a href="{frontendUrl}/dashboard" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Invitation</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  invitation_accepted: {
    subject: "Invitation Accepted - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Great News! Invitation Accepted</h2>
        <p>Hello!</p>
        <p>Your job invitation has been accepted!</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p>Please log in to your FixIt account to proceed with the next steps.</p>
        <p><a href="{frontendUrl}/dashboard" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  invitation_rejected: {
    subject: "Invitation Update - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Invitation Update</h2>
        <p>Hello!</p>
        <p>Thank you for the job invitation for "{jobTitle}". Unfortunately, the worker has decided not to proceed with this opportunity.</p>
        <p>Don't worry! There are many other qualified workers available on FixIt.</p>
        <p><a href="{frontendUrl}/jobs" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Find Other Workers</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  application_accepted: {
    subject: "Application Accepted - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Great News! Application Accepted</h2>
        <p>Hello!</p>
        <p>Your application for a job on FixIt has been accepted!</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p>Please log in to your FixIt account to proceed with the next steps.</p>
        <p><a href="{frontendUrl}/dashboard" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  application_submitted: {
    subject: "New Job Application - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Job Application Received</h2>
        <p>Hello!</p>
        <p>You have received a new application for your job on FixIt.</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p><strong>Proposed Rate:</strong> ₱{proposedRate}</p>
        <p><strong>Message:</strong> {message}</p>
        <p>Please log in to your FixIt account to review the application and respond.</p>
        <p><a href="{frontendUrl}/dashboard" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Application</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  application_rejected: {
    subject: "Application Update - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Application Update</h2>
        <p>Hello!</p>
        <p>Thank you for your interest in the job "{jobTitle}" on FixIt. Unfortunately, the client has decided to go with another candidate for this position.</p>
        <p>Don't give up! There are many other opportunities available on FixIt.</p>
        <p><a href="{frontendUrl}/jobs" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Browse More Jobs</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  discussion_started: {
    subject: "Discussion Started - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Discussion Started</h2>
        <p>Hello!</p>
        <p>Someone has started a discussion about a job on FixIt.</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p>Please log in to your FixIt account to continue the conversation.</p>
        <p><a href="{frontendUrl}/messages" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Messages</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  work_started: {
    subject: "Work Started - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Work Started</h2>
        <p>Hello!</p>
        <p>Work has started on your project on FixIt.</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p><strong>Rate:</strong> ₱{agreedRate}</p>
        <p>Please log in to your FixIt account to track the progress.</p>
        <p><a href="{frontendUrl}/dashboard" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Progress</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  work_completed: {
    subject: "Work Completed - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Work Completed</h2>
        <p>Hello!</p>
        <p>Work has been completed on your project on FixIt.</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p>Please log in to your FixIt account to review and confirm completion.</p>
        <p><a href="{frontendUrl}/dashboard" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Work</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  // Worker-side acknowledgement when they click "Work Done"
  awaiting_client_confirmation: {
    subject: "Waiting for Client Confirmation - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Work Completion Submitted</h2>
        <p>Hello!</p>
        <p>You've marked your work as completed for:</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p>The client has been notified and needs to confirm completion. We'll let you know once it's confirmed.</p>
        <p>You can track the status from your dashboard.</p>
        <p><a href="{frontendUrl}/dashboard" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Contract Status</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },

  contract_cancelled: {
    subject: "Contract Cancelled - FixIt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Contract Cancelled</h2>
        <p>Hello!</p>
        <p>A work contract has been cancelled on FixIt.</p>
        <p><strong>Job:</strong> {jobTitle}</p>
        <p>Please log in to your FixIt account for more details.</p>
        <p><a href="{frontendUrl}/dashboard" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
        <p>Best regards,<br>The FixIt Team</p>
      </div>
    `,
  },
};

// Main email sending function - follows the working pattern from resetPassword.js
const sendJobProgressEmail = async (
  recipientEmail,
  emailType,
  jobTitle,
  additionalData = {}
) => {
  try {
    console.log("🔍 sendJobProgressEmail called with:", {
      recipientEmail,
      emailType,
      jobTitle,
      emailExists: !!process.env.EMAIL,
      passwordExists: !!process.env.PASSWORD,
    });

    const template = EMAIL_TEMPLATES[emailType];
    if (!template) {
      throw new Error(`Unknown email type: ${emailType}`);
    }

    const frontendUrl =
      process.env.NODE_ENV === "production"
        ? process.env.PRODUCTION_FRONTEND_URL
        : process.env.DEVELOPMENT_FRONTEND_URL;

    // Replace placeholders in HTML
    let htmlContent = template.html
      .replace(/{frontendUrl}/g, frontendUrl)
      .replace(/{jobTitle}/g, jobTitle || "FixIt Job");

    // Replace additional data placeholders
    Object.keys(additionalData).forEach((key) => {
      const placeholder = `{${key}}`;
      htmlContent = htmlContent.replace(
        new RegExp(placeholder, "g"),
        additionalData[key] || ""
      );
    });

    const mailOptions = {
      from: `"FixIt" <${process.env.EMAIL}>`,
      to: recipientEmail,
      subject: template.subject,
      html: htmlContent,
      category: "Job Progress",
    };

    console.log("🔍 Mail options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Job progress email sent:", info.response);
    return true;
  } catch (error) {
    console.error("❌ Error sending job progress email:", error.message);
    console.error("❌ Full error:", error);
    return false;
  }
};

module.exports = {
  sendJobProgressEmail,
};