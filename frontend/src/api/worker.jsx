import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000", // change to your backend base URL
  withCredentials: true, // if you are using cookies/session auth
});

// ============ GET ALL WORKERS WITH FILTERS ============
export const getWorkers = async (params = {}) => {
  try {
    const response = await API.get("/workers", {
      params, // e.g. { page: 1, limit: 12, status: "available", city: "Manila" }
    });
    return response.data.data; // { workers, pagination, statistics, filters }
  } catch (error) {
    console.error("Error fetching workers:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// ============ GET SINGLE WORKER BY ID ============
export const getWorkerById = async (workerId) => {
  try {
    const response = await API.get(`/workers/${workerId}`);
    return response.data.data; // detailed worker object
  } catch (error) {
    console.error("Error fetching worker by ID:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};
