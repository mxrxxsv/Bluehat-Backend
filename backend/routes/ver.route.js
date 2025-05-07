const express = require("express");
const bcrypt = require("bcryptjs");
const generateAuthenticationCode = require("../utils/generateAuthenticationCode");
const emailVerification = require("../mailer/emailVerification");
const verifyCaptcha = require("../middleware/verifyCaptcha");
const mongoose = require("mongoose");
const PendingSignup = require("../models/PendingSignup");
const Credential = require("../models/Credential");
const Client = require("../models/Client");
const Worker = require("../models/Worker");
const generateTokenandSetCookie = require("../utils/generateTokenandCookie");

const verifyToken = require("../middleware/verifyToken");
const authLimiter = require("../utils/rateLimit");
const router = express.Router();

const ALLOWED_EMAIL_DOMAINS = ["@gmail.com"];

const isPasswordStrong = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

const validatePhoneNumber = (contactNumber) =>
  /^[+]?[0-9]{10,15}$/.test(contactNumber);

const createClientProfile = async (pending, credentialId, session) => {
  try {
    const clientProfile = new Client({
      credentialId,
      lastName: pending.lastName,
      firstName: pending.firstName,
      contactNumber: pending.contactNumber,
      sex: pending.sex,
      dateOfBirth: pending.dateOfBirth,
      maritalStatus: pending.maritalStatus,
      address: {
        region: pending.address.region,
        city: pending.address.city,
        district: pending.address.district,
        street: pending.address.street,
        unit: pending.address.unit || null,
      },
      profilePicture: pending.profilePicture || null,
    });

    await clientProfile.save({ session });
  } catch (error) {
    throw new Error("Error creating client profile: " + error.message);
  }
};

const createWorkerProfile = async (pending, credentialId, session) => {
  try {
    const workerProfile = new Worker({
      credentialId,
      lastName: pending.lastName,
      firstName: pending.firstName,
      contactNumber: pending.contactNumber,
      sex: pending.sex,
      dateOfBirth: pending.dateOfBirth,
      maritalStatus: pending.maritalStatus,
      address: {
        region: pending.address.region,
        city: pending.address.city,
        district: pending.address.district,
        street: pending.address.street,
        unit: pending.address.unit || null,
      },
      profilePicture: pending.profilePicture || null,
      biography: pending.biography || "",
      workerSkills: pending.workerSkills || [],
      portfolio: pending.portfolio || [],
      experience: Array.isArray(pending.experience) ? pending.experience : [],
      certificates: pending.certificates || [],
    });

    await workerProfile.save({ session });
  } catch (error) {
    throw new Error("Error creating worker profile: " + error.message);
  }
};

router.post("/signup", authLimiter, verifyCaptcha, async (req, res) => {
  try {
    const {
      userType,
      email,
      password,
      lastName,
      firstName,
      contactNumber,
      sex,
      dateOfBirth,
      maritalStatus,
      address,
      profilePicture,
      biography,
      workerSkills,
      portfolio,
      experience,
      certificates,
    } = req.body;

    if (!["client", "worker"].includes(userType))
      throw new Error("Invalid user type.");

    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedContactNumber = contactNumber?.trim();

    if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail))
      throw new Error("Invalid email format.");

    const domain = trimmedEmail.split("@")[1];
    if (!ALLOWED_EMAIL_DOMAINS.some((d) => domain === d.replace("@", "")))
      throw new Error("Only emails from trusted providers are allowed.");

    if (!isPasswordStrong(password))
      throw new Error(
        "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character."
      );

    if (!validatePhoneNumber(trimmedContactNumber))
      throw new Error("Invalid contact number format. Must be 10-15 digits.");

    const requiredFields = ["region", "city", "district", "street"];
    for (const field of requiredFields) {
      if (!address?.[field]?.trim())
        throw new Error(`${field} in address is required.`);
    }

    const parsedDateOfBirth = new Date(dateOfBirth);
    if (!dateOfBirth || isNaN(parsedDateOfBirth))
      throw new Error("Invalid date of birth.");

    const [existingCredential, existingPending] = await Promise.all([
      Credential.findOne({ email: trimmedEmail }),
      PendingSignup.findOne({ email: trimmedEmail }),
    ]);
    if (existingCredential) throw new Error("Email already registered.");
    if (existingPending)
      throw new Error(
        "A verification process is already pending for this email."
      );

    const hashedPassword = await bcrypt.hash(password, 12);
    const authCode = generateAuthenticationCode();

    const pendingData = {
      email: trimmedEmail,
      password: hashedPassword,
      userType,
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      contactNumber: trimmedContactNumber,
      sex,
      dateOfBirth: parsedDateOfBirth,
      maritalStatus,
      address: {
        region: address.region.trim(),
        city: address.city.trim(),
        district: address.district.trim(),
        street: address.street.trim(),
        unit: address.unit?.trim() || null,
      },
      profilePicture: profilePicture?.trim() || null,
      authenticationCode: authCode,
      authenticationCodeExpiresAt: Date.now() + 10 * 60 * 1000,
    };

    if (userType === "worker") {
      Object.assign(pendingData, {
        biography: biography?.trim() || "",
        workerSkills: Array.isArray(workerSkills) ? workerSkills : [],
        portfolio: Array.isArray(portfolio) ? portfolio : [],
        experience: Array.isArray(experience) ? experience : [],
        certificates: Array.isArray(certificates) ? certificates : [],
      });
    }

    await PendingSignup.create(pendingData);

    const sent = await emailVerification(
      authCode,
      trimmedEmail,
      `${firstName} ${lastName}`
    );
    if (!sent.success)
      throw new Error(sent.reason || "Failed to send verification email.");

    res.status(200).json({
      success: true,
      message: `${userType} verification email sent successfully.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

//verify
router.post("/verify", authLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, code } = req.body;
    const trimmedEmail = email?.trim().toLowerCase();
    const pending = await PendingSignup.findOne({ email: trimmedEmail })
      .select("+password")
      .session(session);

    if (!pending) throw new Error("No pending signup found for this email.");

    if (pending.blockedUntil && pending.blockedUntil > Date.now()) {
      const secs = Math.ceil((pending.blockedUntil - Date.now()) / 1000);
      throw new Error(`Too many attempts. Try again in ${secs}s`);
    }

    if (pending.authenticationCode !== code) {
      pending.verifyAttempts = (pending.verifyAttempts || 0) + 1;

      if (pending.verifyAttempts >= 5) {
        pending.blockedUntil = Date.now() + 15 * 60 * 1000;
      }

      await pending.save({ session });
      await session.commitTransaction();
      session.endSession();

      const remaining = Math.max(0, 5 - pending.verifyAttempts);
      return res.status(400).json({
        success: false,
        message:
          remaining > 0
            ? `Invalid code. You have ${remaining} attempt(s) left.`
            : "Too many failed attempts. Try again later.",
      });
    }

    if (pending.authenticationCodeExpiresAt < Date.now())
      throw new Error("Verification code has expired.");

    const credential = new Credential({
      email: pending.email,
      password: pending.password,
      userType: pending.userType,
      isAuthenticated: true,
    });

    await credential.save({ session });

    if (pending.userType === "client") {
      await createClientProfile(pending, credential._id, session);
    } else if (pending.userType === "worker") {
      await createWorkerProfile(pending, credential._id, session);
    }

    await PendingSignup.deleteOne({ email: trimmedEmail }, { session });

    await session.commitTransaction();
    session.endSession();

    generateTokenandSetCookie(res, credential);
    return res
      .status(201)
      .json({ success: true, message: "Email verified and account created." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ success: false, message: error.message });
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
