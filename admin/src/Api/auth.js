import axios from "axios";
import API_CONFIG from "../config/api.js";

// ✅ Axios instance with environment-aware URL
const auth = axios.create({
  baseURL: API_CONFIG.getApiUrl("admin"),
  ...API_CONFIG.axiosConfig,
});

// ===== API FUNCTIONS =====

// Signup
export const signup = (data) => auth.post("/signup", data);

// Login
export const login = (data) => auth.post("/login", data);

// Logout
export const logout = () => auth.post("/logout");

// Check authentication
export const checkAuth = () => auth.get("/check-auth");

// Get profile
export const getProfile = () => auth.get("/profile");

export default auth;
