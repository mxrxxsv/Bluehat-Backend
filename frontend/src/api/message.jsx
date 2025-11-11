import axios from "axios";
import { baseURL } from "../utils/appMode.js";
const API = axios.create({
  baseURL: baseURL + "/messages",
  withCredentials: true, 
});

export const getConversations = () => API.get("/conversations");
export const createOrGetConversation = (data) =>
  API.post("/conversations", data);

export const getMessages = (conversationId) =>
  API.get(`/conversation/${conversationId}/messages`);
export const sendMessageREST = (data) => API.post("/messages", data);

export const updateMessageREST = (messageId, data) =>
  API.put(`/message/${messageId}`, data);

export const deleteMessageREST = (messageId) =>
  API.delete(`/message/${messageId}`);

export const getUserInfo = (credentialId) =>
  API.get(`/user/info/${credentialId}`);
