import axios from "axios";
import { baseURL } from "../utils/appMode.js";
const API = axios.create({
  baseURL: baseURL + "/ver",
  withCredentials: true,
});

export const signup = (data) => API.post("/signup", data);
export const verify = (data) => API.post("/verify", data);
export const resendEmailVerification = (data) =>
  API.post("/resend-email-verification", data);
export const login = (data) => API.post("/login", data);
export const checkAuth = () => API.get("/check-auth");
export const Logout = () => API.post("/logout");
export const forgotPassword = (data) => API.post("/forgot-password", data);
export const resetPassword = (data) => API.post("/reset-password", data);
export const changePassword = (data) => API.post("/change-password", data);
