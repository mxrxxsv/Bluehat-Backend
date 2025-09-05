// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const streamifier = require("streamifier");
// const crypto = require("crypto");

// const cloudinary = require("../db/cloudinary");
// const verifyToken = require("../middleware/verifyToken");
// const { authLimiter } = require("../utils/rateLimit");

// const Credential = require("../models/Credential");
// const Client = require("../models/Client");
// const Worker = require("../models/Worker");

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
// });

// const multiUpload = upload.fields([
//   { name: "profilePicture", maxCount: 1 },
//   { name: "portfolio", maxCount: 5 },
//   { name: "certificates", maxCount: 5 },
//   { name: "idPicture", maxCount: 1 },
//   { name: "selfiePicture", maxCount: 1 },
// ]);

// const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
// const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// // Profile upload route using chunked upload
// router.post(
//   "/upload-profile",
//   authLimiter,
//   verifyToken,
//   multiUpload,
//   async (req, res) => {
//     try {
//       const user = req.user;
//       const userId = user.id;
//       const userType = user.userType;

//       // Check if profilePicture is uploaded
//       if (!req.files?.profilePicture || req.files.profilePicture.length === 0) {
//         return res
//           .status(400)
//           .json({ success: false, message: "No profile picture uploaded." });
//       }

//       // Enforce single file
//       if (req.files.profilePicture.length > 1) {
//         return res.status(400).json({
//           success: false,
//           message: "Only one profile picture is allowed.",
//         });
//       }

//       const file = req.files.profilePicture[0];

//       // Validate file size
//       if (file.size > MAX_FILE_SIZE) {
//         return res
//           .status(400)
//           .json({ success: false, message: "File size exceeds 5MB limit." });
//       }

//       // Validate MIME type
//       if (!allowedMimeTypes.includes(file.mimetype)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid file type. Only JPG, PNG, and WEBP are allowed.",
//         });
//       }

//       // Generate SHA-256 hash of the file to check for duplicates
//       const fileHash = crypto
//         .createHash("sha256")
//         .update(file.buffer)
//         .digest("hex");

//       let existingProfile;

//       if (userType === "client") {
//         existingProfile = await Client.findOne({ credentialId: userId });
//       } else if (userType === "worker") {
//         existingProfile = await Worker.findOne({ credentialId: userId });
//       }

//       // If profile exists, delete the old Cloudinary image
//       const oldPublicId = existingProfile?.profilePicture?.public_id;
//       if (oldPublicId) {
//         await cloudinary.uploader.destroy(oldPublicId, { invalidate: true });
//       }

//       // Prepare the Cloudinary upload options
//       const options = {
//         folder: "fixit/profilePictures",
//         chunk_size: 5 * 1024 * 1024,
//         resource_type: "image",
//         format: "webp", // Convert to webp for consistency & performance
//         overwrite: true, // Always overwrite if the same public_id is reused
//         transformation: [
//           { width: 500, height: 500, crop: "fill", gravity: "auto" }, // Enforce image dimension
//         ],
//       };

//       // Upload the file to Cloudinary
//       const upload_stream = cloudinary.uploader.upload_stream(
//         options,
//         async (error, result) => {
//           if (error) {
//             console.error("Cloudinary Upload Error:", error);
//             return res
//               .status(500)
//               .json({ success: false, message: "Failed to upload image." });
//           }

//           const updateData = {
//             profilePicture: {
//               url: result.secure_url,
//               public_id: result.public_id,
//             },
//             profilePictureHash: fileHash, // Optional: store hash in DB to track duplicates
//           };

//           // Update the user profile in DB based on userType
//           let updatedProfile;
//           if (userType === "client") {
//             updatedProfile = await Client.findOneAndUpdate(
//               { credentialId: userId },
//               updateData,
//               { new: true }
//             );
//           } else if (userType === "worker") {
//             updatedProfile = await Worker.findOneAndUpdate(
//               { credentialId: userId },
//               updateData,
//               { new: true }
//             );
//           } else {
//             return res.status(403).json({
//               success: false,
//               message: "Unauthorized access.",
//             });
//           }

