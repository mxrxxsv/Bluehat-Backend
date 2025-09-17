import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/messages",
  withCredentials: true, // send cookies for authentication
});

// ================= CONVERSATION =================
export const getConversations = () => API.get("/conversations");
export const createOrGetConversation = (data) => API.post("/conversations", data);

// ================= MESSAGES =================
export const getMessages = (conversationId) => API.get(`/conversation/${conversationId}/messages`);
export const sendMessageREST = (data) => API.post("/messages", data);

// ================= USER INFO =================
export const getUserInfo = (credentialId) => API.get(`/user/info/${credentialId}`);
