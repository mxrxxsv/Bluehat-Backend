const JobApplication = require("../models/JobApplication");
const logger = require("./logger");

// Debug function to check application status
const checkApplicationStatus = async (applicationId) => {
  try {
    const application = await JobApplication.findById(applicationId).populate([
      {
        path: "jobId",
        select: "title description",
      },
      {
        path: "workerId",
        select: "firstName lastName",
      },
      {
        path: "clientId",
        select: "firstName lastName",
      },
    ]);

    if (!application) {
      logger.error("Application not found", { applicationId });
      return null;
    }

    logger.info("Application debug info", {
      applicationId,
      status: application.applicationStatus,
      clientId: application.clientId._id,
      workerId: application.workerId._id,
      jobTitle: application.jobId.title,
      clientAgreed: application.clientAgreed,
      workerAgreed: application.workerAgreed,
      discussionStartedAt: application.discussionStartedAt,
      isDeleted: application.isDeleted,
    });

    return application;
  } catch (error) {
    logger.error("Debug application failed", {
      error: error.message,
      applicationId,
    });
    return null;
  }
};

module.exports = {
  checkApplicationStatus,
};
