import axios from "axios";
import API_CONFIG from "../config/api.js";

const API = axios.create({
  baseURL: API_CONFIG.current.baseURL,
  ...API_CONFIG.axiosConfig,
});

// Add request interceptor for auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Get all workers with pagination and filters
export const getWorkers = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    // Add pagination parameters
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    // Add filter parameters (align with backend controller expectations)
    if (params.search) queryParams.append("search", params.search);

    // Blocked status filter: expected by backend as `blockedStatus`
    if (params.blockedStatus)
      queryParams.append("blockedStatus", params.blockedStatus);

    // Optional filters supported by backend
    if (params.accountStatus)
      queryParams.append("accountStatus", params.accountStatus);
    if (params.workStatus)
      queryParams.append("workStatus", params.workStatus);

    // Verification status filter
    if (params.verificationStatus)
      queryParams.append("verificationStatus", params.verificationStatus);

    // Sorting
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.order) queryParams.append("order", params.order);

    console.log("API Request params:", params);
    console.log("Query string:", queryParams.toString());

    const response = await API.get(
      `/worker-management?${queryParams.toString()}`
    );

    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("getWorkers API Error:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error status:", error.response.status);
    }

    throw error;
  }
};

// Get worker details by ID
export const getWorkerDetails = async (workerId) => {
  try {
    console.log("Getting worker details for ID:", workerId);

    const response = await API.get(`/worker-management/${workerId}`);

    console.log("Worker details response:", response.data);
    return response.data;
  } catch (error) {
    console.error("getWorkerDetails API Error:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error status:", error.response.status);
    }

    throw error;
  }
};

// Block a worker
export const blockWorker = async (credentialId, data) => {
  try {
    console.log("Blocking worker with credential ID:", credentialId);
    console.log("Block data:", data);

    const response = await API.post(
      `/worker-management/${credentialId}/block`,
      data
    );

    console.log("Block worker response:", response.data);
    return response.data;
  } catch (error) {
    console.error("blockWorker API Error:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error status:", error.response.status);
    }

    throw error;
  }
};

// Unblock a worker
export const unblockWorker = async (credentialId) => {
  try {
    console.log("Unblocking worker with credential ID:", credentialId);

    const response = await API.post(
      `/worker-management/${credentialId}/unblock`
    );

    console.log("Unblock worker response:", response.data);
    return response.data;
  } catch (error) {
    console.error("unblockWorker API Error:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error status:", error.response.status);
    }

    throw error;
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await API.get("/worker-management/health");
    return response.data;
  } catch (error) {
    console.error("Health check API Error:", error);
    throw error;
  }
};

export default API;
