const nodemailer = require("nodemailer");
const { PASSWORD_RESET_REQUEST_TEMPLATE } = require("./mailerTemplate");

const createTransporter = () => {
  const user = process.env.EMAIL;
  const pass = process.env.PASSWORD;
  if (!user || !pass) {
    console.error("❌ EMAIL/PASSWORD env vars missing for mailer. EMAIL set:", !!user, " PASSWORD set:", !!pass);
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
};
const forgotPassword = async (email, userName, resetUrl) => {
  try {
    const transporter = createTransporter();
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error("❌ SMTP verify failed (reset password):", verifyErr.message);
    }
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
