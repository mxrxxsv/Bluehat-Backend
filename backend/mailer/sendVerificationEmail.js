const nodemailer = require("nodemailer");
const { VERIFY_EMAIL_TEMPLATE } = require("./mailerTemplate");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const sendVerificationEmail = async (email, verifyUrl) => {
  try {
    let mailOptions = {
      from: `"FixIT" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify Your Email",
      html: VERIFY_EMAIL_TEMPLATE.replace("{verifyURL}", verifyUrl),
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
