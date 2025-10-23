const nodemailer = require("nodemailer");
const { PASSWORD_RESET_REQUEST_TEMPLATE } = require("./mailerTemplate");
const { sendEmailViaApi } = require("./mailerProvider");

const createTransporter = (port = 587, secure = false, extra = {}) => {
  const user = process.env.EMAIL;
  const pass = process.env.PASSWORD;
  if (!user || !pass) {
    console.error("❌ EMAIL/PASSWORD env vars missing for mailer. EMAIL set:", !!user, " PASSWORD set:", !!pass);
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,
    secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: { user, pass },
    ...extra,
  });
};

const getVerifiedTransporter = async () => {
  const attempts = [
    { port: 587, secure: false, label: "starttls:587", extra: { requireTLS: true, tls: { minVersion: "TLSv1.2" } } },
    { port: 465, secure: true, label: "smtps:465", extra: {} },
  ];
  for (const opt of attempts) {
    try {
      console.log("🔌 Trying SMTP verify using", opt.label);
      const t = createTransporter(opt.port, opt.secure, opt.extra);
      await t.verify();
      console.log("✅ SMTP verify passed (reset password) using", opt.label);
      return t;
    } catch (e) {
      console.error("❌ SMTP verify failed (reset password) using", opt.label, e.message);
    }
  }
  console.error("❌ All SMTP attempts failed. Hosting may block outbound SMTP. Consider an email API (SendGrid/Resend/Mailgun).");
  return createTransporter(587, false, { requireTLS: true });
};

const forgotPassword = async (email, userName, resetUrl) => {
  try {
    const html = PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetUrl).replace("{userName}", userName);
    // Try API first
    const api = await sendEmailViaApi({ to: email, subject: "Reset your password", html });
    if (api.ok) {
      console.log("✅ Reset email sent via API provider");
      return true;
    }

    // Fallback to SMTP
    const transporter = await getVerifiedTransporter();
    const info = await transporter.sendMail({
      from: `"FixIt" <${process.env.EMAIL}>`,
      to: email,
      subject: "Reset your password",
      html,
      category: "Email Verification",
    });
    console.log("✅ Email sent via SMTP:", info.response);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return false;
  }
};

module.exports = forgotPassword;
