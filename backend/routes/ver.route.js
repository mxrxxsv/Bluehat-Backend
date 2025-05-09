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
const streamifier = require("streamifier");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const multiUpload = upload.fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "portfolio", maxCount: 5 },
  { name: "certificates", maxCount: 5 },
  { name: "idPicture", maxCount: 1 },
  { name: "selfiePicture", maxCount: 1 },
]);

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

//Signup
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
    } = req.body;

    const [existingCredential, existingPending] = await Promise.all([
      Credential.findOne({ email }),
      PendingSignup.findOne({ email }),
    ]);

    if (existingCredential) throw new Error("Email already registered.");
    if (existingPending)
      throw new Error(
        "A verification process is already pending for this email."
      );

    const hashedPassword = await bcrypt.hash(password, 10);
    const authCode = generateAuthenticationCode();

    if (!["client", "worker"].includes(userType)) {
      throw new Error("Invalid user type.");
    }

    if (
      ![
        "Single",
        "Married",
        "Separated",
        "Divorced",
        "Widowed",
        "Prefer not to say",
      ].includes(maritalStatus)
    ) {
      throw new Error("Invalid marital status");
    }

    const pendingData = {
      email,
      password: hashedPassword,
      userType,
      lastName,
      firstName,
      contactNumber,
      sex,
      dateOfBirth,
      maritalStatus,
      address: {
        region: address.region,
        city: address.city,
        district: address.district,
        street: address.street,
        unit: address.unit || null,
      },
      authenticationCode: authCode,
      authenticationCodeExpiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
    };

    await PendingSignup.create(pendingData);

    let fullName = `${firstName} ${lastName}`;

    const sent = await emailVerification(authCode, email, fullName);

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
});

