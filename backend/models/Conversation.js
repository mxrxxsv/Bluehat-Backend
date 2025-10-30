const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        credentialId: { type: mongoose.Schema.Types.ObjectId, ref: "Credential", required: true }
      }
    ],
    lastMessage: { type: String, default: null },
    lastSender: { type: mongoose.Schema.Types.ObjectId, ref: "Credential", default: null },
    unreadCounts: {
      // store unread counts by credentialId as string keys if helpful
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", ConversationSchema);
