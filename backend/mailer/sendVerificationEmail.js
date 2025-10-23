const nodemailer = require("nodemailer");
const { VERIFY_EMAIL_TEMPLATE } = require("./mailerTemplate");

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

const sendVerificationEmail = async (email, verifyUrl) => {
  try {
    const transporter = createTransporter();
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error("❌ SMTP verify failed (verification email):", verifyErr.message);
    }
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
