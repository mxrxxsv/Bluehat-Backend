const nodemailer = require("nodemailer");
const { VERIFICATION_EMAIL_TEMPLATE } = require("./mailerTemplate");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const emailVerification = async (pin, email, userName) => {
  try {
    const mailOptions = {
      from: `"BlueHat" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify your email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace(
        "{verificationCode}",
        pin
      ).replace("{verificationName}", userName),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);

    // Detect invalid recipient errors (bounce-backs)
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
      reason: "Failed to send email. Try again later.",
    };
  }
};

module.exports = emailVerification;
