import axios from "axios";
import { baseURL } from "../utils/appMode.js";
const ContractAPI = axios.create({
  baseURL: baseURL + "/contracts",
  withCredentials: true,
});

// Get contract by ID for feedback
export const getContractById = async (contractId) => {
  try {
    const response = await ContractAPI.get(`/${contractId}`);
    return response.data; 
  } catch (error) {
    console.error("Get contract failed:", error);
    throw new Error(error.response?.data?.message || "Failed to load contract");
  }
};

// Submit feedback for completed work
export const submitFeedback = async (contractId, feedbackData) => {
  try {
    const response = await ContractAPI.post(
      `/${contractId}/feedback`,
      feedbackData
    );
    return response.data;
  } catch (error) {
    console.error("Submit feedback failed:", error);
    console.error("Error response:", error.response?.data);

    // Extract more specific error messages
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Failed to submit feedback";

    throw new Error(errorMessage);
  }
};

// Worker starts work on contract (changes status from active to in_progress)
export const startWork = async (contractId) => {
  try {
    const response = await ContractAPI.patch(`/${contractId}/start`);
    return response.data;
  } catch (error) {
    console.error("Start work failed:", error);
    throw new Error(error.response?.data?.message || "Failed to start work");
  }
};

// Worker marks contract as completed (awaiting client confirmation)
export const completeWork = async (contractId) => {
  try {
    const response = await ContractAPI.patch(`/${contractId}/complete`);
    return response.data;
  } catch (error) {
    console.error("Complete work failed:", error);
    throw new Error(error.response?.data?.message || "Failed to complete work");
  }
};

// Client confirms work completion
export const confirmWorkCompletion = async (contractId) => {
  try {
    const response = await ContractAPI.patch(
      `/${contractId}/confirm-completion`
    );
    return response.data;
  } catch (error) {
    console.error("Confirm completion failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to confirm completion"
    );
  }
};

// Cancel contract
export const cancelContract = async (contractId) => {
  try {
    const response = await ContractAPI.patch(`/${contractId}/cancel`);
    return response.data;
  } catch (error) {
    console.error("Cancel contract failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to cancel contract"
    );
  }
};

// Get reviews for a specific client (with statistics)
export const getClientReviewsById = async (clientId, options = {}) => {
  try {
    const { page = 1, limit = 10, rating } = options;
    const params = { page, limit };
    if (rating) params.rating = rating;

    const response = await ContractAPI.get(`/reviews/client/${clientId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get client reviews failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to load client reviews"
    );
  }
};

// Get reviews for a specific worker (with statistics)
export const getWorkerReviewsById = async (workerId, options = {}) => {
  try {
    const { page = 1, limit = 10, rating } = options;
    const params = { page, limit };
    if (rating) params.rating = rating;

    const response = await ContractAPI.get(`/reviews/worker/${workerId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get worker reviews failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to load worker reviews"
    );
  }
};

// Get client contracts (with feedback)
export const getClientContracts = async () => {
  try {
    const response = await ContractAPI.get("/client");
    return response.data.data?.contracts || [];
  } catch (error) {
    console.error("Get client contracts failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to load contracts"
    );
  }
};

// Get worker contracts (with feedback)
export const getWorkerContracts = async () => {
  try {
    const response = await ContractAPI.get("/worker");
    return response.data.data?.contracts || [];
  } catch (error) {
    console.error("Get worker contracts failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to load contracts"
    );
  }
};

export default {
  getContractById,
  submitFeedback,
  completeWork,
  confirmWorkCompletion,
  cancelContract,
  getClientReviewsById,
  getWorkerReviewsById,
  getClientContracts,
  getWorkerContracts,
};
