const SibApiV3Sdk = require("sib-api-v3-sdk");
const { PASSWORD_RESET_REQUEST_TEMPLATE } = require("./mailerTemplate");

// Configure Brevo API client
const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// Verify API key on startup
console.log("✅ Brevo API configured");
console.log("📧 Sender email:", process.env.EMAIL);

const forgotPassword = async (email, userName, resetUrl) => {
  try {
    console.log(
      "📧 Attempting to send password reset email via Brevo API to:",
      email
    );
    console.log("📧 From:", process.env.EMAIL);

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: "FixIt",
      email: process.env.EMAIL,
    };
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.subject = "Reset your password";
    sendSmtpEmail.htmlContent = PASSWORD_RESET_REQUEST_TEMPLATE.replace(
      "{resetURL}",
      resetUrl
    ).replace("{userName}", userName);

    const result = await emailApi.sendTransacEmail(sendSmtpEmail);

    console.log("✅ Email sent successfully via Brevo API!");
    console.log("📧 Message ID:", result.messageId);

    return true;
  } catch (error) {
    console.error("❌ Error sending email via Brevo API:");
    console.error("Error message:", error.message);
    console.error("Error body:", error.body);
    console.error("Error response:", error.response?.text);
    return false;
  }
};

module.exports = forgotPassword;
