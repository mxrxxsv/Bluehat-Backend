const jobProgressEmailTemplate = (data) => {
  const {
    type,
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
  } = data;

  // Common header and footer
  const header = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">BlueHat Platform</h1>
        <p style="color: #e8f2ff; margin: 10px 0 0 0; font-size: 16px;">Professional Work Platform</p>
      </div>
      <div style="padding: 40px 30px;">
  `;

  const footer = `
      </div>
      <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
        <p style="margin: 0; color: #6c757d; font-size: 14px;">
          <a href="${dashboardUrl}" style="color: #667eea; text-decoration: none; font-weight: 500;">Visit Your Dashboard</a> | 
          <a href="mailto:support@bluehat.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
        </p>
        <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 12px;">
          © ${new Date().getFullYear()} BlueHat Platform. All rights reserved.
        </p>
      </div>
    </div>
  `;

  // Template variations based on type
  const templates = {
    // Worker Invitation Templates
    worker_invitation: {
      subject: `🎯 New Job Invitation: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1976d2; margin: 0 0 10px 0; font-size: 24px;">You've Been Invited to a Job! 🎉</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">Great news! A client wants to work with you.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          <strong>${senderName}</strong> has invited you to work on an exciting project:
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">${jobTitle}</h3>
          <p style="margin: 0 0 15px 0; color: #555; line-height: 1.6;">${jobDescription}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <span style="color: #667eea; font-weight: 600; font-size: 18px;">💰 Proposed Rate: $${proposedRate}</span>
          </div>
          ${
            message
              ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #555; font-style: italic;">"${message}"</p>
          </div>`
              : ""
          }
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            View Invitation Details →
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6c757d; text-align: center; margin-top: 30px;">
          This invitation will expire in 7 days. Don't miss out on this opportunity!
        </p>
        ${footer}`,
    },

    // Job Application Templates
    application_submitted: {
      subject: `✅ Application Submitted: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 24px;">Application Submitted Successfully! ✅</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">Your application is now being reviewed.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your application for <strong>${jobTitle}</strong> has been successfully submitted to <strong>${senderName}</strong>.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Application Details</h3>
          <p style="margin: 0 0 10px 0; color: #555;"><strong>Proposed Rate:</strong> $${proposedRate}</p>
          <p style="margin: 0 0 15px 0; color: #555;"><strong>Your Message:</strong></p>
          <p style="margin: 0; color: #555; font-style: italic; padding: 10px; background-color: #f1f3f4; border-radius: 4px;">"${message}"</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          We'll notify you as soon as the client responds to your application.
        </p>
        ${footer}`,
    },

    application_accepted: {
      subject: `🎉 Application Accepted: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 24px;">Congratulations! Application Accepted! 🎉</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">You got the job! Time to start working.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Great news! <strong>${senderName}</strong> has accepted your application for <strong>${jobTitle}</strong>.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
            Start Working →
          </a>
        </div>
        ${footer}`,
    },

    application_rejected: {
      subject: `📋 Application Update: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #f57c00; margin: 0 0 10px 0; font-size: 24px;">Application Update</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">Thank you for your interest in this position.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Thank you for applying to <strong>${jobTitle}</strong>. After careful consideration, the client has decided to move forward with another candidate.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Don't be discouraged! There are many other opportunities available on our platform.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            Find More Jobs →
          </a>
        </div>
        ${footer}`,
    },

    // Invitation Response Templates
    invitation_accepted: {
      subject: `🎉 Invitation Accepted: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 24px;">Great News! Invitation Accepted! 🎉</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">Your invitation was accepted. Time to start working!</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Excellent news! <strong>${senderName}</strong> has accepted your invitation for <strong>${jobTitle}</strong>.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
            Manage Project →
          </a>
        </div>
        ${footer}`,
    },

    invitation_rejected: {
      subject: `📋 Invitation Update: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #f57c00; margin: 0 0 10px 0; font-size: 24px;">Invitation Update</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">The worker has declined your invitation.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          <strong>${senderName}</strong> has declined your invitation for <strong>${jobTitle}</strong>. Don't worry - there are many other qualified workers available!
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          You can browse our worker directory and send invitations to other professionals who match your requirements.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            Find More Workers →
          </a>
        </div>
        ${footer}`,
    },

    // Agreement Templates
    client_agreement: {
      subject: `✅ Client Approved: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1976d2; margin: 0 0 10px 0; font-size: 24px;">Client Has Approved! ✅</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">Waiting for your confirmation to start the project.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          <strong>${senderName}</strong> has approved the terms for <strong>${jobTitle}</strong>. Please confirm your agreement to start working.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            Confirm Agreement →
          </a>
        </div>
        ${footer}`,
    },

    worker_agreement: {
      subject: `✅ Worker Approved: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1976d2; margin: 0 0 10px 0; font-size: 24px;">Worker Has Approved! ✅</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">Waiting for your confirmation to start the project.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          <strong>${senderName}</strong> has approved the terms for <strong>${jobTitle}</strong>. Please confirm your agreement to start working.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            Confirm Agreement →
          </a>
        </div>
        ${footer}`,
    },

    // Job Completion Templates
    job_completed: {
      subject: `✅ Job Completed: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 24px;">Job Completed Successfully! 🎉</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">The work has been marked as completed.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          The job <strong>${jobTitle}</strong> has been successfully completed by <strong>${senderName}</strong>.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Please review the work and provide your feedback when you're ready.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
            Review & Rate Work →
          </a>
        </div>
        ${footer}`,
    },

    // Contract Cancelled Templates
    contract_cancelled: {
      subject: `📋 Contract Cancelled: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #f57c00; margin: 0 0 10px 0; font-size: 24px;">Contract Cancelled</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">The work contract has been cancelled.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          The contract for <strong>${jobTitle}</strong> has been cancelled. The job post is now open again for new applications and invitations.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            View Dashboard →
          </a>
        </div>
        ${footer}`,
    },

    // Job Reopened Templates (for clients when contract is cancelled)
    job_reopened: {
      subject: `🔄 Job Post Reopened: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1976d2; margin: 0 0 10px 0; font-size: 24px;">Your Job Post is Open Again! 🔄</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">Ready to receive new applications and send invitations.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your job post <strong>${jobTitle}</strong> is now open again and ready to receive new worker applications. You can also send invitations to workers you'd like to hire.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            Manage Your Job Post →
          </a>
        </div>
        ${footer}`,
    },

    // Discussion Started Templates
    discussion_started: {
      subject: `💬 Discussion Started: ${jobTitle}`,
      html: `${header}
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1976d2; margin: 0 0 10px 0; font-size: 24px;">Discussion Started! 💬</h2>
          <p style="color: #424242; margin: 0; font-size: 16px;">Let's discuss the project details.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">Hi <strong>${recipientName}</strong>,</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          <strong>${senderName}</strong> has started a discussion about <strong>${jobTitle}</strong>. This is a great opportunity to clarify project details and agree on terms.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            Join Discussion →
          </a>
        </div>
        ${footer}`,
    },
  };

  return (
    templates[type] || {
      subject: "BlueHat Platform Notification",
      html: `${header}<p>You have a new notification from BlueHat Platform.</p>${footer}`,
    }
  );
};

module.exports = jobProgressEmailTemplate;
