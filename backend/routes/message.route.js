const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/verifyToken");
const {
  getConversations,
  getMessages,
  createOrGetConversation,
  sendMessage,
  updateMessage,      
  deleteMessage,     
  getUserInfo 
} = require("../controllers/message.controller");

// ================= CONVERSATIONS =================
router.get("/conversations", authenticateToken, getConversations);
router.post("/conversations", authenticateToken, createOrGetConversation);

// ================= MESSAGES =================
router.get("/conversation/:conversationId/messages", authenticateToken, getMessages);
router.post("/messages", authenticateToken, sendMessage);

// Update message
router.put("/message/:messageId", authenticateToken, updateMessage);

// Delete message
router.delete("/message/:messageId", authenticateToken, deleteMessage);

// ================= USER INFO =================
router.get("/user/info/:credentialId", authenticateToken, getUserInfo);

module.exports = router;
