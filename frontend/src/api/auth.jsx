import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/ver",
    withCredentials: true,
});

export const signup = (data) => API.post("/signup", data);
export const verify = (data) => API.post("/verify", data);
export const resendCode = (data) => API.post("/resend-code", data);
export const login = (data) => API.post("/login", data);
export const checkAuth = () => API.get("/check-auth");
export const Logout = () => API.post("/logout");
export const forgotPassword = (data) => API.post("/forgot-password", data);
export const resetPassword = (data) => API.post("/reset-password", data);
