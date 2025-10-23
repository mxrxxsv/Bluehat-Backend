import axios from "axios";
import API_CONFIG from "../config/api.js";

const api = axios.create({
  baseURL: API_CONFIG.getApiUrl("jobs"),
  ...API_CONFIG.axiosConfig,
});

// ✅ Fetch all pending jobs
export const getPendingJobs = () => api.get("/admin/pending");

// ✅ Approve (verify) a job
export const approveJob = (id) => api.patch(`/${id}/verify`);

// ✅ Reject a job
export const rejectJob = (id) => api.patch(`/${id}/reject`);
