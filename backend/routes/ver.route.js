const express = require("express");

const verifyCaptcha = require("../middleware/verifyCaptcha");
const verifyToken = require("../middleware/verifyToken");
const verifyVerifyToken = require("../middleware/verifyVerifyToken");

const { authLimiter, verifyLimiter } = require("../utils/rateLimit");

const {
  signup,
  verify,
  resendCode,
  login,
  checkAuth,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/worker.controller");
const router = express.Router();

router.post("/signup", authLimiter, signup);

//verify
router.post("/verify", verifyLimiter, verifyVerifyToken, verify);

// Resend code
router.post("/resend-code", verifyLimiter, resendCode);

// Login
router.post(
  "/login",
  authLimiter,
  login
  /*verifyCaptcha*/
);

// Check auth
router.get("/check-auth", verifyToken, checkAuth);

// Logout
router.post("/logout", verifyToken, logout);

//forgot password
router.post("/forgot-password", authLimiter, forgotPassword);

//reset password
router.post("/reset-password", authLimiter, resetPassword);
module.exports = router;
