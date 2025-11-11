import axios from "axios";
import { baseURL } from "../utils/appMode.js";
const API = axios.create({
  baseURL: baseURL + "/applications",
  withCredentials: true,
});

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

// Respond to job application (Client accepts/rejects or starts discussion)
export const respondToApplication = async (applicationId, responseData) => {
  try {
    const response = await API.patch(`/${applicationId}/respond`, responseData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// ==================== NEW AGREEMENT FLOW API ====================

// Start discussion phase for application (Client only)
export const startApplicationDiscussion = async (applicationId) => {
  try {
    const response = await API.patch(`/${applicationId}/start-discussion`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Mark agreement status for application (Both client and worker)
export const markApplicationAgreement = async (applicationId, agreed) => {
  try {
    const response = await API.patch(`/${applicationId}/agreement`, { agreed });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};
