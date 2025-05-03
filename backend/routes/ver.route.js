const express = require("express");
const bcrypt = require("bcryptjs");
const generateAuthenticationCode = require("../utils/generateAuthenticationCode");
const emailVerification = require("../mailer/emailVerification");
const verifyCaptcha = require("../middleware/verifyCaptcha");

//for verify route
const PendingSignup = require("../models/PendingSignup");
const Credential = require("../models/Credential");
const Client = require("../models/Client");
const Worker = require("../models/Worker");
const generateTokenandSetCookie = require("../utils/generateTokenandCookie");

const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

router.post("/signup-try", verifyCaptcha, async (req, res) => {
  try {
    const {
      email,
      password,
      userType,
      lastName,
      firstName,
      middleName,
      contactNumber,
      profilePicture,
      address,
      workerSkills,
      portfolio,
    } = req.body;

    if (
      !email ||
      !password ||
      !userType ||
      !lastName ||
      !firstName ||
      !middleName ||
      !contactNumber
    ) {
      throw new Error("All fields are required");
    }

    if (!email.endsWith("@gmail.com")) throw new Error("Only Gmail is allowed");

    const existingEmail = await Credential.findOne({ email });
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    const existing = await PendingSignup.findOne({ email });
    if (existing)
      throw new Error("Verification already pending for this email");

    const hashedPassword = await bcrypt.hash(password, 10);
    const authCode = generateAuthenticationCode();

    await PendingSignup.create({
      email,
      password: hashedPassword,
      userType,
      lastName,
      firstName,
      middleName,
      contactNumber,
      profilePicture,
      address,
      workerSkills,
      portfolio,
      authenticationCode: authCode,
      authenticationCodeExpiresAt: Date.now() + 10 * 60 * 1000, // 10 min
    });

    const userName = `${firstName} ${lastName}`;
    const sent = await emailVerification(authCode, email, userName);

    if (!sent.success) {
      return res
        .status(400)
        .json({ success: false, message: "Email not sent" });
    }

    res.status(200).json({ success: true, message: "Verification email sent" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  try {
    const pending = await PendingSignup.findOne({ email }).select("+password");

    if (!pending) {
      return res
        .status(400)
        .json({ success: false, message: "No pending signup found" });
    }

    // 1) Check if temporarily blocked due to too many failed attempts
    if (pending.blockedUntil && pending.blockedUntil > Date.now()) {
      const secs = Math.ceil((pending.blockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many attempts. Try again in ${secs}s`,
      });
    }

    // 2) Check if the code is correct
    if (pending.authenticationCode !== code) {
      pending.verifyAttempts += 1;

      // Block after 5 failed attempts
      if (pending.verifyAttempts >= 5) {
        pending.blockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes block
        await pending.save();
        return res.status(429).json({
          success: false,
          message: "Too many failed attempts. Please wait 15 minutes.",
        });
      }

      await pending.save();
      return res.status(400).json({
        success: false,
        message: `Invalid code. You have ${
          5 - pending.verifyAttempts
        } tries left.`,
      });
    }

    // 3) Check if the code has expired
    if (pending.authenticationCodeExpiresAt < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Verification code expired" });
    }

    // 4) Create the credential
    const credential = new Credential({
      email: pending.email,
      password: pending.password, // already hashed
      userType: pending.userType,
      isAuthenticated: true,
    });
    await credential.save();

    // 5) Create Client or Worker profile based on user type
    if (pending.userType === "client") {
      const client = new Client({
        credentialId: credential._id,
        lastName: pending.lastName,
        firstName: pending.firstName,
        middleName: pending.middleName,
        contactNumber: pending.contactNumber,
        profilePicture: pending.profilePicture,
        address: pending.address,
      });
      await client.save();
    } else if (pending.userType === "worker") {
      const worker = new Worker({
        credentialId: credential._id,
        lastName: pending.lastName,
        firstName: pending.firstName,
        middleName: pending.middleName,
        contactNumber: pending.contactNumber,
        profilePicture: pending.profilePicture,
        workerSkills: pending.workerSkills,
        portfolio: pending.portfolio,
      });
      await worker.save();
    }

    // 6) Clean up the pending signup entry
    await PendingSignup.deleteOne({ email });

    // 7) Optionally generate and set a token in cookie (e.g. for authenticated sessions)
    generateTokenandSetCookie(res, credential);

    res
      .status(201)
      .json({ success: true, message: "Email verified and account created!" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/resend-code", verifyCaptcha, async (req, res) => {
  const { email } = req.body;

  const pending = await PendingSignup.findOne({ email });
  if (!pending) {
    return res
      .status(400)
      .json({ success: false, message: "No pending signup for this email" });
  }

  // Optionally throttle resends: e.g. allow 1 resend per 5 minutes
  if (
    pending.lastResendAt &&
    Date.now() - pending.lastResendAt < 5 * 60 * 1000
  ) {
    const wait = Math.ceil(
      (5 * 60 * 1000 - (Date.now() - pending.lastResendAt)) / 1000
    );
    return res.status(429).json({
      success: false,
      message: `Please wait ${wait}s before requesting another code.`,
    });
  }

  // Generate and save new code
  const newCode = generateAuthenticationCode();
  pending.authenticationCode = newCode;
  pending.authenticationCodeExpiresAt = Date.now() + 10 * 60 * 1000;
  pending.verifyAttempts = 0; // reset attempts
  pending.blockedUntil = undefined; // clear block
  pending.lastResendAt = Date.now();
  await pending.save();

  // Send email
  const sent = await emailVerification(
    newCode,
    email,
    `${pending.firstName} ${pending.lastName}`
  );
  if (!sent.success) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to send code" });
  }

  res.json({ success: true, message: "New verification code sent" });
});

router.post("/login-try", verifyCaptcha, async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const user = await Credential.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User does not exist" });
    }

    const isCorrectPassword = await bcrypt.compare(password, user.password);
    if (!isCorrectPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Wrong password" });
    }

    // Generate JWT and set it as cookie
    generateTokenandSetCookie(res, user._id);

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({ success: true, message: "Login successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/check-auth-try", verifyToken, async (req, res) => {
  try {
    const credential = await Credential.findById(req.user).select("-password");

    if (!credential) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: credential,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/logout-try", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({ success: true, message: "Logged out successfully" });
});
module.exports = router;
