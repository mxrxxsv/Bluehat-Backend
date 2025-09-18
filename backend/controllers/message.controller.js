// controllers/message.controller.js
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Client = require("../models/Client");
const Worker = require("../models/Worker");
const Joi = require("joi");
const mongoose = require("mongoose");
const { decryptAES128 } = require("../utils/encipher");

const createConversationSchema = Joi.object({
  participantCredentialId: Joi.string().required(), // the other user's credential id
  participantUserType: Joi.string().valid("client", "worker").required()
});

const sendMessageSchema = Joi.object({
  conversationId: Joi.string().optional().allow(""),
  toCredentialId: Joi.string().optional(),
  toUserType: Joi.string().optional(), // for creating conversation if needed
  content: Joi.string().allow("").optional(),
  type: Joi.string().valid("text", "image", "file").default("text")
});

// ================= GET CONVERSATIONS =================
exports.getConversations = async (req, res) => {
  try {
    const credentialId = req.user._id || req.user.id;
    const conversations = await Conversation.find({
      "participants.credentialId": credentialId
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: conversations });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};

// ================= GET MESSAGES =================
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation id" });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
    return res.status(200).json({ success: true, data: messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};

// ================= CREATE OR GET CONVERSATION =================
exports.createOrGetConversation = async (req, res) => {
  try {
    const { error, value } = createConversationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
        errors: error.details
      });
    }

    const myId = req.user._id || req.user.id;
    const otherId = value.participantCredentialId;

    // --- Determine proper order ---
    const participantsOrdered = myId.toString() < otherId.toString()
      ? [
        { credentialId: myId, userType: req.user.userType, profileId: req.user.profileId },
        { credentialId: otherId, userType: value.participantUserType }
      ]
      : [
        { credentialId: otherId, userType: value.participantUserType },
        { credentialId: myId, userType: req.user.userType, profileId: req.user.profileId }
      ];

    // ✅ Initialize unreadCounts with 0 for each participant
    const initialUnreadCounts = {};
    participantsOrdered.forEach(p => {
      initialUnreadCounts[p.credentialId.toString()] = 0;
    });

    // ✅ Find existing OR create new
    let conversation = await Conversation.findOneAndUpdate(
      {
        $and: [
          { participants: { $elemMatch: { credentialId: myId } } },
          { participants: { $elemMatch: { credentialId: otherId } } }
        ]
      },
      {
        $setOnInsert: {
          participants: participantsOrdered,
          lastMessage: "",
          lastSender: null,
          unreadCounts: initialUnreadCounts
        }
      },
      { new: true, upsert: true }
    );

    // ✅ Safety fallback (rare)
    if (!conversation) {
      conversation = await Conversation.create({
        participants: participantsOrdered,
        lastMessage: "",
        lastSender: null,
        unreadCounts: initialUnreadCounts
      });
    }

    return res.status(200).json({ success: true, data: conversation });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};


// ================= SEND MESSAGE =================
exports.sendMessage = async (req, res) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: "Invalid payload", errors: error.details });

    const senderCredentialId = req.user._id || req.user.id;
    const userType = req.user.userType;

    // find or create conversation
    let conversation;

    if (value.conversationId) {
      conversation = await Conversation.findById(value.conversationId);
      if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
    } else {
      if (!value.toCredentialId) return res.status(400).json({ success: false, message: "toCredentialId is required when conversationId is not provided" });

      conversation = await Conversation.findOne({
        $and: [
          { participants: { $elemMatch: { credentialId: senderCredentialId } } },
          { participants: { $elemMatch: { credentialId: value.toCredentialId } } }
        ]
      });



      if (!conversation) {
        conversation = await Conversation.create({
          participants: [
            { credentialId: senderCredentialId, userType },
            { credentialId: value.toCredentialId, userType: value.toUserType || "client" }
          ]
        });
      }
    }

    const message = await Message.create({
      conversationId: conversation._id,
      sender: { credentialId: senderCredentialId, userType },
      content: value.content || "",
      type: value.type || "text",
      edited: false,   
      deleted: false   
    });


    // Update conversation lastMessage + unread counts
    conversation.lastMessage = value.content || (value.type === "text" ? "" : `[${value.type}]`);
    conversation.lastSender = senderCredentialId;

    conversation.participants.forEach((p) => {
      const idStr = p.credentialId.toString();
      if (idStr !== String(senderCredentialId)) {
        conversation.unreadCounts.set(idStr, (conversation.unreadCounts.get(idStr) || 0) + 1);
      }
    });

    await conversation.save();

    return res.status(201).json({ success: true, data: { message, conversation } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};

// ================= GET USER INFO =================
exports.getUserInfo = async (req, res) => {
  try {
    const { credentialId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(credentialId)) {
      return res.status(400).json({ success: false, message: "Invalid credential ID" });
    }

    // Try fetching Client first
    let user = await Client.findOne({ credentialId }).lean();
    let userType = "client";

    // If not a client, check Worker
    if (!user) {
      user = await Worker.findOne({ credentialId }).lean();
      userType = "worker";
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // DECRYPT sensitive fields if needed
    if (user.firstName) user.firstName = decryptAES128(user.firstName);
    if (user.lastName) user.lastName = decryptAES128(user.lastName);
    if (user.middleName) user.middleName = decryptAES128(user.middleName);
    if (user.suffixName) user.suffixName = decryptAES128(user.suffixName);

    // Build full name
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    // Return only needed info
    const responseUser = {
      _id: user._id,
      fullName,
      profilePicture: user.profilePicture || null,
      credentialId: user.credentialId,
      userType,
    };

    return res.status(200).json({
      success: true,
      data: {
        user: responseUser,
        userType,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// ================= UPDATE MESSAGE =================
exports.updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    // Only sender can edit
    if (message.sender.credentialId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this message" });
    }

    // Only text messages can be updated
    if (message.type !== "text") {
      return res.status(400).json({ success: false, message: "Only text messages can be edited" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content required" });
    }

    // Update message
    message.content = content;
    message.edited = true; // mark as edited
    await message.save();

    // Update conversation lastMessage if this message was the last one
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation && conversation.lastSender.toString() === userId.toString()) {
      conversation.lastMessage = content;
      await conversation.save();
    }

    return res.status(200).json({ success: true, data: message });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ================= DELETE MESSAGE (Soft Delete) =================
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    // Only sender can delete
    if (message.sender.credentialId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this message" });
    }

    // Soft delete
    message.content = "[Message deleted]";
    message.deleted = true;
    await message.save();

    // Update conversation lastMessage if this message was the last one
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation && conversation.lastSender.toString() === userId.toString()) {
      const lastMsg = await Message.findOne({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .lean();
      conversation.lastMessage = lastMsg ? lastMsg.content : "";
      conversation.lastSender = lastMsg ? lastMsg.sender.credentialId : null;
      await conversation.save();
    }

    return res.status(200).json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
