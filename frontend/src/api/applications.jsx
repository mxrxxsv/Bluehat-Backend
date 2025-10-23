import axios from "axios";

const API = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/applications",
  withCredentials: true,
});

const InvitationAPI = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/invitations",
  withCredentials: true,
});

// Attach Authorization header from localStorage token for both clients
[API, InvitationAPI].forEach((client) => {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
});

export const getMyApplications = async () => {
  try {
    const response = await API.get("/worker/sent");
    return response.data.applications || [];
  } catch (error) {
    console.error("Get applications failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to load applications"
    );
  }
};

export const getMyClientApplications = async () => {
  try {
    const response = await API.get("/client/received");
    return response.data.applications || [];
  } catch (error) {
    console.error("Get client applications failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to load applications"
    );
  }
};

export const startApplicationDiscussion = async (applicationId) => {
  try {
    const response = await API.patch(`/${applicationId}/start-discussion`);
    return response.data;
  } catch (error) {
    console.error("Start discussion failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to start discussion"
    );
  }
};

export const markApplicationAgreement = async (applicationId) => {
  try {
    const response = await API.patch(`/${applicationId}/agreement`);
    return response.data;
  } catch (error) {
    console.error("Mark agreement failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to mark agreement"
    );
  }
};

// Invitation endpoints
export const getMyInvitations = async () => {
  try {
    const response = await InvitationAPI.get("/worker/received");
    return response.data.data.invitations || [];
  } catch (error) {
    console.error("Get invitations failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to load invitations"
    );
  }
};

export const getMySentInvitations = async () => {
  try {
    const response = await InvitationAPI.get("/client/sent");
    return response.data.data.invitations || [];
  } catch (error) {
    console.error("Get sent invitations failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to load sent invitations"
    );
  }
};

export const inviteWorker = async (invitationData) => {
  try {
    const { workerId, ...data } = invitationData;
    const response = await InvitationAPI.post(
      `/workers/${workerId}/invite`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Invite worker failed:", error);
    throw new Error(error.response?.data?.message || "Failed to invite worker");
  }
};

export const respondToInvitation = async (invitationId, actionData) => {
  try {
    const response = await InvitationAPI.patch(
      `/${invitationId}/respond`,
      actionData
    );
    return response.data;
  } catch (error) {
    console.error("Respond to invitation failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to respond to invitation"
    );
  }
};

export const startInvitationDiscussion = async (invitationId) => {
  try {
    const response = await InvitationAPI.patch(
      `/${invitationId}/start-discussion`
    );
    return response.data;
  } catch (error) {
    console.error("Start invitation discussion failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to start discussion"
    );
  }
};

export const markInvitationAgreement = async (invitationId, data) => {
  try {
    const response = await InvitationAPI.patch(
      `/${invitationId}/agreement`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Mark invitation agreement failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to mark agreement"
    );
  }
};

export default {
  getMyApplications,
  startApplicationDiscussion,
  markApplicationAgreement,
  getMyInvitations,
  getMySentInvitations,
  inviteWorker,
  respondToInvitation,
  startInvitationDiscussion,
  markInvitationAgreement,
};
