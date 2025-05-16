const rateLimit = require("express-rate-limit");

// General purpose (e.g., for login/signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    return email || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    console.warn(
      `[RateLimit][authLimiter] Limit hit for ${
        email || req.ip
      } at ${new Date().toISOString()}`
    );
    return res.status(429).json({
      success: false,
      message: "Too many requests. Try again later.",
    });
  },
});

// Stricter limiter for /verify
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    return email || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    console.warn(
      `[RateLimit][verifyLimiter] Limit hit for ${
        email || req.ip
      } at ${new Date().toISOString()}`
    );
    return res.status(429).json({
      success: false,
      message: "Too many verification attempts. Please try again later.",
    });
  },
});

module.exports = { authLimiter, verifyLimiter };