//verify
router.post("/verify", authLimiter, async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { email, code } = req.body;

    const pending = await PendingSignup.findOne({ email })
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

    await PendingSignup.deleteOne({ email: email }, { session });

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

// Profile upload route using chunked upload
router.post(
  "/upload",
  authLimiter,
  verifyToken,
  multiUpload,
  async (req, res) => {
    try {
      const user = req.user;
      const userId = user.id;
      const userType = user.userType;

      // Check for files uploaded
      if (!req.files?.profilePicture) {
        return res.status(400).json({
          success: false,
          message: "No profile picture uploaded.",
        });
      }

      const file = req.files.profilePicture[0]; // Get the profile picture file

      // Start chunked upload to Cloudinary
      const options = {
        folder: "fixit/profilePictures", // Specify the folder on Cloudinary
        chunk_size: 5 * 1024 * 1024, // 5MB chunk size (can be adjusted)
      };

      const upload_stream = cloudinary.uploader.upload_stream(
        options,
        async (error, result) => {
          if (error) {
            return res.status(500).json({
              success: false,
              message: "Error uploading to Cloudinary.",
              error: error.message,
            });
          }

          // Handle success: image is uploaded successfully
          const updateData = {
            profilePicture: {
              url: result.secure_url,
              public_id: result.public_id,
            },
          };

          // Update user profile in DB based on user type (client or worker)
          let updatedProfile;
          if (userType === "client") {
            updatedProfile = await Client.findOneAndUpdate(
              { credentialId: userId },
              updateData,
              { new: true }
            );
          } else if (userType === "worker") {
            updatedProfile = await Worker.findOneAndUpdate(
              { credentialId: userId },
              updateData,
              { new: true }
            );
          } else {
            return res.status(400).json({
              success: false,
              message: "Unknown user type.",
            });
          }

          res.status(200).json({
            success: true,
            message: "Profile picture updated successfully.",
            data: updatedProfile.profilePicture,
          });
        }
      );

      // Stream the image chunks to Cloudinary
      streamifier.createReadStream(file.buffer).pipe(upload_stream);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

//Verify id and selfie route
router.post(
  "/verify-id",
  authLimiter,
  verifyToken,
  multiUpload,
  async (req, res) => {
    try {
      const user = req.user; // Get user from the token
      const userId = user.id;
      const userType = user.userType;

      // Check if idPicture and selfiePicture are provided
      if (!req.files?.idPicture || !req.files?.selfiePicture) {
        return res.status(400).json({
          success: false,
          message: "Both ID picture and selfie picture are required.",
        });
      }

      const idPictureFile = req.files.idPicture[0]; // Get the ID picture file
      const selfiePictureFile = req.files.selfiePicture[0]; // Get the selfie picture file

      // Function to upload file to Cloudinary
      const uploadToCloudinary = (file, folder) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
      };

      // Upload both images sequentially
      const [idPictureResult, selfiePictureResult] = await Promise.all([
        uploadToCloudinary(idPictureFile, "fixit/idPictures"),
        uploadToCloudinary(selfiePictureFile, "fixit/selfiePictures"),
      ]);

      // Prepare update data
      const updateData = {
        idPicture: {
          url: idPictureResult.secure_url,
          public_id: idPictureResult.public_id,
        },
        selfiePicture: {
          url: selfiePictureResult.secure_url,
          public_id: selfiePictureResult.public_id,
        },
      };

      // Update user's credential data
      const updatedCredential = await Credential.findOneAndUpdate(
        { _id: userId, userType: userType },
        updateData,
        { new: true }
      );

      // Respond with success message
      res.status(200).json({
        success: true,
        message:
          "ID and selfie pictures uploaded successfully for verification.",
        data: updatedCredential,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

// Create portfolio route for workers
router.post(
  "/create-portfolio",
  authLimiter,
  verifyToken,
  multiUpload,
  async (req, res) => {
    try {
      const user = req.user; // Get user from token
      const userId = user.id;
      const userType = user.userType;

      // Check if user is a worker
      if (userType !== "worker") {
        return res.status(400).json({
          success: false,
          message: "Only workers can create portfolios.",
        });
      }

      // Get the data from the request body
      const { biography, workerSkills, experience, portfolio, certificates } =
        req.body;

      // Ensure workerSkills is provided and has at least one skill
      if (!workerSkills || workerSkills.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one skill must be provided.",
        });
      }

      // Initialize arrays for portfolio and certificates
      const portfolioItems = [];
      const certificateItems = [];

      // Handle portfolio image uploads to Cloudinary
      if (req.files?.portfolio) {
        const uploadPromises = portfolio.map((item, index) => {
          return new Promise((resolve, reject) => {
            const { projectTitle, description } = item;
            const file = req.files.portfolio[index];

            // Upload portfolio image to Cloudinary
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "fixit/portfolios" },
              (error, result) => {
                if (error) {
                  return reject({
                    message: `Error uploading portfolio image for item #${
                      index + 1
                    }.`,
                    error: error.message,
                  });
                }

                // Add portfolio item with image data
                portfolioItems.push({
                  projectTitle: projectTitle || "", // Allow empty projectTitle
                  description: description || "", // Allow empty description
                  image: {
                    url: result.secure_url,
                    public_id: result.public_id,
                  },
                });
                resolve();
              }
            );

            // Pipe the file to the upload stream
            file.stream.pipe(uploadStream);
          });
        });

        // Wait for all portfolio items to be uploaded
        await Promise.all(uploadPromises);
      }

      // Handle certificates image uploads to Cloudinary
      if (req.files?.certificates) {
        const uploadCertPromises = req.files.certificates.map((file) => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "fixit/certificates" },
              (error, result) => {
                if (error) {
                  return reject({
                    message: "Error uploading certificate to Cloudinary.",
                    error: error.message,
                  });
                }

                certificateItems.push({
                  url: result.secure_url,
                  public_id: result.public_id,
                });
                resolve();
              }
            );

            // Pipe the certificate file to the upload stream
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          });
        });

        // Wait for all certificate items to be uploaded
        await Promise.all(uploadCertPromises);
      }

      // Create or update the worker's portfolio
      const workerPortfolioData = {
        biography: biography || "",
        workerSkills,
        portfolio: portfolioItems,
        experience: experience || [],
        certificates: certificateItems,
      };

      // Find worker by userId and update portfolio
      const updatedWorker = await Worker.findOneAndUpdate(
        { credentialId: userId },
        { $set: workerPortfolioData },
        { new: true }
      );

      if (!updatedWorker) {
        return res.status(404).json({
          success: false,
          message: "Worker not found.",
        });
      }

      // Respond with success
      res.status(200).json({
        success: true,
        message: "Portfolio created/updated successfully.",
        data: updatedWorker,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

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

    generateTokenandSetCookie(res, user);
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
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