//           if (!updatedProfile) {
//             return res.status(404).json({
//               success: false,
//               message: "User profile not found.",
//             });
//           }

//           res.status(200).json({
//             success: true,
//             message: "Profile picture updated successfully.",
//             data: updatedProfile.profilePicture,
//           });
//         }
//       );

//       // Pipe the file buffer to Cloudinary upload stream
//       streamifier.createReadStream(file.buffer).pipe(upload_stream);
//     } catch (err) {
//       console.error("Server Error:", err);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error. Please try again later.",
//       });
//     }
//   }
// );

// //Verify id and selfie route
// router.post(
//   "/verify-id",
//   authLimiter,
//   verifyToken,
//   multiUpload,
//   async (req, res) => {
//     try {
//       const user = req.user; // Get user from the token
//       const userId = user.id;
//       const userType = user.userType;

//       // Check if both idPicture and selfiePicture are provided
//       if (!req.files?.idPicture || !req.files?.selfiePicture) {
//         return res.status(400).json({
//           success: false,
//           message: "Both ID picture and selfie picture are required.",
//         });
//       }

//       const idPictureFile = req.files.idPicture[0]; // Get the ID picture file
//       const selfiePictureFile = req.files.selfiePicture[0]; // Get the selfie picture file

//       // Validate file sizes and MIME types
//       if (
//         idPictureFile.size > MAX_FILE_SIZE ||
//         selfiePictureFile.size > MAX_FILE_SIZE
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "File size exceeds 5MB limit.",
//         });
//       }

//       if (
//         !allowedMimeTypes.includes(idPictureFile.mimetype) ||
//         !allowedMimeTypes.includes(selfiePictureFile.mimetype)
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid file type. Only JPG, PNG, and WEBP are allowed.",
//         });
//       }

//       // Function to generate a file hash (SHA-256)
//       const generateFileHash = (fileBuffer) => {
//         return crypto.createHash("sha256").update(fileBuffer).digest("hex");
//       };

//       // Generate file hashes for both images
//       const idPictureHash = generateFileHash(idPictureFile.buffer);
//       const selfiePictureHash = generateFileHash(selfiePictureFile.buffer);

//       // Function to upload a file to Cloudinary and return the result
//       const uploadToCloudinary = (file, folder) => {
//         return new Promise((resolve, reject) => {
//           const uploadStream = cloudinary.uploader.upload_stream(
//             { folder },
//             (error, result) => {
//               if (error) reject(error);
//               else resolve(result);
//             }
//           );
//           streamifier.createReadStream(file.buffer).pipe(uploadStream);
//         });
//       };

//       let existingCredential;
//       if (userType === "client") {
//         existingCredential = await Credential.findOne({
//           _id: userId,
//           userType: "client",
//         });
//       } else if (userType === "worker") {
//         existingCredential = await Credential.findOne({
//           _id: userId,
//           userType: "worker",
//         });
//       }

//       // If previous ID picture exists, delete it
//       const oldIdPicturePublicId = existingCredential?.idPicture?.public_id;
//       if (oldIdPicturePublicId) {
//         await cloudinary.uploader.destroy(oldIdPicturePublicId, {
//           invalidate: true,
//         });
//       }

//       // If previous selfie picture exists, delete it
//       const oldSelfiePicturePublicId =
//         existingCredential?.selfiePicture?.public_id;
//       if (oldSelfiePicturePublicId) {
//         await cloudinary.uploader.destroy(oldSelfiePicturePublicId, {
//           invalidate: true,
//         });
//       }

//       // Upload both images to Cloudinary
//       const [idPictureResult, selfiePictureResult] = await Promise.all([
//         uploadToCloudinary(idPictureFile, "fixit/idPictures"),
//         uploadToCloudinary(selfiePictureFile, "fixit/selfiePictures"),
//       ]);

