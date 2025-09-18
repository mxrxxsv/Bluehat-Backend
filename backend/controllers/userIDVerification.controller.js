const Joi = require("joi");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const IDPicture = require("../models/IdPicture");
const Selfie = require("../models/Selfie");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const logger = require("../utils/logger");
const { decryptAES128 } = require("../utils/encipher");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ==================== JOI SCHEMAS ====================
const uploadSchema = Joi.object({
  userId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid user ID format",
    }),
});

// ==================== HELPER FUNCTIONS ====================
const updateWorkerVerificationStatus = async (
  credentialId,
  idPictureId,
  selfiePictureId
) => {
  try {
    const worker = await Worker.findOne({ credentialId });
    if (!worker) return;

    const updateData = {};
    if (idPictureId) updateData.idPictureId = idPictureId;
    if (selfiePictureId) updateData.selfiePictureId = selfiePictureId;

    // Check if both documents are now present
    const hasIdPicture = worker.idPictureId || idPictureId;
    const hasSelfie = worker.selfiePictureId || selfiePictureId;

    if (
      hasIdPicture &&
      hasSelfie &&
      worker.verificationStatus === "not_submitted"
    ) {
      updateData.verificationStatus = "pending";
      updateData.idVerificationSubmittedAt = new Date();
    }

    await Worker.findOneAndUpdate({ credentialId }, updateData);
  } catch (error) {
    console.error("Error updating worker verification status:", error);
  }
};

// ==================== CONTROLLERS ====================

