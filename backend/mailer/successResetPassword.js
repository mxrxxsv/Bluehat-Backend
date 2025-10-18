const nodemailer = require("nodemailer");
const { PASSWORD_RESET_SUCCESS_TEMPLATE } = require("./mailerTemplate");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});
const successResetPassword = async (email, userName) => {
  try {
    let mailOptions = {
      from: `"FixIt" <${process.env.EMAIL}>`,
      to: email,
      subject: "Reset your password",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE.replace("{userName}", userName),
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

module.exports = successResetPassword;
