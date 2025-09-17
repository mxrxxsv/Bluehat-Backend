const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: {
      credentialId: { type: mongoose.Schema.Types.ObjectId, ref: "Credential", required: true },
      userType: { type: String, enum: ["client", "worker"], required: true }
    },
    content: { type: String, default: "" },
    type: { type: String, enum: ["text", "image", "file"], default: "text" },
    media: {
      url: String,
      public_id: String
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Credential" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
