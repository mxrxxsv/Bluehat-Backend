const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10, // limit each IP to 10 requests per window
  message: "Too many requests, please try again later",
});

module.exports = authLimiter;
