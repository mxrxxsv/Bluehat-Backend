const express = require("express");
const bcrypt = require("bcryptjs");
const generateAuthenticationCode = require("../utils/generateAuthenticationCode");
const emailVerification = require("../mailer/emailVerification");
const verifyCaptcha = require("../middleware/verifyCaptcha");

const PendingSignup = require("../models/PendingSignup");
const Credential = require("../models/Credential");
const Client = require("../models/Client");
const Worker = require("../models/Worker");
const generateTokenandSetCookie = require("../utils/generateTokenandCookie");

const verifyToken = require("../middleware/verifyToken");
const authLimiter = require("../utils/rateLimit");

const router = express.Router();

const ALLOWED_EMAIL_DOMAINS = ["@gmail.com", "@yahoo.com", "@outlook.com"];

const isPasswordStrong = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

const createClientProfile = async (pending, credentialId) => {
  const client = new Client({
    credentialId,
    lastName: pending.lastName,
    firstName: pending.firstName,
    middleName: pending.middleName,
    contactNumber: pending.contactNumber,
    profilePicture: pending.profilePicture,
    address: pending.address,
  });
  await client.save();
};

const createWorkerProfile = async (pending, credentialId) => {
  const worker = new Worker({
    credentialId,
    lastName: pending.lastName,
    firstName: pending.firstName,
    middleName: pending.middleName,
    contactNumber: pending.contactNumber,
    profilePicture: pending.profilePicture,
    workerSkills: pending.workerSkills,
    portfolio: pending.portfolio,
    address: pending.address,
  });
  await worker.save();
};

// Signup try
router.post("/signup-try", authLimiter, verifyCaptcha, async (req, res) => {
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

    // 1) Basic required fields
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

    // 2) Domain check
    const validDomain = ALLOWED_EMAIL_DOMAINS.some((d) => email.endsWith(d));
    if (!validDomain) {
      throw new Error("Only emails from trusted providers are allowed");
    }

    // 3) Password strength
    if (!isPasswordStrong(password)) {
      throw new Error(
        "Password must be at least 8 characters and include upper, lower, number & special char"
      );
    }

    // 4) Prevent duplicates
    if (await Credential.findOne({ email })) {
      throw new Error("Email already exists");
    }
    if (await PendingSignup.findOne({ email })) {
      throw new Error("Verification already pending for this email");
    }

    // 5) Worker‐specific shape checks
    if (userType === "worker") {
      // address must be array of {region, city, district, street, unit?}
      if (
        !Array.isArray(address) ||
        address.some((a) => !a.region || !a.city || !a.district || !a.street)
      ) {
        throw new Error(
          "Worker address must be an array of objects with region, city, district, and street"
        );
      }

      // workerSkills must be array of { skillCategory:ObjectId, skills:[String] }
      if (
        !Array.isArray(workerSkills) ||
        workerSkills.some(
          (ws) =>
            !ws.skillCategory ||
            !Array.isArray(ws.skills) ||
            ws.skills.length === 0
        )
      ) {
        throw new Error(
          "workerSkills must be [{ skillCategory: ObjectId, skills: [String] }]"
        );
      }

      // portfolio must be array of { projectLink:String, … }
      if (!Array.isArray(portfolio) || portfolio.some((p) => !p.projectLink)) {
        throw new Error(
          "portfolio must be an array of objects each with a projectLink URL"
        );
      }
    }

    // 6) Everything looks good—hash & store pending
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
      authenticationCodeExpiresAt: Date.now() + 10 * 60 * 1000,
    });

    // 7) Send verification email
    const userName = `${firstName} ${lastName}`;
    let sent;
    try {
      sent = await emailVerification(authCode, email, userName);
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: "Email failed", error: err.message });
    }
    if (!sent.success) {
      return res
        .status(400)
        .json({ success: false, message: sent.reason || "Email not sent" });
    }

    // 8) Done
    res.status(200).json({ success: true, message: "Verification email sent" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Verify code
router.post("/verify", authLimiter, async (req, res) => {
  const { email, code } = req.body;

  try {
    const pending = await PendingSignup.findOne({ email }).select("+password");

    if (!pending) {
      return res
        .status(400)
        .json({ success: false, message: "No pending signup found" });
    }

    if (pending.blockedUntil && pending.blockedUntil > Date.now()) {
      const secs = Math.ceil((pending.blockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many attempts. Try again in ${secs}s`,
      });
    }

    if (pending.authenticationCode !== code) {
      pending.verifyAttempts += 1;

      if (pending.verifyAttempts >= 5) {
        pending.blockedUntil = Date.now() + 15 * 60 * 1000;
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

    if (pending.authenticationCodeExpiresAt < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Verification code expired" });
    }

    const credential = new Credential({
      email: pending.email,
      password: pending.password,
      userType: pending.userType,
      isAuthenticated: true,
    });
    await credential.save();

    if (pending.userType === "client") {
      await createClientProfile(pending, credential._id);
    } else if (pending.userType === "worker") {
      await createWorkerProfile(pending, credential._id);
    }

    await PendingSignup.deleteOne({ email });

    generateTokenandSetCookie(res, credential);
    res
      .status(201)
      .json({ success: true, message: "Email verified and account created!" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Resend code
router.post("/resend-code", verifyCaptcha, async (req, res) => {
  const { email } = req.body;

  const pending = await PendingSignup.findOne({ email });
  if (!pending) {
    return res
      .status(400)
      .json({ success: false, message: "No pending signup for this email" });
  }

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

  const newCode = generateAuthenticationCode();

  pending.authenticationCode = newCode;
  pending.authenticationCodeExpiresAt = Date.now() + 10 * 60 * 1000;
  pending.verifyAttempts = 0;
  pending.blockedUntil = undefined;
  pending.lastResendAt = Date.now();
  await pending.save();

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

// Login
router.post("/login-try", authLimiter, verifyCaptcha, async (req, res) => {
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

    generateTokenandSetCookie(res, user._id);
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({ success: true, message: "Login successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Check auth
router.get("/check-auth-try", verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Fetch credentials without password
    const credential = await Credential.findById(userId).select("-password");
    if (!credential) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let user;

    if (credential.userType === "client") {
      user = await Client.findOne({ credentialId: userId });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Client not found" });
      }
    } else if (credential.userType === "worker") {
      user = await Worker.findOne({ credentialId: userId });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Worker not found" });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: credential._id,
        name: user ? `${user.firstName} ${user.lastName}` : null,
        email: credential.email,
        userType: credential.userType,
        isAuthenticated: credential.isAuthenticated,
        isVerified: credential.isVerified,
        lastLogin: credential.lastLogin,
      },
    });
  } catch (err) {
    console.error("Error in /check-auth-try:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Logout
router.post("/logout-try", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
