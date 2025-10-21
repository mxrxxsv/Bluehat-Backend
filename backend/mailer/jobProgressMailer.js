const nodemailer = require("nodemailer");
const jobProgressEmailTemplate = require("./jobProgressTemplate");
const logger = require("../utils/logger");

// Create transporter (configure with your email service)
const createTransporter = () => {
  console.log("Creating transporter with:", {
    email: process.env.EMAIL,
    passwordSet: !!process.env.PASSWORD,
  });

  return nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
    debug: true,
    logger: true,
  });
};

// Send job progress email function
const sendJobProgressEmail = async (emailData) => {
  try {
    const {
      type,
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
      jobDescription,
      proposedRate,
      message,
      jobUrl,
      dashboardUrl,
      rating,
      feedback,
    } = emailData;

    // Validate required fields
    if (!type || !recipientEmail || !recipientName) {
      throw new Error(
        "Missing required email fields: type, recipientEmail, recipientName"
      );
    }

    // Generate email content using template
    const emailTemplate = jobProgressEmailTemplate({
      type,
      recipientName,
      senderName,
      jobTitle,
      jobDescription,
      proposedRate,
      message,
      jobUrl: jobUrl || `${process.env.FRONTEND_URL}/find-work`,
      dashboardUrl: dashboardUrl || `${process.env.FRONTEND_URL}/find-work`,
      rating,
      feedback,
    });

    console.log("Sending email with data:", {
      type,
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
    });

    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: "FixIt Platform",
        address: process.env.EMAIL,
      },
      to: recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    };

    console.log("Mail options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const result = await transporter.sendMail(mailOptions);

    logger.info("Job progress email sent successfully", {
      type,
      recipientEmail,
      recipientName,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId: result.messageId,
      type,
    };
  } catch (error) {
    logger.error("Failed to send job progress email", {
      error: error.message,
      stack: error.stack,
      emailData: {
        ...emailData,
        recipientEmail: emailData.recipientEmail ? "[HIDDEN]" : undefined,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: error.message,
      type: emailData.type,
    };
  }
};

// Convenient wrapper functions for different email types
const emailHelpers = {
  // Worker invitation emails
  sendWorkerInvitation: (
    recipientEmail,
    recipientName,
    senderName,
    jobTitle,
    jobDescription,
    proposedRate,
    message,
    jobUrl
  ) => {
    return sendJobProgressEmail({
      type: "worker_invitation",
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
      jobDescription,
      proposedRate,
      message,
      jobUrl,
    });
  },

  // Job application emails
  sendApplicationSubmitted: (
    recipientEmail,
    recipientName,
    senderName,
    jobTitle,
    proposedRate,
    message
  ) => {
    return sendJobProgressEmail({
      type: "application_submitted",
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
      proposedRate,
      message,
    });
  },

  sendApplicationAccepted: (
    recipientEmail,
    recipientName,
    senderName,
    jobTitle,
    jobUrl
  ) => {
    return sendJobProgressEmail({
      type: "application_accepted",
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
      jobUrl,
    });
  },

  sendApplicationRejected: (recipientEmail, recipientName, jobTitle) => {
    return sendJobProgressEmail({
      type: "application_rejected",
      recipientEmail,
      recipientName,
      jobTitle,
    });
  },

  // Agreement emails
  sendClientAgreement: (
    recipientEmail,
    recipientName,
    senderName,
    jobTitle,
    jobUrl
  ) => {
    return sendJobProgressEmail({
      type: "client_agreement",
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
      jobUrl,
    });
  },

  sendWorkerAgreement: (
    recipientEmail,
    recipientName,
    senderName,
    jobTitle,
    jobUrl
  ) => {
    return sendJobProgressEmail({
      type: "worker_agreement",
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
      jobUrl,
    });
  },

  // Job completion emails
  sendJobCompleted: (
    recipientEmail,
    recipientName,
    senderName,
    jobTitle,
    jobUrl
  ) => {
    return sendJobProgressEmail({
      type: "job_completed",
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
      jobUrl,
    });
  },

  // Contract cancellation emails
  sendContractCancelled: (
    recipientEmail,
    recipientName,
    jobTitle,
    dashboardUrl
  ) => {
    return sendJobProgressEmail({
      type: "contract_cancelled",
      recipientEmail,
      recipientName,
      jobTitle,
      dashboardUrl,
    });
  },

  // Job reopened emails (for clients when contract is cancelled)
  sendJobReopened: (recipientEmail, recipientName, jobTitle, jobUrl) => {
    return sendJobProgressEmail({
      type: "job_reopened",
      recipientEmail,
      recipientName,
      jobTitle,
      jobUrl,
    });
  },

  // Discussion emails
  sendDiscussionStarted: (
    recipientEmail,
    recipientName,
    senderName,
    jobTitle,
    jobUrl
  ) => {
    return sendJobProgressEmail({
      type: "discussion_started",
      recipientEmail,
      recipientName,
      senderName,
      jobTitle,
      jobUrl,
    });
  },
};

// Test function for email delivery
const testEmailDelivery = async (testEmail = "test@example.com") => {
  try {
    console.log("Testing email delivery...");

    const result = await sendJobProgressEmail({
      type: "worker_invitation",
      recipientEmail: testEmail,
      recipientName: "Test User",
      senderName: "Test Client",
      jobTitle: "Test Job",
      jobDescription: "This is a test job",
      proposedRate: 100,
      message: "Test message",
    });

    console.log("Test email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Test email failed:", error);
    throw error;
  }
};

module.exports = {
  sendJobProgressEmail,
  testEmailDelivery,
  ...emailHelpers,
};
