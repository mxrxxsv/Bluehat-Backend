const nodemailer = require("nodemailer");
const { PASSWORD_RESET_REQUEST_TEMPLATE } = require("./mailerTemplate");

const transporter = nodemailer.createTransport({
  // service: "gmail",/
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});
const forgotPassword = async (email, userName, resetUrl) => {
  try {
    let mailOptions = {
      from: `"FixIt" <${process.env.EMAIL}>`,
      to: email,
      subject: "Reset your password",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace(
        "{resetURL}",
        resetUrl
      ).replace("{userName}", userName),
      category: "Email Verification",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return false;
  }
};

module.exports = forgotPassword;
