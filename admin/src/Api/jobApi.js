import axios from "axios";
import API_CONFIG from "../config/api.js";

const api = axios.create({
  baseURL: API_CONFIG.getApiUrl("jobs"),
  ...API_CONFIG.axiosConfig,
});

// ✅ Fetch all jobs
export const getAllJobs = (params = {}) => api.get("/", { params });

// ✅ Delete a job (soft delete)
export const deleteJob = (id) => api.delete(`/${id}`);
