import axios from "axios";

const API = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/messages",
  withCredentials: true, // send cookies for authentication
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ================= CONVERSATION =================
export const getConversations = () => API.get("/conversations");
export const createOrGetConversation = (data) => API.post("/conversations", data);

// ================= MESSAGES =================
export const getMessages = (conversationId) => API.get(`/conversation/${conversationId}/messages`);
export const sendMessageREST = (data) => API.post("/messages", data);

// Update message
export const updateMessageREST = (messageId, data) => API.put(`/message/${messageId}`, data);

// Delete message
export const deleteMessageREST = (messageId) => API.delete(`/message/${messageId}`);

// ================= USER INFO =================
export const getUserInfo = (credentialId) => API.get(`/user/info/${credentialId}`);
