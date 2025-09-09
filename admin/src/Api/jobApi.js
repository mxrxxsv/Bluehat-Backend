import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/jobs", 
  withCredentials: true, 
});

// ✅ Fetch all pending jobs
export const getPendingJobs = () => api.get("/admin/pending");

// ✅ Approve (verify) a job
export const approveJob = (id) => api.patch(`/${id}/verify`);

// ✅ Reject a job
export const rejectJob = (id) => api.patch(`/${id}/reject`);
