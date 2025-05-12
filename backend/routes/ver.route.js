const express = require("express");
const bcrypt = require("bcryptjs");
const generateAuthenticationCode = require("../utils/generateAuthenticationCode");
const emailVerification = require("../mailer/emailVerification");
const verifyCaptcha = require("../middleware/verifyCaptcha");
const mongoose = require("mongoose");
const mongoSanitize = require("mongo-sanitize");
const validator = require("validator");
const escape = require("validator").escape;
const PendingSignup = require("../models/PendingSignup");
const Credential = require("../models/Credential");
const Client = require("../models/Client");
const Worker = require("../models/Worker");
const generateTokenandSetCookie = require("../utils/generateTokenandCookie");
const { encryptAES128, decryptAES128 } = require("../utils/encipher");
const verifyToken = require("../middleware/verifyToken");
const { authLimiter, verifyLimiter } = require("../utils/rateLimit");
const router = express.Router();

const createClientProfile = async (pending, credentialId, session) => {
  try {
    const clientProfile = new Client({
      credentialId,
      firstName: pending.firstName,
      lastName: pending.lastName,
      middleName: pending.middleName,
      suffixName: pending.suffixName,
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
      profilePicture: {
        url: "",
        public_id: "",
      },
      blocked: false,
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
      middleName: pending.middleName,
      suffixName: pending.suffixName,
      contactNumber: pending.contactNumber,
      sex: pending.sex,
      dateOfBirth: pending.dateOfBirth,
      maritalStatus: pending.maritalStatus,
      address: {
        region: pending.address?.region || "",
        city: pending.address?.city || "",
        district: pending.address?.district || "",
        street: pending.address?.street || "",
        unit: pending.address?.unit || "",
      },
      profilePicture: {
        url: "",
        public_id: "",
      },
      biography: pending.biography || "",
      workerSkills: [],
      portfolio: [],
      experience: [],
      certificates: [],
      reviews: [],
      status: "Available",
      currentJob: null,
      blocked: false,
    });

    await workerProfile.save({ session });
  } catch (error) {
    throw new Error("Error creating worker profile in DB: " + error.message);
  }
};

