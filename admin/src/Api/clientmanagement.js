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

// Get all clients with pagination and filters
export const getClients = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    // Add pagination parameters
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    // Add filter parameters
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.order) queryParams.append("order", params.order);

    console.log("API Request params:", params);
    console.log("Query string:", queryParams.toString());

    // ✅ FIXED: Match backend route exactly
    const response = await API.get(
      `/client-management/?${queryParams.toString()}`
    );

    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("getClients API Error:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error status:", error.response.status);
    }

    throw error;
  }
};

// Block a client
export const blockClient = async (credentialId, data) => {
  try {
    console.log("Blocking client with credential ID:", credentialId);
    console.log("Block data:", data);

    // ✅ FIXED: Match backend route exactly
    const response = await API.post(
      `/client-management/${credentialId}/block`,
      data
    );

    console.log("Block client response:", response.data);
    return response.data;
  } catch (error) {
    console.error("blockClient API Error:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error status:", error.response.status);
    }

    throw error;
  }
};

// Unblock a client
export const unblockClient = async (credentialId) => {
  try {
    console.log("Unblocking client with credential ID:", credentialId);

    // ✅ FIXED: Match backend route exactly
    const response = await API.post(
      `/client-management/${credentialId}/unblock`
    );

    console.log("Unblock client response:", response.data);
    return response.data;
  } catch (error) {
    console.error("unblockClient API Error:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error status:", error.response.status);
    }

    throw error;
  }
};

// ❌ REMOVED: This endpoint doesn't exist in backend
// Get client details by ID
// export const getClientDetails = async (clientId) => {
//   try {
//     console.log("Getting client details for ID:", clientId);

//     const response = await API.get(`/api/client-management/${clientId}`);

//     console.log("Client details response:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("getClientDetails API Error:", error);

//     if (error.response) {
//       console.error("Error response data:", error.response.data);
//       console.error("Error status:", error.response.status);
//     }

//     throw error;
//   }
// };

// Health check
export const healthCheck = async () => {
  try {
    // ✅ FIXED: Match backend route exactly
    const response = await API.get("/client-management/health");
    return response.data;
  } catch (error) {
    console.error("Health check API Error:", error);
    throw error;
  }
};

export default API;