//       // Prepare update data
//       const updateData = {
//         idPicture: {
//           url: idPictureResult.secure_url,
//           public_id: idPictureResult.public_id,
//           hash: idPictureHash, // Store the hash for future duplicate checks
//         },
//         selfiePicture: {
//           url: selfiePictureResult.secure_url,
//           public_id: selfiePictureResult.public_id,
//           hash: selfiePictureHash, // Store the hash for future duplicate checks
//         },
//       };

//       // Update the credential data
//       const updatedCredential = await Credential.findOneAndUpdate(
//         { _id: userId, userType: userType },
//         updateData,
//         { new: true }
//       );

//       // Respond with success message
//       res.status(200).json({
//         success: true,
//         message:
//           "ID and selfie pictures uploaded successfully for verification.",
//         data: updatedCredential,
//       });
//     } catch (err) {
//       console.error("Server Error:", err);
//       res.status(500).json({
//         success: false,
//         message: "Internal server error. Please try again later.",
//       });
//     }
//   }
// );

// // Create portfolio route for workers
// router.post(
//   "/create-portfolio",
//   authLimiter,
//   verifyToken,
//   multiUpload,
//   async (req, res) => {
//     try {
//       const user = req.user;
//       const userId = user.id;
//       const userType = user.userType;

//       if (userType !== "worker") {
//         return res.status(403).json({
//           success: false,
//           message: "Only workers can create portfolios.",
//         });
//       }

//       const {
//         biography,
//         skillsByCategory,
//         experience,
//         portfolio,
//         certificates,
//       } = req.body;

//       if (!skillsByCategory || skillsByCategory.length === 0) {
//         return res.status(400).json({
//           success: false,
//           message: "At least one skill must be provided.",
//         });
//       }
//       let parsedSkillsByCategory = [];
//       try {
//         parsedSkillsByCategory =
//           typeof skillsByCategory === "string"
//             ? JSON.parse(skillsByCategory)
//             : skillsByCategory;
//       } catch (err) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid JSON format for skillsByCategory.",
//         });
//       }

//       if (
//         !Array.isArray(parsedSkillsByCategory) ||
//         parsedSkillsByCategory.length === 0
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "At least one skill category with skills must be provided.",
//         });
//       }

//       // Fetch current worker data
//       const worker = await Worker.findOne({ credentialId: userId });
//       if (!worker) {
//         return res.status(404).json({
//           success: false,
//           message: "Worker not found.",
//         });
//       }

//       const existingPortfolio = worker.portfolio || [];
//       const existingCertificates = worker.certificates || [];

//       // Handle portfolio uploads
//       const portfolioItems = [...existingPortfolio];
//       if (req.files?.portfolio) {
//         const portfolioUploadPromises = req.files.portfolio.map(
//           (file, index) => {
//             // Sanitize user-provided metadata
//             const { projectTitle = "", description = "" } =
//               portfolio?.[index] || {};
//             const projectTitleSanitized = escape(mongoSanitize(projectTitle));
//             const descriptionSanitized = escape(mongoSanitize(description));
//             if (!allowedMimeTypes.includes(file.mimetype)) {
//               throw new Error(
//                 `Invalid file type for portfolio image #${index + 1}`
//               );
//             }
//             if (file.size > MAX_FILE_SIZE) {
//               throw new Error(
//                 `File size exceeds 5MB for portfolio image #${index + 1}`
//               );
//             }

//             return uploadToCloudinary(file, "fixit/portfolios").then(
//               (result) => {
//                 portfolioItems.push({
//                   projectTitle: projectTitleSanitized,
//                   description: descriptionSanitized,
//                   image: {
//                     url: result.secure_url,
//                     public_id: result.public_id,
//                   },
//                 });
//               }
//             );
//           }
//         );
//         await Promise.all(portfolioUploadPromises);
//       }

//       // Handle certificate uploads (limit to 5 total)
//       const certificateItems = [...existingCertificates];
//       if (req.files?.certificates) {
//         const totalCertificates =
//           certificateItems.length + req.files.certificates.length;
//         if (totalCertificates > 5) {
//           return res.status(400).json({
//             success: false,
//             message: `You can only have a maximum of 5 certificates. You currently have ${certificateItems.length}.`,
//           });
//         }