const VALID_DOMAINS = ["gmail.com", "lookup.com", "yahoo.com"];
const SALT_RATE = 10;
//Signup
router.post(
  "/signup",
  authLimiter,
  /*verifyCaptcha*/ async (req, res) => {
    try {
      const {
        userType,
        email,
        password,
        lastName,
        firstName,
        middleName,
        suffixName,
        contactNumber,
        sex,
        dateOfBirth,
        maritalStatus,
        address,
      } = req.body;

      const normalizedEmail = escape(mongoSanitize(email.trim().toLowerCase()));

      const domain = normalizedEmail.split("@")[1].toLowerCase();

      const isValid = VALID_DOMAINS.includes(domain);

      if (!isValid) {
        throw new Error("Please use an email from gmail, lookup, or yahoo.");
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new Error("Invalid email format.");
      }

      const isPasswordStrong = (password) => {
        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
        return passwordRegex.test(password);
      };

      if (!isPasswordStrong(password)) {
        throw new Error(
          "Password must be at least 12 characters long and include an uppercase letter, a number, and a special character."
        );
      }

      // Validate firstName and lastName length (max 50 characters)
      if (
        firstName.length > 50 ||
        lastName.length > 50 ||
        middleName.length > 50 ||
        suffixName > 10
      ) {
        throw new Error(
          "First name or last name is too long. Maximum length is 50 characters."
        );
      }

      const phoneRegex = /^(?:\+639|09)\d{9}$/;
      if (!phoneRegex.test(contactNumber)) {
        throw new Error("Invalid Philippine contact number format.");
      }

      if (!validator.isAlpha(firstName.trim(), "en-US", { ignore: " -'" })) {
        throw new Error("Invalid characters in first name.");
      }

      if (!validator.isAlpha(lastName.trim(), "en-US", { ignore: " -'" })) {
        throw new Error("Invalid characters in last name.");
      }

      if (!validator.isAlpha(middleName.trim(), "en-US", { ignore: " -'" })) {
        throw new Error("Invalid characters in middle name.");
      }
      if (!validator.isAlpha(suffixName.trim(), "en-US", { ignore: " -'" })) {
        throw new Error("Invalid characters in suffix name.");
      }
      if (!validator.isDate(dateOfBirth)) {
        throw new Error("Invalid date of birth.");
      }

      // Validate region, district, city, and street fields
      if (!validator.isLength(address.region, { max: 100 })) {
        throw new Error(
          "Region is too long. Maximum length is 100 characters."
        );
      }
      if (!validator.isLength(address.district, { max: 100 })) {
        throw new Error(
          "District is too long. Maximum length is 100 characters."
        );
      }
      if (!validator.isLength(address.city, { max: 100 })) {
        throw new Error("City is too long. Maximum length is 100 characters.");
      }
      if (!validator.isLength(address.street, { max: 200 })) {
        throw new Error(
          "Street address is too long. Maximum length is 200 characters."
        );
      }

      // Sanitize
      const sanitizedFirstName = mongoSanitize(firstName);
      const sanitizedLastName = mongoSanitize(lastName);
      const sanitizedMiddleName = mongoSanitize(middleName);
      const sanitizedSuffixName = mongoSanitize(suffixName);
      const sanitizedContactNumber = mongoSanitize(contactNumber);
      const sanitizedAddress = {
        region: mongoSanitize(address.region),
        district: mongoSanitize(address.district),
        city: mongoSanitize(address.city),
        street: mongoSanitize(address.street),
        unit: address.unit ? mongoSanitize(address.unit) : null,
      };

      // Encrypt sensitive data
      const encryptedEmail = encryptAES128(normalizedEmail);
      const encryptedFirstName = encryptAES128(sanitizedFirstName);
      const encryptedLastName = encryptAES128(sanitizedLastName);
      const encryptedMiddleName = encryptAES128(sanitizedMiddleName);
      const encryptedSuffixName = encryptAES128(sanitizedSuffixName);
      const encryptedContact = encryptAES128(sanitizedContactNumber);
      const encryptedRegion = encryptAES128(sanitizedAddress.region);
      const encryptedDistrict = encryptAES128(sanitizedAddress.district);
      const encryptedCity = encryptAES128(sanitizedAddress.city);
      const encryptedStreet = encryptAES128(sanitizedAddress.street);
      const encryptedUnit = sanitizedAddress.unit
        ? encryptAES128(sanitizedAddress.unit)
        : null;

      // Check if email already exists (search for encrypted email)
      const allCredentials = await Credential.find({}).select("+email");
      const matchingCredential = allCredentials.find((user) => {
        try {
          return decryptAES128(user.email) === normalizedEmail;
        } catch {
          return false;
        }
      });

      if (matchingCredential) {
        throw new Error("Email already registered.");
      }

      const allPending = await PendingSignup.find({}).select("+email");
      const matchingPending = allPending.find((user) => {
        try {
          return decryptAES128(user.email) === normalizedEmail;
        } catch {
          return false;
        }
      });

      if (matchingPending) {
        throw new Error(
          "Please check your email for further instructions, if applicable."
        );
      }

      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(password, SALT_RATE);
      } catch (err) {
        throw new Error("Error while hashing password.");
      }

      const authCode = generateAuthenticationCode();

      if (!["client", "worker"].includes(userType)) {
        throw new Error("Invalid user type.");
      }

      if (
        ![
          "single",
          "married",
          "separated",
          "divorced",
          "widowed",
          "prefer not to say",
        ].includes(maritalStatus)
      ) {
        throw new Error("Invalid marital status");
      }

      const pendingData = {
        email: encryptedEmail,
        password: hashedPassword,
        userType,
        lastName: encryptedLastName,
        firstName: encryptedFirstName,
        middleName: encryptedMiddleName,
        suffixName: encryptedSuffixName,
        contactNumber: encryptedContact,
        sex,
        dateOfBirth,
        maritalStatus,
        address: {
          region: encryptedRegion,
          city: encryptedCity,
          district: encryptedDistrict,
          street: encryptedStreet,
          unit: encryptedUnit ? encryptedUnit : null,
        },
        authenticationCode: await bcrypt.hash(authCode, SALT_RATE),
        authenticationCodeExpiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
      };

      await PendingSignup.create(pendingData);

      let fullName = `${sanitizedFirstName} ${sanitizedLastName}`;

      const sent = await emailVerification(authCode, normalizedEmail, fullName);

      if (!sent.success) {
        throw new Error(sent.reason || "Failed to send verification email.");
      }

      res.status(200).json({
        success: true,
        message: `${userType} verification email sent successfully.`,
      });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(400).json({
        success: false,
        message:
          process.env.NODE_ENV === "production"
            ? "An error occurred during signup. Please try again later."
            : err.message,
      });
    }
  }
);

