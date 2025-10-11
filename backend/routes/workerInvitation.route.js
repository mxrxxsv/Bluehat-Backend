const express = require("express");
const router = express.Router();

// Middleware
const verifyToken = require("../middleware/verifyToken");
const {
  verifyWorker,
  verifyClient,
  verifyClientOrWorker,
} = require("../middleware/verifyHiring");
const {
  invitationLimiter,
  hiringLimiter,
} = require("../middleware/hiringRateLimit");

// Controllers
const {
  inviteWorker,
  respondToInvitation,
  getClientInvitations,
  getWorkerInvitations,
  cancelInvitation,
  startInvitationDiscussion,
  markInvitationAgreement,
} = require("../controllers/workerInvitation.controller");

// ==================== INVITATION ROUTES ====================

// Client invites worker
router.post(
  "/workers/:workerId/invite",
  invitationLimiter,
  verifyToken,
  verifyClient,
  inviteWorker
);

// Worker responds to invitation (accept/reject)
router.patch(
  "/:id/respond",
  hiringLimiter,
  verifyToken,
  verifyWorker,
  respondToInvitation
);

// Client cancels invitation
router.patch(
  "/:id/cancel",
  hiringLimiter,
  verifyToken,
  verifyClient,
  cancelInvitation
);

// Get invitations sent by client
router.get(
  "/client/sent",
  hiringLimiter,
  verifyToken,
  verifyClient,
  getClientInvitations
);

// Get invitations received by worker
router.get(
  "/worker/received",
  hiringLimiter,
  verifyToken,
  verifyWorker,
  getWorkerInvitations
);

// ==================== NEW AGREEMENT FLOW ROUTES ====================

// Start discussion phase for invitation (worker only)
router.patch(
  "/:id/start-discussion",
  hiringLimiter,
  verifyToken,
  verifyWorker,
  startInvitationDiscussion
);

// Mark agreement status (both client and worker)
router.patch(
  "/:id/agreement",
  hiringLimiter,
  verifyToken,
  verifyClientOrWorker,
  markInvitationAgreement
);

module.exports = router;