//         const certUploadPromises = req.files.certificates.map((file, index) => {
//           if (!allowedMimeTypes.includes(file.mimetype)) {
//             throw new Error(
//               `Invalid file type for certificate image #${index + 1}`
//             );
//           }
//           if (file.size > MAX_FILE_SIZE) {
//             throw new Error(
//               `File size exceeds 5MB for certificate image #${index + 1}`
//             );
//           }

//           return uploadToCloudinary(file, "fixit/certificates").then(
//             (result) => {
//               certificateItems.push({
//                 url: result.secure_url,
//                 public_id: result.public_id,
//               });
//             }
//           );
//         });
//         await Promise.all(certUploadPromises);
//       }

//       const update = {
//         biography: biography || "",
//         workerSkills: parsedSkillsByCategory,
//         experience: experience || [],
//         portfolio: portfolioItems,
//         certificates: certificateItems,
//       };

//       const updatedWorker = await Worker.findOneAndUpdate(
//         { credentialId: userId },
//         { $set: update },
//         { new: true }
//       );

//       if (!updatedWorker) {
//         return res.status(404).json({
//           success: false,
//           message: "Worker profile not found.",
//         });
//       }

//       return res.status(200).json({
//         success: true,
//         message: "Portfolio updated successfully.",
//         data: updatedWorker,
//       });
//     } catch (err) {
//       console.error("Error in /create-portfolio:", err.message);
//       return res.status(400).json({
//         success: false,
//         message:
//           err.message || "Internal server error. Please try again later.",
//       });
//     }
//   }
// );

// //delete-portfolio
// router.delete(
//   "/delete-portfolio-item/:itemId",
//   verifyToken,
//   async (req, res) => {
//     try {
//       const { itemId } = req.params;
//       const userId = req.user.id;

//       const worker = await Worker.findOne({ credentialId: userId });
//       if (!worker) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Worker not found." });
//       }

//       const itemToDelete = worker.portfolio.find(
//         (item) => item.image.public_id === itemId
//       );

//       if (!itemToDelete) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Portfolio item not found." });
//       }

//       // Remove from Cloudinary
//       await deleteFromCloudinary(itemToDelete.image.public_id);

//       // Remove from DB
//       worker.portfolio = worker.portfolio.filter(
//         (item) => item.image.public_id !== itemId
//       );
//       await worker.save();

//       res.status(200).json({
//         success: true,
//         message: "Portfolio item deleted successfully.",
//       });
//     } catch (err) {
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// );

// //delete-certificate
// router.delete(
//   "/delete-certificate/:certificateId",
//   verifyToken,
//   async (req, res) => {
//     try {
//       const { certificateId } = req.params;
//       const userId = req.user.id;

//       const worker = await Worker.findOne({ credentialId: userId });
//       if (!worker) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Worker not found." });
//       }

//       const certToDelete = worker.certificates.find(
//         (cert) => cert.public_id === certificateId
//       );

//       if (!certToDelete) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Certificate not found." });
//       }

//       // Remove from Cloudinary
//       await deleteFromCloudinary(certToDelete.public_id);

//       // Remove from DB
//       worker.certificates = worker.certificates.filter(
//         (cert) => cert.public_id !== certificateId
//       );
//       await worker.save();

//       res
//         .status(200)
//         .json({ success: true, message: "Certificate deleted successfully." });
//     } catch (err) {
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// );

// // Cloudinary helpers
// const uploadToCloudinary = (file, folder) => {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       { folder },
//       (error, result) => {
//         if (error) reject(error);
//         else resolve(result);
//       }
//     );
//     streamifier.createReadStream(file.buffer).pipe(uploadStream);
//   });
// };

// const deleteFromCloudinary = async (public_id) => {
//   try {
//     await cloudinary.uploader.destroy(public_id);
//   } catch (err) {
//     console.error("Cloudinary deletion error:", err.message);
//     throw err;
//   }
// };

// module.exports = router;
