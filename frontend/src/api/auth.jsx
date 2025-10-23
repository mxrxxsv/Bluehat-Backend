import axios from "axios";

const API = axios.create({
    baseURL: "https://fixit-capstone.onrender.com/ver",
    withCredentials: true,
});

// Attach Authorization header from localStorage token (fallback when cookies are blocked cross-site)
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const signup = (data) => API.post("/signup", data);
export const verify = (data) => API.post("/verify", data);
export const resendEmailVerification = (data) => API.post("/resend-email-verification", data);
export const login = async (data) => {
    const res = await API.post("/login", data);
    // Persist token if provided so subsequent requests can use Authorization header
    if (res?.data?.token) {
        localStorage.setItem("token", res.data.token);
    }
    return res;
};
export const checkAuth = () => API.get("/check-auth");
export const Logout = () => API.post("/logout");
export const forgotPassword = (data) => API.post("/forgot-password", data);
export const resetPassword = (data) => API.post("/reset-password", data);
