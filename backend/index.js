// index.js
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const connectDb = require("./db/connectDb");
const { authLimiter } = require("./utils/rateLimit");
const { scheduleInvitationCleanup } = require("./utils/cleanupTasks");
const logger = require("./utils/logger");
const http = require("http");
const { Server } = require("socket.io");
const socketBus = require("./socket");

// Routes
const verRoute = require("./routes/ver.route");
const adminRoute = require("./routes/admin.route");
const adsRoute = require("./routes/advertisement.route");
const jobRoute = require("./routes/job.route");
const workerRoute = require("./routes/worker.route");
const skillsRoute = require("./routes/skill.route");
const profileRoute = require("./routes/profile.route");
const clientManagementRoute = require("./routes/clientManagement.route");
const workerManagementRoute = require("./routes/workerManagement.route");
const userIDVerificationRoute = require("./routes/userIDVerification.route");
const messageRoute = require("./routes/message.route");
const dashboardRoutes = require("./routes/dashboard.route");

// Hiring system routes
const applicationRoute = require("./routes/jobApplication.route");
const invitationRoute = require("./routes/workerInvitation.route");
const contractRoute = require("./routes/workContract.route");

// Build allowed CORS origins from env (supports comma-separated list)
const parseAllowedOrigins = () => {
  const list = [];
  const primary =
    process.env.NODE_ENV === "production"
      ? process.env.PRODUCTION_FRONTEND_URL
      : process.env.DEVELOPMENT_FRONTEND_URL;
    const sanitize = (s) => s.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
  if (primary) list.push(sanitize(primary));
  if (process.env.CORS_ALLOWED_ORIGINS) {
    process.env.CORS_ALLOWED_ORIGINS.split(",")
      .map(sanitize)
      .filter(Boolean)
      .forEach((o) => list.push(o));
  }
  // de-duplicate
  return Array.from(new Set(list));
};

const allowedOrigins = parseAllowedOrigins();
// In production, default to allowing *.onrender.com previews unless explicitly disabled
const allowRenderPreviews = String(
  process.env.ALLOW_RENDER_PREVIEWS ?? (process.env.NODE_ENV === "production" ? "true" : "false")
)
  .toLowerCase()
  .trim() === "true";
const logCorsRequests = String(process.env.LOG_CORS_REQUESTS || "false").toLowerCase() === "true";
const enableCorsDebugRoute = String(process.env.DEBUG_CORS || "false").toLowerCase() === "true";

// Support wildcard patterns in CORS_ALLOWED_ORIGINS such as "https://*.onrender.com" or "*.onrender.com"
const buildWildcardRegex = (pattern) => {
  const p = pattern.trim();
  const hasScheme = /^https?:\/\//i.test(p);
  if (hasScheme) {
    // e.g., https://*.onrender.com
    const escaped = p
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\*\\\./g, "([^.]+\\.)+");
    return new RegExp(`^${escaped}$`, "i");
  } else {
    // e.g., *.onrender.com (host-only); allow http or https
    const escapedHost = p
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\*\\\./g, "([^.]+\\.)+");
    return new RegExp(`^https?:\/\/${escapedHost}$`, "i");
  }
};

const wildcardPatterns = allowedOrigins
  .filter((o) => o.includes("*"))
  .map(buildWildcardRegex);
const exactOrigins = allowedOrigins.filter((o) => !o.includes("*"));
const exactOriginsLc = exactOrigins.map((o) => o.toLowerCase());

// 1) App and security middleware
const app = express();
app.set("trust proxy", 1);

// Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
// HSTS in production
if (process.env.NODE_ENV === "production") {
  app.use(
    helmet.hsts({
      maxAge: 15552000, // 180 days
      includeSubDomains: true,
      preload: true,
    })
  );
}

// Port
const PORT = process.env.PORT || 3000;

// 2) CORS
// Optional: log incoming Origin headers before CORS check
if (logCorsRequests) {
  app.use((req, _res, next) => {
    const origin = req.headers.origin || "<none>";
    console.log(`➡️  Incoming request: ${req.method} ${req.path} | Origin: ${origin}`);
    next();
  });
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server or same-origin (no Origin header)
      if (!origin) return callback(null, true);
      const oLc = origin.toLowerCase();

      // Exact match list
      if (exactOriginsLc.includes(oLc)) return callback(null, true);

      // Wildcard patterns
      if (wildcardPatterns.some((rx) => rx.test(origin))) return callback(null, true);

      // Optional: allow any onrender.com preview/frontends if enabled
      if (allowRenderPreviews && /^https:\/\/.*\.onrender\.com$/i.test(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
  })
);

// Explicitly handle preflight for all routes
app.options("*", cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const oLc = origin.toLowerCase();
    if (exactOriginsLc.includes(oLc)) return callback(null, true);
    if (wildcardPatterns.some((rx) => rx.test(origin))) return callback(null, true);
    if (allowRenderPreviews && /^https:\/\/.*\.onrender\.com$/i.test(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
}));

// Log allowed origins on boot
console.log("🌐 CORS allowed origins (exact):", exactOrigins);
if (wildcardPatterns.length > 0) console.log("🌐 CORS wildcard patterns:", wildcardPatterns.map((r) => r.toString()));
if (allowRenderPreviews) console.log("🌐 CORS: ALLOW_RENDER_PREVIEWS enabled for *.onrender.com");

// Optional debug endpoint to inspect CORS evaluation (do NOT enable in production long-term)
if (enableCorsDebugRoute) {
  app.get("/debug/cors", (req, res) => {
    const origin = req.query.origin || req.headers.origin || "";
    const matchesList = allowedOrigins.includes(origin);
    const matchesRenderWildcard = /^https:\/\/.*\.onrender\.com$/.test(origin);
    res.json({
      origin,
      allowedOrigins,
      allowRenderPreviews,
      matchesList,
      matchesRenderWildcard,
      wouldAllow:
        (!origin) || matchesList || (allowRenderPreviews && matchesRenderWildcard),
      note: "Set DEBUG_CORS=false to disable this route in production",
    });
  });
}

