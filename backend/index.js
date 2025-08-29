// index.js
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const connectDb = require("./db/connectDb");
const { authLimiter, verifyLimiter } = require("./utils/rateLimit");

const verRoute = require("./routes/ver.route");
const uploadRoute = require("./routes/upload.route");
const adminRoute = require("./routes/admin.route");
const adminTaskRoute = require("./routes/adminTask.route");
const adsRoute = require("./routes/advertisement.route");
const jobRoute = require("./routes/job.route");
const jobApplicationRoute = require("./routes/jobApplication.route");
const skillsRoute = require("./routes/skill.route");
const allowedOrigins = [process.env.CLIENT_URL];

const app = express();
const PORT = process.env.PORT || 5000;
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
// 1) Security headers
// Replace app.use(helmet()); with:
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
// 2) CORS — only allow your front-end origins
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 3) Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
// 4) Logging
app.use(morgan("combined"));

// 5) Rate limiting (apply globally)
app.use(authLimiter);

// 6) Health check
app.get("/healthz", (req, res) => res.sendStatus(200));

// 7) Routes
app.use("/ver", verRoute);
app.use("/admin", adminRoute);
app.use("/admin-tasks", adminTaskRoute);
app.use("/upload", uploadRoute);
app.use("/advertisement", adsRoute);
app.use("/jobs", jobRoute);
app.use("/job-applications", jobApplicationRoute);
app.use("/skills", skillsRoute);

// 8) 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

// 9) Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start after DB is connected
connectDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });

    // 10) Graceful shutdown
    const shutdown = () => {
      console.log("👋 Shutting down...");
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
      // force kill after 10s
      setTimeout(() => process.exit(1), 10000);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })
  .catch((err) => {
    console.error("❌ Failed to connect to DB:", err);
    process.exit(1);
  });
