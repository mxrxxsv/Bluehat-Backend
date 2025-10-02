const rateLimit = require("express-rate-limit");

// Rate limiting for job applications
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 applications per hour per IP
  message: {
    success: false,
    message: "Too many job applications. Please try again later.",
    code: "APPLICATION_RATE_LIMIT",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

// Rate limiting for worker invitations
const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 invitations per hour per client
  message: {
    success: false,
    message: "Too many worker invitations. Please try again later.",
    code: "INVITATION_RATE_LIMIT",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

// Rate limiting for contract actions
const contractActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 contract actions per 15 minutes
  message: {
    success: false,
    message: "Too many contract actions. Please try again later.",
    code: "CONTRACT_ACTION_RATE_LIMIT",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

// Rate limiting for feedback submission
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 feedback submissions per hour
  message: {
    success: false,
    message: "Too many feedback submissions. Please try again later.",
    code: "FEEDBACK_RATE_LIMIT",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

// General hiring operations limiter
const hiringLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes for general hiring operations
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "HIRING_RATE_LIMIT",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

module.exports = {
  applicationLimiter,
  invitationLimiter,
  contractActionLimiter,
  feedbackLimiter,
  hiringLimiter,
};
