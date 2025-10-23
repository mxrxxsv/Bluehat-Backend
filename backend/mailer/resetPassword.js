const nodemailer = require("nodemailer");
const { PASSWORD_RESET_REQUEST_TEMPLATE } = require("./mailerTemplate");

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
    const transporter = await getVerifiedTransporter();
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
