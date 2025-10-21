import axios from "axios";

const verificationApi = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/id-verification/admin",
  withCredentials: true,
});

verificationApi.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getPendingVerifications = () => verificationApi.get("/pending");

export const approveVerification = (userId, requireResubmission = false) =>
  verificationApi.post(`/approve/${userId}`, { requireResubmission });

export const rejectVerification = (userId, reason, requireResubmission = true) =>
  verificationApi.post(`/reject/${userId}`, { reason, requireResubmission });

export default verificationApi;
