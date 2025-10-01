import axios from "axios";

// Axios instance for verification API (admin routes)
const verificationApi = axios.create({
  baseURL: "http://localhost:5000/id-verification/admin",
  withCredentials: true, // optional: include cookies if needed
  // headers: {
  //   "Content-Type": "application/json",
  //   Authorization: `Bearer ${localStorage.getItem("token")}`, // automatically send token
  // },
});

// ===== Verification API FUNCTIONS =====

// Get all pending verifications
export const getPendingVerifications = () => verificationApi.get("/pending");

// Approve a user's verification
export const approveVerification = (userId, notes = "") =>
  verificationApi.post(`/approve/${userId}`, { notes });

// Reject a user's verification
export const rejectVerification = (userId, reason = "", requireResubmission = true) =>
  verificationApi.post(`/reject/${userId}`, { reason, requireResubmission });

export default verificationApi;
