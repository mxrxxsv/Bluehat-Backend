const mongoose = require("mongoose");

/**
 * Ensures reviews collection indexes are correct for allowing one review per party per contract.
 * - Drops any legacy unique index on { contractId: 1 }
 * - Ensures a compound unique index on { contractId: 1, reviewerType: 1 }
 */
module.exports = async function ensureReviewIndexes() {
  const conn = mongoose.connection;
  if (!conn || !conn.db) {
    throw new Error("No active mongoose connection");
  }

  const coll = conn.collection("reviews");
  const indexes = await coll.indexes();

  // Drop legacy unique index if present
  const legacyUnique = indexes.find((i) => i.name === "contractId_1" && i.unique);
  if (legacyUnique) {
    try {
      await coll.dropIndex("contractId_1");
      console.log("🧹 Dropped legacy unique index contractId_1 on reviews");
    } catch (e) {
      // If it doesn't exist or cannot be dropped, surface a warning but continue
      console.warn("⚠️ Could not drop legacy index contractId_1:", e.message);
    }
  }

  // Ensure compound unique index exists
  try {
    await coll.createIndex({ contractId: 1, reviewerType: 1 }, {
      unique: true,
      name: "contractId_1_reviewerType_1",
      background: true,
    });
    console.log("✅ Ensured compound unique index on { contractId, reviewerType }");
  } catch (e) {
    console.warn("⚠️ Could not ensure compound index:", e.message);
  }
};
