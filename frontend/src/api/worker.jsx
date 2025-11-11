import axios from "axios";
import { baseURL } from "../utils/appMode.js";
const API = axios.create({
  baseURL: baseURL + "/workers",
  withCredentials: true,
});

export const getWorkers = async (filters = {}) => {
  try {
    const response = await API.get("/", { params: filters });
    return response.data.data || { workers: [], pagination: {} };
  } catch (error) {
    console.error("Get workers failed:", error);
    throw new Error(error.response?.data?.message || "Failed to get workers");
  }
};

export const searchWorkers = getWorkers;

// Get worker by ID
export const getWorkerById = async (workerId) => {
  try {
    const response = await API.get(`/${workerId}`);
    return response.data.data.worker;
  } catch (error) {
    console.error("Get worker failed:", error);
    throw new Error(error.response?.data?.message || "Failed to get worker");
  }
};

// Update worker profile
export const updateWorkerProfile = async (workerId, profileData) => {
  try {
    const response = await API.put(`/${workerId}`, profileData);
    return response.data.worker;
  } catch (error) {
    console.error("Update worker profile failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update profile"
    );
  }
};

// Get worker dashboard data
export const getWorkerDashboard = async () => {
  try {
    const response = await API.get("/dashboard");
    return response.data;
  } catch (error) {
    console.error("Get worker dashboard failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to get dashboard data"
    );
  }
};

export default {
  getWorkers,
  searchWorkers,
  getWorkerById,
  updateWorkerProfile,
  getWorkerDashboard,
};
