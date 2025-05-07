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

const multer = require("multer");
const cloudinary = require("../db/cloudinary");
const fs = require("fs");

const ALLOWED_EMAIL_DOMAINS = ["@gmail.com"];

const isPasswordStrong = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

const validatePhoneNumber = (contactNumber) =>
  /^[+]?[0-9]{10,15}$/.test(contactNumber);

const safeParseArray = (input) => {
  if (Array.isArray(input)) return input;
  try {
    return JSON.parse(input);
  } catch {
    return [];
  }
};

const createClientProfile = async (pending, credentialId, session) => {
  try {
    const clientProfile = new Client({
      credentialId,
      firstName: pending.firstName,
      lastName: pending.lastName,
      contactNumber: pending.contactNumber,
      sex: pending.sex,
      dateOfBirth: pending.dateOfBirth,
      maritalStatus: pending.maritalStatus,
      address: {
        region: pending.address?.region || "",
        city: pending.address?.city || "",
        district: pending.address?.district || "",
        street: pending.address?.street || "",
        unit: pending.address?.unit || null,
      },
      profilePicture: pending.profilePicture || null,
    });

    await clientProfile.save({ session });
  } catch (error) {
    throw new Error("Error creating client profile in DB: " + error.message);
  }
};

const createWorkerProfile = async (pending, credentialId, session) => {
  try {
    const workerProfile = new Worker({
      credentialId,
      firstName: pending.firstName,
      lastName: pending.lastName,
      contactNumber: pending.contactNumber,
      sex: pending.sex,
      dateOfBirth: pending.dateOfBirth,
      maritalStatus: pending.maritalStatus,
      address: {
        region: pending.address?.region || "",
        city: pending.address?.city || "",
        district: pending.address?.district || "",
        street: pending.address?.street || "",
        unit: pending.address?.unit || null,
      },
      profilePicture: pending.profilePicture || null,
      biography: pending.biography || "",
      workerSkills: pending.workerSkills || [],
      experience: Array.isArray(pending.experience) ? pending.experience : [],
      portfolio: Array.isArray(pending.portfolio) ? pending.portfolio : [],
      certificates: Array.isArray(pending.certificates)
        ? pending.certificates
        : [],
      current_status: "available",
      current_job_id: null,
    });

    await workerProfile.save({ session });
  } catch (error) {
    throw new Error("Error creating worker profile in DB: " + error.message);
  }
};

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const multiUpload = upload.fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "portfolio", maxCount: 10 },
  { name: "certificates", maxCount: 10 },
]);

router.post(
  "/signup",
  authLimiter,
  verifyCaptcha,
  multiUpload,
  async (req, res) => {
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
        biography,
        workerSkills,
        experience,
      } = req.body;

      // Sanitize inputs
      const trimmedEmail = email?.trim().toLowerCase();
      const trimmedContactNumber = contactNumber?.trim();
      const safeFirstName = firstName?.trim();
      const safeLastName = lastName?.trim();

      if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
        throw new Error("Invalid email format.");
      }

      const emailDomain = trimmedEmail.split("@")[1]?.toLowerCase();
      if (!ALLOWED_EMAIL_DOMAINS.includes(`@${emailDomain}`)) {
        throw new Error("Only emails from trusted providers are allowed.");
      }

      if (!isPasswordStrong(password)) {
        throw new Error(
          "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character."
        );
      }

      if (!validatePhoneNumber(trimmedContactNumber)) {
        throw new Error("Invalid contact number format. Must be 10-15 digits.");
      }

      const requiredFields = ["region", "city", "district", "street"];
      for (const field of requiredFields) {
        if (!address?.[field]?.trim())
          throw new Error(`${field} in address is required.`);
      }

      const parsedDateOfBirth = new Date(dateOfBirth);
      if (!dateOfBirth || isNaN(parsedDateOfBirth)) {
        throw new Error("Invalid date of birth.");
      }

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
      const authCode = Math.floor(100000 + Math.random() * 900000).toString(); // simple code
      const files = req.files || {};

      // Handle profile picture upload
      let profileResult = null;
      const profilePicFile = files["profilePicture"]?.[0];
      if (profilePicFile) {
        profileResult = await cloudinary.uploader.upload(profilePicFile.path, {
          folder: "profile_pictures",
        });
        await fs.promises.unlink(profilePicFile.path);
      }

      // Handle portfolio upload
      const portfolioResults = [];
      if (files["portfolio"]) {
        for (const file of files["portfolio"]) {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: "portfolio",
            });
            portfolioResults.push({
              url: result.secure_url,
              public_id: result.public_id,
            });
          } catch (err) {
            console.error("Portfolio upload failed:", err);
          } finally {
            await fs.promises.unlink(file.path);
          }
        }
      }

      // Handle certificate upload
      const certificateResults = [];
      if (files["certificates"]) {
        for (const file of files["certificates"]) {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: "certificates",
            });
            certificateResults.push({
              url: result.secure_url,
              public_id: result.public_id,
            });
          } catch (err) {
            console.error("Certificates upload failed:", err);
          } finally {
            await fs.promises.unlink(file.path);
          }
        }
      }

      if (!["client", "worker"].includes(userType)) {
        throw new Error("Invalid user type.");
      }

      const pendingData = {
        email: trimmedEmail,
        password: hashedPassword,
        userType,
        firstName: safeFirstName,
        lastName: safeLastName,
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
        profilePicture: profileResult
          ? {
              url: profileResult.secure_url,
              public_id: profileResult.public_id,
            }
          : null,
        authenticationCode: authCode,
        authenticationCodeExpiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
      };

      if (userType === "worker") {
        Object.assign(pendingData, {
          biography: biography?.trim() || "",
          workerSkills: safeParseArray(workerSkills),
          experience: safeParseArray(experience),
          portfolio: portfolioResults,
          certificates: certificateResults,
        });
      }

      await PendingSignup.create(pendingData);

      const sent = await emailVerification(
        authCode,
        trimmedEmail,
        `${safeFirstName} ${safeLastName}`
      );

      if (!sent.success) {
        throw new Error(sent.reason || "Failed to send verification email.");
      }

      res.status(200).json({
        success: true,
        message: `${userType} verification email sent successfully.`,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

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
router.post("/login", authLimiter, verifyCaptcha, async (req, res) => {
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
router.get("/check-auth", verifyToken, async (req, res) => {
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
          .json({ success: false, message: "User not found" });
      }
    } else if (credential.userType === "worker") {
      user = await Worker.findOne({ credentialId: userId });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
    }

    credential.lastLogin = new Date();
    await credential.save();
    res.status(200).json({
      success: true,
      data: {
        id: credential._id,
        name: user ? `${user.firstName} ${user.lastName}` : null,
        userType: credential.userType,
        isAuthenticated: credential.isAuthenticated,
        isVerified: credential.isVerified,
      },
    });
  } catch (err) {
    console.error("Error in /check-auth-try:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
