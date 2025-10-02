const cron = require("node-cron");
const WorkerInvitation = require("../models/WorkerInvitation");
const logger = require("./logger");

// Run cleanup every hour
const scheduleInvitationCleanup = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const result = await WorkerInvitation.cleanupExpired();
      if (result.modifiedCount > 0) {
        logger.info("Invitation cleanup completed", {
          expiredInvitations: result.modifiedCount,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("Invitation cleanup failed", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  });
};

module.exports = { scheduleInvitationCleanup };
