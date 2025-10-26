const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    // Contract reference - now required for better tracking
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkContract",
      required: true,
    },

    // Original fields
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    // Review details
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
      minlength: [5, "Feedback must be at least 5 characters"],
      maxlength: [1000, "Feedback cannot exceed 1000 characters"],
    },

    // Who gave the review and who received it
    reviewerType: {
      type: String,
      enum: ["client", "worker"],
      required: true,
      index: true,
    },
    revieweeType: {
      type: String,
      enum: ["client", "worker"],
      required: true,
      index: true,
    },

    // Reviewer and reviewee references
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "reviewerModel",
      index: true,
    },
    reviewerModel: {
      type: String,
      required: true,
      enum: ["Client", "Worker"],
    },
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "revieweeModel",
      index: true,
    },
    revieweeModel: {
      type: String,
      required: true,
      enum: ["Client", "Worker"],
    },

    // Timestamps
    reviewDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Soft delete support
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== INDEXES ====================
// Allow one review per party per contract (client can review once, worker can review once)
ReviewSchema.index({ contractId: 1, reviewerType: 1 }, { unique: true });
ReviewSchema.index({ workerId: 1, rating: 1 });
ReviewSchema.index({ clientId: 1, rating: 1 }); // One review per contract
ReviewSchema.index({ reviewerId: 1, reviewerType: 1 });
ReviewSchema.index({ revieweeId: 1, revieweeType: 1 });
ReviewSchema.index({ reviewDate: -1 });
ReviewSchema.index({ isDeleted: 1, reviewDate: -1 });

// ==================== MIDDLEWARE ====================

// Calculate and update average ratings after review operations
ReviewSchema.post("save", async function (doc) {
  await updateAverageRatings(doc);
});

ReviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    await updateAverageRatings(doc);
  }
});

ReviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await updateAverageRatings(doc);
  }
});

// Helper function to update average ratings
async function updateAverageRatings(review) {
  try {
    const Worker = mongoose.model("Worker");
    const Client = mongoose.model("Client");
    const Review = mongoose.model("Review");
    const WorkContract = mongoose.model("WorkContract");

    // Update worker's average rating
    if (review.workerId) {
      const workerStats = await Review.aggregate([
        {
          $match: {
            workerId: review.workerId,
            revieweeType: "worker",
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      const workerRating =
        workerStats.length > 0
          ? Math.round(workerStats[0].averageRating * 100) / 100
          : 0;
      // Use completed contracts as the source of truth for jobs completed
      const completedCount = await WorkContract.countDocuments({
        workerId: review.workerId,
        contractStatus: "completed",
        isDeleted: false,
      });

      await Worker.findByIdAndUpdate(review.workerId, {
        averageRating: workerRating,
        totalJobsCompleted: completedCount,
      });
    }

    // Update client's average rating
    if (review.clientId) {
      const clientStats = await Review.aggregate([
        {
          $match: {
            clientId: review.clientId,
            revieweeType: "client",
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      const clientRating =
        clientStats.length > 0
          ? Math.round(clientStats[0].averageRating * 100) / 100
          : 0;

      await Client.findByIdAndUpdate(review.clientId, {
        averageRating: clientRating,
        totalJobsPosted:
          clientStats.length > 0 ? clientStats[0].totalReviews : 0,
      });
    }
  } catch (error) {
    console.error("Error updating average ratings:", error);
  }
}

// ==================== STATIC METHODS ====================

// Get reviews for a worker
ReviewSchema.statics.getWorkerReviews = function (workerId, options = {}) {
  const { page = 1, limit = 10, includeDeleted = false } = options;

  const filter = {
    workerId: new mongoose.Types.ObjectId(workerId),
    revieweeType: "worker",
  };

  if (!includeDeleted) {
    filter.isDeleted = false;
  }

  return this.find(filter)
    .populate("reviewerId", "firstName lastName profilePicture")
    .populate("jobId", "title description")
    .sort({ reviewDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

// Get reviews for a client
ReviewSchema.statics.getClientReviews = function (clientId, options = {}) {
  const { page = 1, limit = 10, includeDeleted = false } = options;

  const filter = {
    clientId: new mongoose.Types.ObjectId(clientId),
    revieweeType: "client",
  };

  if (!includeDeleted) {
    filter.isDeleted = false;
  }

  return this.find(filter)
    .populate("reviewerId", "firstName lastName profilePicture")
    .populate("jobId", "title description")
    .sort({ reviewDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

// Get rating statistics
ReviewSchema.statics.getRatingStats = async function (targetId, targetType) {
  const filter = {
    [`${targetType}Id`]: new mongoose.Types.ObjectId(targetId),
    revieweeType: targetType,
    isDeleted: false,
  };

  const stats = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: "$rating",
        },
      },
    },
    {
      $addFields: {
        ratingBreakdown: {
          1: {
            $size: {
              $filter: {
                input: "$ratingDistribution",
                cond: { $eq: ["$$this", 1] },
              },
            },
          },
          2: {
            $size: {
              $filter: {
                input: "$ratingDistribution",
                cond: { $eq: ["$$this", 2] },
              },
            },
          },
          3: {
            $size: {
              $filter: {
                input: "$ratingDistribution",
                cond: { $eq: ["$$this", 3] },
              },
            },
          },
          4: {
            $size: {
              $filter: {
                input: "$ratingDistribution",
                cond: { $eq: ["$$this", 4] },
              },
            },
          },
          5: {
            $size: {
              $filter: {
                input: "$ratingDistribution",
                cond: { $eq: ["$$this", 5] },
              },
            },
          },
        },
      },
    },
  ]);

  return stats.length > 0
    ? stats[0]
    : {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
};

module.exports = mongoose.model("Review", ReviewSchema);

// Attempt to self-heal indexes at runtime: drop old unique index on contractId if present
// and ensure the new compound unique index exists. Runs best-effort and silently fails on production.
try {
  // Defer until connection is (likely) ready
  setTimeout(async () => {
    try {
      const conn = mongoose.connection;
      if (!conn || !conn.db) return;
      const coll = conn.collection("reviews");
      const indexes = await coll.indexes();
      const bad = indexes.find(
        (i) => i.name === "contractId_1" && i.unique === true
      );
      if (bad) {
        try {
          await coll.dropIndex("contractId_1");
        } catch (_) {}
      }
      // Ensure compound unique index
      await coll.createIndex({ contractId: 1, reviewerType: 1 }, { unique: true });
    } catch (_) {}
  }, 0);
} catch (_) {}
