const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const validator = require("validator");
const escape = require("validator").escape;
const mongoSanitize = require("mongo-sanitize");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");

//models
const PendingSignup = require("../models/PendingSignup");
const Credential = require("../models/Credential");
const Client = require("../models/Client");
const Worker = require("../models/Worker");

//mailer
const sendVerificationEmail = require("../mailer/sendVerificationEmail");
const forgotPasswordMailer = require("../mailer/resetPassword");

//utils
const generateTokenandSetCookie = require("../utils/generateTokenandCookie");
const generateVerifyToken = require("../utils/generateVerifyToken");
const { encryptAES128, decryptAES128 } = require("../utils/encipher");

//constants
const VALID_DOMAINS = ["gmail.com", "lookup.com", "yahoo.com"];
const SALT_RATE = 10;

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
        unit: pending.address?.unit || null,
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

const signup = async (req, res) => {
  try {
    const {
      userType,
      email,
      password,
      lastName = "",
      firstName = "",
      middleName = "",
      suffixName = "",
      contactNumber,
      sex,
      dateOfBirth,
      maritalStatus,
      address,
    } = req.body;

    const normalizedEmail = mongoSanitize(email.trim().toLowerCase());
    const domain = normalizedEmail.split("@")[1];

    if (!VALID_DOMAINS.includes(domain)) {
      throw new Error("Please use an email from gmail, lookup, or yahoo.");
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error("Invalid email format.");
    }

    const isPasswordStrong = (password) => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;

      return passwordRegex.test(password);
    };
    if (!isPasswordStrong(password)) {
      throw new Error(
        "Password must be at least 12 characters long and include an uppercase letter, a number, and a special character."
      );
    }

    if (
      firstName.length > 50 ||
      lastName.length > 50 ||
      middleName.length > 50 ||
      suffixName.length > 10
    ) {
      throw new Error("Name fields exceed max allowed length.");
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
    if (
      suffixName &&
      !validator.isAlpha(suffixName.trim(), "en-US", { ignore: " -'" })
    ) {
      throw new Error("Invalid characters in suffix name.");
    }

    if (!validator.isDate(dateOfBirth)) {
      throw new Error("Invalid date of birth.");
    }

    if (!validator.isLength(address.region, { max: 100 })) {
      throw new Error("Region is too long.");
    }
    if (!validator.isLength(address.district, { max: 100 })) {
      throw new Error("District is too long.");
    }
    if (!validator.isLength(address.city, { max: 100 })) {
      throw new Error("City is too long.");
    }
    if (!validator.isLength(address.street, { max: 200 })) {
      throw new Error("Street is too long.");
    }

    const sanitizedFirstName = escape(mongoSanitize(firstName));
    const sanitizedLastName = escape(mongoSanitize(lastName));
    const sanitizedMiddleName = escape(mongoSanitize(middleName));
    const sanitizedSuffixName = suffixName
      ? escape(mongoSanitize(suffixName))
      : null;
    const sanitizedContactNumber = escape(mongoSanitize(contactNumber));
    const sanitizedAddress = {
      region: escape(mongoSanitize(address.region)),
      district: escape(mongoSanitize(address.district)),
      city: escape(mongoSanitize(address.city)),
      street: escape(mongoSanitize(address.street)),
      unit: address.unit ? escape(mongoSanitize(address.unit)) : null,
    };

    const encryptedFirstName = encryptAES128(sanitizedFirstName);
    const encryptedLastName = encryptAES128(sanitizedLastName);
    const encryptedMiddleName = encryptAES128(sanitizedMiddleName);
    const encryptedSuffixName = sanitizedSuffixName
      ? encryptAES128(sanitizedSuffixName)
      : null;
    const encryptedContact = encryptAES128(sanitizedContactNumber);
    const encryptedRegion = encryptAES128(sanitizedAddress.region);
    const encryptedDistrict = encryptAES128(sanitizedAddress.district);
    const encryptedCity = encryptAES128(sanitizedAddress.city);
    const encryptedStreet = encryptAES128(sanitizedAddress.street);
    const encryptedUnit = sanitizedAddress.unit
      ? encryptAES128(sanitizedAddress.unit)
      : null;

    const matchingCredential = await Credential.findOne({
      email: normalizedEmail,
    }).select("+email");
    if (matchingCredential) {
      throw new Error("Email already registered.");
    }

    const matchingPending = await PendingSignup.findOne({
      email: normalizedEmail,
    }).select("+email");
    if (matchingPending) {
      throw new Error("Pending signup already exists.");
    }
    const hashedPassword = await bcrypt.hash(password, SALT_RATE);

    // 🔐 Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `FixIt (${normalizedEmail})`,
    });

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

    // 🧾 Store user pending signup
    await PendingSignup.create({
      email: normalizedEmail,
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
      totpSecret: secret.base32,
      address: {
        region: encryptedRegion,
        city: encryptedCity,
        district: encryptedDistrict,
        street: encryptedStreet,
        unit: encryptedUnit || null,
      },
      emailVerificationToken,
      emailVerificationExpires,
      emailVerified: false,
      verifyAttempts: 0,
    });

    // Send verification email
    const verifyUrl = `http://localhost:5000/ver/verify-email?token=${emailVerificationToken}`;
    await sendVerificationEmail(normalizedEmail, verifyUrl);

    console.log(verifyUrl);
    res.status(200).json({
      success: true,
      message:
        "Signup initiated. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(400).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "An error occurred during signup."
          : err.message,
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "Verification token is required." });

    const pending = await PendingSignup.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    }).select("+totpSecret +email");

    if (!pending) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification link.",
      });
    }

    pending.emailVerified = true;
    pending.emailVerificationToken = undefined;
    pending.emailVerificationExpires = undefined;
    await pending.save();

    // Generate QR code for authenticator apps
    const otpauthUrl = speakeasy.otpauthURL({
      secret: pending.totpSecret,
      label: `FixIt (${pending.email})`,
      encoding: "base32",
    });

    //log qr for now
    qrcodeTerminal.generate(otpauthUrl, { small: true });

    const qr = await qrcode.toDataURL(otpauthUrl);

    generateVerifyToken(res, pending.email, pending.userType);

    // You can redirect to frontend or just send QR and manual key
    res.status(200).json({
      success: true,
      message:
        "Email verified. Please scan the QR code and enter your OTP to complete registration.",
      qrCodeURL: qr,
      manualEntryKey: pending.totpSecret,
      email: pending.email,
      userType: pending.userType,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Verification failed."
          : err.message,
    });
  }
};

