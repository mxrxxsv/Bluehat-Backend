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
    let mailOptions = {
      from: `"BlueHat" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify your email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace(
        "{verificationCode}",
        pin
      ).replace("{verificationName}", userName),
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

module.exports = emailVerification;