// Upload ID Picture
const uploadIDPicture = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = uploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const { userId } = value;

    // Check if user exists and is a worker
    const credential = await Credential.findById(userId);
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (credential.userType !== "worker") {
      return res.status(400).json({
        success: false,
        message: "Only workers can upload ID verification documents",
      });
    }

    // Check if file is provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    console.log(`🆔 Uploading ID picture for worker: ${credential.email}`);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `id_verification/workers/id_pictures`,
          resource_type: "image",
          format: "jpg",
          quality: "auto:good",
          transformation: [
            {
              width: 1200,
              height: 800,
              crop: "limit",
              quality: "auto:good",
            },
          ],
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("✅ Cloudinary upload successful:", result.public_id);
            resolve(result);
          }
        }
      );

      uploadStream.end(req.file.buffer);
    });

    // Save to database
    const newIDPicture = new IDPicture({
      url: uploadResult.url,
      public_id: uploadResult.public_id,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      uploadedBy: userId,
    });

    await newIDPicture.save();
    console.log("✅ ID Picture saved to database:", newIDPicture._id);

    // Update worker's verification status
    await updateWorkerVerificationStatus(userId, newIDPicture._id, null);

    res.status(201).json({
      success: true,
      message: "ID picture uploaded successfully",
      data: {
        idPicture: {
          id: newIDPicture._id,
          url: newIDPicture.url,
          public_id: newIDPicture.public_id,
          bytes: newIDPicture.bytes,
          format: newIDPicture.format,
          dimensions: `${newIDPicture.width}x${newIDPicture.height}`,
          uploadedAt: newIDPicture.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("💥 Error uploading ID picture:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload ID picture",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Upload Selfie
const uploadSelfie = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = uploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const { userId } = value;

    // Check if user exists and is a worker
    const credential = await Credential.findById(userId);
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (credential.userType !== "worker") {
      return res.status(400).json({
        success: false,
        message: "Only workers can upload verification documents",
      });
    }

    // Check if file is provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    console.log(`🤳 Uploading selfie for worker: ${credential.email}`);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `id_verification/workers/selfies`,
          resource_type: "image",
          format: "jpg",
          quality: "auto:good",
          transformation: [
            {
              width: 800,
              height: 800,
              crop: "limit",
              quality: "auto:good",
            },
          ],
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("✅ Cloudinary upload successful:", result.public_id);
            resolve(result);
          }
        }
      );

      uploadStream.end(req.file.buffer);
    });

    // Save to database
    const newSelfie = new Selfie({
      url: uploadResult.url,
      public_id: uploadResult.public_id,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      uploadedBy: userId,
    });

    await newSelfie.save();
    console.log("✅ Selfie saved to database:", newSelfie._id);

    // Update worker's verification status
    await updateWorkerVerificationStatus(userId, null, newSelfie._id);

    res.status(201).json({
      success: true,
      message: "Selfie uploaded successfully",
      data: {
        selfie: {
          id: newSelfie._id,
          url: newSelfie.url,
          public_id: newSelfie.public_id,
          bytes: newSelfie.bytes,
          format: newSelfie.format,
          dimensions: `${newSelfie.width}x${newSelfie.height}`,
          uploadedAt: newSelfie.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("💥 Error uploading selfie:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload selfie",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get user's verification status
const getVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    const { error } = uploadSchema.validate({ userId });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Check if user exists
    const credential = await Credential.findById(userId);
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (credential.userType !== "worker") {
      return res.status(400).json({
        success: false,
        message: "Only workers can check verification status",
      });
    }

    // Get worker profile with documents
    const worker = await Worker.findOne({ credentialId: userId })
      .populate("idPictureId")
      .populate("selfiePictureId");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Verification status retrieved successfully",
      data: {
        verificationStatus: worker.verificationStatus,
        verificationStatusText: worker.verificationStatusText,
        hasIdPicture: !!worker.idPictureId,
        hasSelfie: !!worker.selfiePictureId,
        hasCompleteVerification: worker.hasCompleteIdVerification,
        canResubmit: worker.canResubmit,
        resubmissionCount: worker.resubmissionCount,
        maxResubmissionAttempts: worker.maxResubmissionAttempts,
        submittedAt: worker.idVerificationSubmittedAt,
        approvedAt: worker.idVerificationApprovedAt,
        rejectedAt: worker.idVerificationRejectedAt,
        notes: worker.idVerificationNotes,
        documents: {
          idPicture: worker.idPictureId
            ? {
                id: worker.idPictureId._id,
                url: worker.idPictureId.url,
                uploadedAt: worker.idPictureId.createdAt,
                status: worker.idPictureId.verificationStatus,
              }
            : null,
          selfie: worker.selfiePictureId
            ? {
                id: worker.selfiePictureId._id,
                url: worker.selfiePictureId.url,
                uploadedAt: worker.selfiePictureId.createdAt,
                status: worker.selfiePictureId.verificationStatus,
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("💥 Error getting verification status:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get verification status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get all workers who have submitted ID verification
const getPendingVerifications = async (req, res) => {
  try {
    // Get workers with pending verification status and both documents uploaded
    const pendingWorkers = await Worker.find({
      verificationStatus: "pending",
      idPictureId: { $ne: null },
      selfiePictureId: { $ne: null },
    })
      .populate({
        path: "credentialId",
        select: "email createdAt",
      })
      .populate({
        path: "idPictureId",
        select: "url createdAt bytes format width height",
      })
      .populate({
        path: "selfiePictureId",
        select: "url createdAt bytes format width height",
      })
      .sort({ idVerificationSubmittedAt: -1 })
      .lean();

    // Decrypt worker names and format response
    const formattedWorkers = [];

    for (const worker of pendingWorkers) {
      try {
        const decryptedFirstName = decryptAES128(worker.firstName);
        const decryptedLastName = decryptAES128(worker.lastName);
        const decryptedMiddleName = worker.middleName
          ? decryptAES128(worker.middleName)
          : "";
        const decryptedSuffixName = worker.suffixName
          ? decryptAES128(worker.suffixName)
          : "";

        const fullName = `${decryptedFirstName} ${
          decryptedMiddleName ? decryptedMiddleName + " " : ""
        }${decryptedLastName}${
          decryptedSuffixName ? " " + decryptedSuffixName : ""
        }`.trim();

        formattedWorkers.push({
          _id: worker._id,
          credentialId: worker.credentialId._id,
          fullName,
          firstName: decryptedFirstName,
          lastName: decryptedLastName,
          middleName: decryptedMiddleName,
          suffixName: decryptedSuffixName,
          email: worker.credentialId.email,
          verificationStatus: worker.verificationStatus,
          verificationStatusText: "Under Review",
          submittedAt: worker.idVerificationSubmittedAt,
          resubmissionCount: worker.resubmissionCount,
          documents: {
            idPicture: {
              id: worker.idPictureId._id,
              url: worker.idPictureId.url,
              uploadedAt: worker.idPictureId.createdAt,
              bytes: worker.idPictureId.bytes,
              format: worker.idPictureId.format,
              dimensions: `${worker.idPictureId.width}x${worker.idPictureId.height}`,
            },
            selfie: {
              id: worker.selfiePictureId._id,
              url: worker.selfiePictureId.url,
              uploadedAt: worker.selfiePictureId.createdAt,
              bytes: worker.selfiePictureId.bytes,
              format: worker.selfiePictureId.format,
              dimensions: `${worker.selfiePictureId.width}x${worker.selfiePictureId.height}`,
            },
          },
          createdAt: worker.createdAt,
        });
      } catch (decryptError) {
        console.error("Failed to decrypt worker data:", decryptError);
        // Skip this worker or use fallback data
        continue;
      }
    }

    res.status(200).json({
      success: true,
      message: "Pending verifications retrieved successfully",
      code: "PENDING_VERIFICATIONS_RETRIEVED",
      data: {
        verifications: formattedWorkers,
        totalCount: formattedWorkers.length,
        statistics: {
          totalPending: formattedWorkers.length,
          resubmissions: formattedWorkers.filter((w) => w.resubmissionCount > 0)
            .length,
        },
      },
    });
  } catch (error) {
    console.error("💥 Error getting pending verifications:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get pending verifications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  upload: upload.single("image"),
  uploadIDPicture,
  uploadSelfie,
  getVerificationStatus,
  getPendingVerifications,
};
