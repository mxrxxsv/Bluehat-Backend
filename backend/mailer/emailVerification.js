const nodemailer = require("nodemailer");
const { VERIFICATION_EMAIL_TEMPLATE } = require("./mailerTemplate");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter configuration error:", error.message);
  } else {
    console.log("✅ Email transporter is ready to send messages");
  }
});

/**
 * Sends a verification email with a code and user name.
 *
 * @param {string} pin - The verification code to send.
 * @param {string} email - The recipient's email address.
 * @param {string} userName - The recipient's full name to personalize the email.
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
const emailVerification = async (pin, email, userName) => {
  try {
    const htmlContent = VERIFICATION_EMAIL_TEMPLATE.replace(
      "{verificationCode}",
      pin
    ).replace("{verificationName}", userName);

    const mailOptions = {
      from: `"BlueHat" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify your email",
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);

    return { success: true };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);

    // Handle common bounce-back and SMTP issues
    if (
      error.responseCode === 550 ||
      (error.message && error.message.toLowerCase().includes("user unknown"))
    ) {
      return {
        success: false,
        reason: "Email address does not exist.",
      };
    }

    return {
      success: false,
      reason: "Failed to send email. Please try again later.",
    };
  }
};

module.exports = emailVerification;