const verify = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, userType } = req.code;
    const { token } = req.body;
    if (!token) throw new Error("TOTP token is required.");
    if (!email || !userType)
      throw new Error("Email and userType are required.");

    const ATTEMPT_LIMIT = 5;

    const pending = await PendingSignup.findOne({ email, userType }).select(
      "+email +password +totpSecret"
    );
    if (!pending) throw new Error("No pending signup found.");
    if (!pending.emailVerified)
      throw new Error("Please verify your email first.");

    if (pending.blockedUntil && pending.blockedUntil > Date.now()) {
      const secs = Math.ceil((pending.blockedUntil - Date.now()) / 1000);
      throw new Error(`Too many attempts. Try again in ${secs}s`);
    }

    // Verify TOTP
    const valid = speakeasy.totp.verify({
      secret: pending.totpSecret,
      encoding: "base32",
      token: token,
      window: 1,
    });

    if (!valid) {
      pending.verifyAttempts = (pending.verifyAttempts || 0) + 1;
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
      return res.status(400).json({
        success: false,
        message: `Invalid code. ${
          ATTEMPT_LIMIT - pending.verifyAttempts
        } attempt(s) left.`,
      });
    }

    // Move to Credential collection
    const credential = new Credential({
      email: pending.email,
      password: pending.password,
      userType: pending.userType,
      isAuthenticated: true,
    });
    await credential.save({ session });

    // Move additional details to appropriate collection (Client/Worker)
    if (pending.userType === "client") {
      await createClientProfile(pending, credential._id, session);
    } else if (pending.userType === "worker") {
      await createWorkerProfile(pending, credential._id, session);
    }

    await PendingSignup.deleteOne({ _id: pending._id }, { session });

    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ success: true, message: "Account verified successfully!" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Verification failed. Please try again."
          : err.message,
    });
  }
};

const resendCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    const normalizedEmail = mongoSanitize(email.trim().toLowerCase());
    const domain = normalizedEmail.split("@")[1];

    if (!VALID_DOMAINS.includes(domain)) {
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

    const pending = await PendingSignup.findOne({
      email: normalizedEmail,
    }).select("+totpSecret");
    if (!pending) {
      return res.status(404).json({
        success: false,
        message: "No pending signup found for this email.",
      });
    }

    if (pending.blockedUntil && pending.blockedUntil > Date.now()) {
      const secs = Math.ceil((pending.blockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Your account is temporarily blocked. Please try again in ${secs} seconds.`,
      });
    }

    // Optionally, rate limit QR resend (e.g., 1 per minute)
    if (pending.lastResendAt && Date.now() - pending.lastResendAt < 60 * 1000) {
      const wait = Math.ceil(
        (60 * 1000 - (Date.now() - pending.lastResendAt)) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${wait}s before requesting the QR code again.`,
      });
    }

    // Recreate the otpauth URL
    const secret = pending.totpSecret;
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: `FixIt (${normalizedEmail})`,
      encoding: "base32",
    });
    const qr = await qrcode.toDataURL(otpauthUrl);

    pending.lastResendAt = Date.now();
    await pending.save();

    return res.json({
      success: true,
      message: "QR code resent successfully.",
      qrCodeURL: qr,
      manualEntryKey: secret,
    });
  } catch (err) {
    console.error("Resend QR error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const normalizedEmail = mongoSanitize(email.trim().toLowerCase());

    const domain = normalizedEmail.split("@")[1];
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const isValidDomain = VALID_DOMAINS.includes(domain);
    const isValidFormat = emailRegex.test(normalizedEmail);

    if (!isValidDomain || !isValidFormat) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const sanitizedPassword = mongoSanitize(password);

    const matchingUser = await Credential.findOne({
      email: normalizedEmail,
    }).select("+email +password");

    if (!matchingUser) {
      return res.status(404).json({
        success: false,
        message: "Please register your account first",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      sanitizedPassword,
      matchingUser.password
    );

    if (!isPasswordCorrect) {
      console.warn(
        `Suspicious login attempt: email=${normalizedEmail}, ip=${
          req.ip
        }, time=${new Date().toISOString()}`
      );
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Successful login
    generateTokenandSetCookie(res, matchingUser);
    matchingUser.lastLogin = new Date();
    await matchingUser.save();

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
};

const checkAuth = async (req, res) => {
  try {
    const { id, userType } = req.user;

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

    // credential.lastLogin = new Date();
    // await credential.save();
    res.status(200).json({
      success: true,
      data: {
        id: credential._id,
        name: user
          ? `${decryptAES128(user.firstName)} ${decryptAES128(user.lastName)}`
          : null,
        userType: credential.userType,
        isAuthenticated: credential.isAuthenticated,
        isVerified: credential.isVerified,
      },
    });
  } catch (err) {
    console.error("Error in /check-auth", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const logout = (req, res) => {
  console.log(`User ${req.user.email} logged out.`);

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  res.status(200).json({ success: true, message: "Logged out successfully" });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }
    const normalizedEmail = mongoSanitize(email.trim().toLowerCase());
    const user = await Credential.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    //decrypt the first name
    const decryptedFirstName = decryptAES128(user.firstName);
    // Build reset URL and send email
    const resetUrl = `https://yourdomain.com/reset-password?token=${token}`;
    await forgotPasswordMailer(normalizedEmail, decryptedFirstName, resetUrl);

    if (!mailSent) {
      console.error(
        `Failed to send password reset email to ${normalizedEmail}`
      );
      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again later.",
      });
    }

    res.status(200).json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const user = await Credential.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token." });
    }

    // Password strength check (reuse your existing logic)
    const isPasswordStrong = (password) => {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
      return passwordRegex.test(password);
    };
    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 12 characters long and include an uppercase letter, a number, and a special character.",
      });
    }

    user.password = await bcrypt.hash(password, SALT_RATE);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  signup,
  verifyEmail,
  verify,
  resendCode,
  login,
  checkAuth,
  logout,
  forgotPassword,
  resetPassword,
};
