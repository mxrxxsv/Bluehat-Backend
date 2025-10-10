import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/applications", 
  withCredentials: true, 
});

// ==================== JOB APPLICATION API ====================

// Apply to a job (Worker only, verified)
export const applyToJob = async (jobId, applicationData) => {
  try {
    const response = await API.post(`/jobs/${jobId}/apply`, applicationData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Get worker's job applications
export const getWorkerApplications = async (params = {}) => {
  try {
    const response = await API.get(`/worker/sent`, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Get applications for client's jobs
export const getClientApplications = async (params = {}) => {
  try {
    const response = await API.get(`/client/received`, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Respond to job application (Client accepts/rejects)
export const respondToApplication = async (applicationId, responseData) => {
  try {
    const response = await API.patch(`/respond/${applicationId}/respond`, responseData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};
