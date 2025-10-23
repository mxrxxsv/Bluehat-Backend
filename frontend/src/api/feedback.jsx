import axios from "axios";

const ContractAPI = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/contracts",
  withCredentials: true,
});

ContractAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get contract by ID for feedback
export const getContractById = async (contractId) => {
  try {
    const response = await ContractAPI.get(`/${contractId}`);
    return response.data; // Return the full response data which includes contract, review, etc.
  } catch (error) {
    console.error("Get contract failed:", error);
    throw new Error(error.response?.data?.message || "Failed to load contract");
  }
};

// Submit feedback for completed work
export const submitFeedback = async (contractId, feedbackData) => {
  try {
    console.log("Submitting feedback:", { contractId, feedbackData });
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

// Get client contracts (with feedback)
export const getClientContracts = async () => {
  try {
    const response = await ContractAPI.get("/client");
    console.log("Client contracts response:", response.data);
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
    console.log("Worker contracts response:", response.data);
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
  getClientContracts,
  getWorkerContracts,
};
