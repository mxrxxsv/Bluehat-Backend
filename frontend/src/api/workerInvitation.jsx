import axios from "axios";
import { baseURL } from "../utils/appMode.js";
const API = axios.create({
  baseURL: baseURL + "/invitations",
  withCredentials: true,
});

// Invite worker to job (Client only)
export const inviteWorker = async (workerId, invitationData) => {
  try {
    const response = await API.post(
      `/workers/${workerId}/invite`,
      invitationData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Respond to worker invitation (Worker accepts/rejects or starts discussion)
export const respondToInvitation = async (invitationId, responseData) => {
  try {
    const response = await API.patch(`/${invitationId}/respond`, responseData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Get invitations sent by client
export const getClientInvitations = async (params = {}) => {
  try {
    const response = await API.get(`/client/sent`, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Get invitations received by worker
export const getWorkerInvitations = async (params = {}) => {
  try {
    const response = await API.get(`/worker/received`, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Cancel invitation (Client only)
export const cancelInvitation = async (invitationId) => {
  try {
    const response = await API.patch(`/${invitationId}/cancel`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};


// Start discussion phase for invitation (Worker only)
export const startInvitationDiscussion = async (invitationId) => {
  try {
    const response = await API.patch(`/${invitationId}/start-discussion`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};

// Mark agreement status for invitation (Both client and worker)
export const markInvitationAgreement = async (invitationId, agreed) => {
  try {
    const response = await API.patch(`/${invitationId}/agreement`, { agreed });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: "Network error" };
  }
};
