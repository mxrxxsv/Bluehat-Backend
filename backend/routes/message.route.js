const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/verifyToken");
const {
  getConversations,
  getMessages,
  createOrGetConversation,
  sendMessage,
  getUserInfo 
} = require("../controllers/message.controller");

router.get("/conversations", authenticateToken, getConversations);
router.post("/conversations", authenticateToken, createOrGetConversation);

router.get("/conversation/:conversationId/messages", authenticateToken, getMessages);
router.post("/messages", authenticateToken, sendMessage);

router.get("/user/info/:credentialId", authenticateToken, getUserInfo);

module.exports = router;