//verify
router.post("/verify", verifyLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userType, email, code } = req.body;
    const ATTEMPT_LIMIT = 5;
    const normalizedEmail = escape(mongoSanitize(email.trim().toLowerCase()));

    const domain = normalizedEmail.split("@")[1].toLowerCase();

    const isValid = VALID_DOMAINS.includes(domain);

    if (!isValid) {
      throw new Error("Please use an email from gmail, lookup, or yahoo.");
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error("Invalid email format.");
    }

    const allPending = await PendingSignup.find({ userType }).select(
      "+email +password"
    );

    const matchingPending = allPending.find((user) => {
      try {
        return decryptAES128(user.email) === normalizedEmail;
      } catch {
        return false;
      }
    });

    if (!matchingPending) {
      throw new Error("No pending signup found for this email.");
    }
    const pending = matchingPending;

    if (pending.blockedUntil && pending.blockedUntil > Date.now()) {
      const secs = Math.ceil((pending.blockedUntil - Date.now()) / 1000);
      throw new Error(`Too many attempts. Try again in ${secs}s`);
    }

    if (
      !pending.authenticationCodeExpiresAt ||
      pending.authenticationCodeExpiresAt < Date.now()
    ) {
      throw new Error("Verification code has expired.");
    }

    const valid = await bcrypt.compare(code, pending.authenticationCode);
    if (!valid) {
      pending.verifyAttempts = (pending.verifyAttempts || 0) + 1;

      console.warn(
        `[VERIFY FAILED] ${normalizedEmail.slice(
          0,
          3
        )}***@${domain} | Attempt #${pending.verifyAttempts}`
      );

      if (pending.verifyAttempts >= ATTEMPT_LIMIT) {
        const blockMinutes = Math.pow(
          2,
          pending.verifyAttempts - ATTEMPT_LIMIT + 2
        );
        pending.blockedUntil = Date.now() + blockMinutes * 60 * 1000;
      }

      await pending.save({ session });
      await session.commitTransaction();
      session.endSession();

      const remaining = Math.max(0, ATTEMPT_LIMIT - pending.verifyAttempts);
      return res.status(400).json({
        success: false,
        message:
          remaining > 0
            ? `Invalid code. You have ${remaining} attempt(s) left.`
            : `Too many failed attempts. You are blocked for ${Math.pow(
                2,
                pending.verifyAttempts - ATTEMPT_LIMIT + 2
              )} minutes.`,
      });
    }

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

    await PendingSignup.deleteOne({ _id: pending._id }, { session });

    await session.commitTransaction();
    session.endSession();

    generateTokenandSetCookie(res, credential);
    return res
      .status(201)
      .json({ success: true, message: "Email verified and account created." });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// Resend code
router.post("/resend-code", verifyLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    const normalizedEmail = escape(mongoSanitize(email.trim().toLowerCase()));
    const domain = normalizedEmail.split("@")[1];

    const isValid = VALID_DOMAINS.includes(domain);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Please use an email from gmail, lookup, or yahoo.",
      });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format." });
    }

    const candidates = await PendingSignup.find({}).select("+email +password");

    const matchingPending = candidates.find((user) => {
      try {
        return decryptAES128(user.email) === normalizedEmail;
      } catch {
        return false;
      }
    });

    if (!matchingPending) {
      return res.status(404).json({
        success: false,
        message: "No pending signup found for this email.",
      });
    }

    const pending = matchingPending;

    let decryptedFirstName = "";
    let decryptedLastName = "";
    try {
      decryptedFirstName = decryptAES128(pending.firstName);
      decryptedLastName = decryptAES128(pending.lastName);
    } catch (err) {
      console.error("Error decrypting name:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to decrypt names." });
    }

    if (pending.blockedUntil && pending.blockedUntil > Date.now()) {
      const secs = Math.ceil((pending.blockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Your account is temporarily blocked. Please try again in ${secs} seconds.`,
      });
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

    pending.authenticationCode = await bcrypt.hash(newCode, SALT_RATE);
    pending.authenticationCodeExpiresAt = Date.now() + 10 * 60 * 1000;
    pending.verifyAttempts = 0;
    pending.blockedUntil = undefined;
    pending.lastResendAt = Date.now();
    await pending.save();

    const sent = await emailVerification(
      newCode,
      email,
      `${decryptedFirstName} ${decryptedLastName}`
    );

    if (!sent.success) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send code" });
    }

    return res.json({ success: true, message: "New verification code sent" });
  } catch (err) {
    console.error("Resend code error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// Login
router.post(
  "/login",
  authLimiter,
  /*verifyCaptcha*/ async (req, res) => {
    const { email, password } = req.body;

    try {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      const normalizedEmail = escape(mongoSanitize(email.trim().toLowerCase()));

      const domain = normalizedEmail.split("@")[1];
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      const isValidDomain = VALID_DOMAINS.includes(domain);
      const isValidFormat = emailRegex.test(normalizedEmail);

      if (!isValidDomain || !isValidFormat) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const sanitizedPassword = mongoSanitize(password);

      const allUsers = await Credential.find({}).select("+email +password");

      const matchingUser = allUsers.find((user) => {
        try {
          return decryptAES128(user.email) === normalizedEmail;
        } catch {
          return false;
        }
      });

      if (!matchingUser) {
        return res.status(404).json({
          success: false,
          message: "No pending signup found for this email.",
        });
      }

      const foundUser = matchingUser;

      const isPasswordCorrect = await bcrypt.compare(
        sanitizedPassword,
        foundUser.password
      );

      if (!isPasswordCorrect) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Successful login
      generateTokenandSetCookie(res, foundUser);
      foundUser.lastLogin = new Date();
      await foundUser.save();

      return res.status(200).json({
        success: true,
        message: "Login successfully",
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
      });
    }
  }
);

// Check auth
router.get("/check-auth", verifyToken, async (req, res) => {
  try {
    const { id, userType } = req.user;

    // Fetch credentials without password
    const credential = await Credential.findById(id).select("-password");
    if (!credential) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let user;

    if (userType === "client") {
      user = await Client.findOne({ credentialId: id });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
    } else if (userType === "worker") {
      user = await Worker.findOne({ credentialId: id });
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
    console.error("Error in /check-auth-try", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  console.log(`User ${req.user ? req.user.email : "unknown"} logged out.`);

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  res.status(200).json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