// 3) Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());

// 4) Rate limiting
app.use(authLimiter);

// 5) Health check
app.get("/healthz", (req, res) => res.sendStatus(200));

// 6) Routes
app.use("/ver", verRoute);
app.use("/admin", adminRoute);
app.use("/advertisement", adsRoute);
app.use("/jobs", jobRoute);
app.use("/workers", workerRoute);
app.use("/skills", skillsRoute);
app.use("/profile", profileRoute);
app.use("/id-verification", userIDVerificationRoute);
app.use("/client-management", clientManagementRoute);
app.use("/worker-management", workerManagementRoute);
app.use("/messages", messageRoute);
app.use("/api/dashboard", dashboardRoutes);

// Hiring system routes
app.use("/applications", applicationRoute);
app.use("/invitations", invitationRoute);
app.use("/contracts", contractRoute);

// 7) 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

// 8) Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Create HTTP server
const server = http.createServer(app);

// =====================
// Socket.IO Setup
// =====================
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const oLc = origin.toLowerCase();
      if (exactOriginsLc.includes(oLc)) return callback(null, true);
      if (wildcardPatterns.some((rx) => rx.test(origin))) return callback(null, true);
      if (allowRenderPreviews && /^https:\/\/.*\.onrender\.com$/i.test(origin)) return callback(null, true);
      return callback("Not allowed by CORS (socket): " + origin);
    },
    credentials: true,
  },
});

// Make io available globally to controllers
app.set("io", io);
socketBus.init(io);

// Track online users: Map<credentialId, Set<socketId>>
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Register a credentialId for this socket (client must emit after login)
  socket.on("registerUser", (credentialId) => {
    if (!credentialId) return;
    const cred = String(credentialId);
    if (!userSockets.has(cred)) userSockets.set(cred, new Set());
    userSockets.get(cred).add(socket.id);
    socket.data.credentialId = cred;
    // Also join a personal room for user-targeted events
    const userRoom = `user:${cred}`;
    socket.join(userRoom);
    console.log(`✅ Registered user ${cred} on socket ${socket.id}`);
  });

  // Join a conversation room
  socket.on("joinConversation", (conversationId) => {
    if (!conversationId) return;
    const room = `conversation:${conversationId}`;
    socket.join(room);
    console.log(`📥 ${socket.id} joined room ${room}`);
  });

  // Optional: leave conversation
  socket.on("leaveConversation", (conversationId) => {
    if (!conversationId) return;
    const room = `conversation:${conversationId}`;
    socket.leave(room);
    console.log(`📤 ${socket.id} left room ${room}`);
  });

  // When client emits a sent message, broadcast it
  socket.on("sendMessage", (msg) => {
    try {
      const convId = msg.conversationId;
      if (!convId) return;

      const room = `conversation:${convId}`;
      console.log(`💬 Message in ${room}:`, msg);

      // Broadcast to everyone in the room except sender
      socket.to(room).emit("receiveMessage", msg);

      // Also send to recipient if they’re online but not currently in room
      const recipientCred = msg.toCredentialId
        ? String(msg.toCredentialId)
        : null;
      if (recipientCred && userSockets.has(recipientCred)) {
        userSockets.get(recipientCred).forEach((sockId) => {
          if (sockId !== socket.id) {
            io.to(sockId).emit("receiveMessage", msg);
          }
        });
      }
    } catch (err) {
      console.error("socket sendMessage error:", err);
    }
  });

  // Edit message
  socket.on("editMessage", (updatedMsg) => {
    try {
      const convId = updatedMsg.conversationId;
      if (!convId) return;
      const room = `conversation:${convId}`;
      console.log(`✏️ Edited message in ${room}:`, updatedMsg);

      // Broadcast to everyone in the room
      socket.to(room).emit("editMessage", updatedMsg);

      // Optional: also send to sender so the echo updates if needed
      socket.emit("editMessage", updatedMsg);
    } catch (err) {
      console.error("socket editMessage error:", err);
    }
  });

  // Delete message
  socket.on("deleteMessage", (deletedMsg) => {
    try {
      const convId = deletedMsg.conversationId;
      if (!convId) return;
      const room = `conversation:${convId}`;
      console.log(`🗑️ Deleted message in ${room}:`, deletedMsg);

      // Broadcast to everyone in the room
      socket.to(room).emit("deleteMessage", deletedMsg);

      // Optional: also send to sender so the UI updates immediately
      socket.emit("deleteMessage", deletedMsg);
    } catch (err) {
      console.error("socket deleteMessage error:", err);
    }
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    const cred = socket.data?.credentialId;
    if (cred && userSockets.has(cred)) {
      const set = userSockets.get(cred);
      set.delete(socket.id);
      if (set.size === 0) userSockets.delete(cred);
    }
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// =====================
// Start after DB connect
// =====================
connectDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);

      // Initialize cleanup tasks
      scheduleInvitationCleanup();
      console.log(
        "📧 Invitation cleanup scheduler initialized - runs every hour"
      );
      logger.info("Invitation cleanup scheduler started", {
        schedule: "every hour (0 * * * *)",
        timestamp: new Date().toISOString(),
      });
    });

    const shutdown = () => {
      console.log("👋 Shutting down...");
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
      io.close();
      setTimeout(() => process.exit(1), 10000);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })
  .catch((err) => {
    console.error("❌ Failed to connect to DB:", err);
    process.exit(1);
  });