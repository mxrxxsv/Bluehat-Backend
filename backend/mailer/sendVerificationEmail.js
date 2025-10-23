const nodemailer = require("nodemailer");
const { VERIFY_EMAIL_TEMPLATE } = require("./mailerTemplate");

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
  // Prefer STARTTLS 587 first (commonly allowed), then SMTPS 465
  const attempts = [
    { port: 587, secure: false, label: "starttls:587", extra: { requireTLS: true, tls: { minVersion: "TLSv1.2" } } },
    { port: 465, secure: true, label: "smtps:465", extra: {} },
  ];
  for (const opt of attempts) {
    try {
      console.log("🔌 Trying SMTP verify using", opt.label);
      const t = createTransporter(opt.port, opt.secure, opt.extra);
      await t.verify();
      console.log("✅ SMTP verify passed (verification email) using", opt.label);
      return t;
    } catch (e) {
      console.error("❌ SMTP verify failed (verification email) using", opt.label, e.message);
    }
  }
  console.error("❌ All SMTP attempts failed. Hosting may block outbound SMTP. Consider an email API (SendGrid/Resend/Mailgun).");
  // Fallback to default without verify (may still fail if blocked)
  return createTransporter(587, false, { requireTLS: true });
};

const sendVerificationEmail = async (email, verifyUrl) => {
  try {
    const transporter = await getVerifiedTransporter();
    let mailOptions = {
      from: `"FixIt" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify Your Email",
      html: VERIFY_EMAIL_TEMPLATE.replace("{verifyURL}", verifyUrl),
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

module.exports = sendVerificationEmail;
