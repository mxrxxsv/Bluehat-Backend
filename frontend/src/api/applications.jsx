import {
  getWorkerApplications,
  getClientApplications,
  startApplicationDiscussion as startAppDiscussionCanonical,
  markApplicationAgreement as markAppAgreementCanonical,
} from "./jobApplication.jsx";

import {
  inviteWorker as inviteWorkerCanonical,
  respondToInvitation as respondToInvitationCanonical,
  getClientInvitations,
  getWorkerInvitations,
  startInvitationDiscussion as startInvitationDiscussionCanonical,
  markInvitationAgreement as markInvitationAgreementCanonical,
} from "./workerInvitation.jsx";

// ==================== APPLICATIONS (FACADE) ====================

export const getMyApplications = async () => {
  try {
    const res = await getWorkerApplications();
    // Preserve previous return shape (array of applications)
    return (
      res?.applications ||
      res?.data?.applications ||
      res?.data?.data?.applications ||
      []
    );
  } catch (error) {
    console.error("Get applications failed:", error);
    throw new Error(
      error?.response?.data?.message || "Failed to load applications"
    );
  }
};

export const getMyClientApplications = async () => {
  try {
    const res = await getClientApplications();
    return (
      res?.applications ||
      res?.data?.applications ||
      res?.data?.data?.applications ||
      []
    );
  } catch (error) {
    console.error("Get client applications failed:", error);
    throw new Error(
      error?.response?.data?.message || "Failed to load applications"
    );
  }
};

export const startApplicationDiscussion = async (applicationId) => {
  return startAppDiscussionCanonical(applicationId);
};

export const markApplicationAgreement = async (applicationId) => {
  // Default to agreed = true to match previous implicit behavior
  return markAppAgreementCanonical(applicationId, true);
};

// ==================== INVITATIONS (FACADE) ====================

export const getMyInvitations = async () => {
  try {
    const res = await getWorkerInvitations();
    return (
      res?.invitations ||
      res?.data?.invitations ||
      res?.data?.data?.invitations ||
      []
    );
  } catch (error) {
    console.error("Get invitations failed:", error);
    throw new Error(
      error?.response?.data?.message || "Failed to load invitations"
    );
  }
};

export const getMySentInvitations = async () => {
  try {
    const res = await getClientInvitations();
    return (
      res?.invitations ||
      res?.data?.invitations ||
      res?.data?.data?.invitations ||
      []
    );
  } catch (error) {
    console.error("Get sent invitations failed:", error);
    throw new Error(
      error?.response?.data?.message || "Failed to load sent invitations"
    );
  }
};

export const inviteWorker = async (invitationData) => {
  try {
    // Backward-compatible signature: inviteWorker({ workerId, ...data })
    const { workerId, ...data } = invitationData || {};
    if (!workerId) throw new Error("workerId is required");
    return await inviteWorkerCanonical(workerId, data);
  } catch (error) {
    console.error("Invite worker failed:", error);
    throw new Error(error?.response?.data?.message || "Failed to invite worker");
  }
};

export const respondToInvitation = async (invitationId, actionData) => {
  return respondToInvitationCanonical(invitationId, actionData);
};

export const startInvitationDiscussion = async (invitationId) => {
  return startInvitationDiscussionCanonical(invitationId);
};

export const markInvitationAgreement = async (invitationId, data) => {
  // Accept either { agreed: boolean } or boolean; default to true
  const agreed = typeof data === "boolean" ? data : data?.agreed ?? true;
  return markInvitationAgreementCanonical(invitationId, agreed);
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
