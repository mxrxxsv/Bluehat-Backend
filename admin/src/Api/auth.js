import axios from "axios";

// ✅ Axios instance configured for cookies
const auth = axios.create({
  // baseURL: "https://fixit-capstone.onrender.com/admin",
  baseURL: "http://localhost:5000/admin",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
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
