import React, { useState, useEffect } from "react";
import {
  Loader,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  Users,
  DollarSign,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import {
  getWorkerContracts,
  getClientContracts,
  startWork,
  completeWork,
  confirmWorkCompletion,
  submitFeedback,
} from "../api/feedback.jsx";
import { checkAuth } from "../api/auth";

const ContractManagement = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState({
    show: false,
    contract: null,
  });
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    loadUserAndContracts();
  }, []);

  const loadUserAndContracts = async () => {
    try {
      const authRes = await checkAuth();
      if (!authRes?.data?.success) {
        return;
      }

      const user = authRes.data.data;
      setCurrentUser(user);

      // Load contracts based on user type
      const contractsRes =
        user.userType === "worker"
          ? await getWorkerContracts()
          : await getClientContracts();

      console.log("Contracts loaded:", contractsRes);
      console.log("Current user:", user);
      setContracts(contractsRes || []);
    } catch (error) {
      console.error("Failed to load contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async (contractId) => {
    try {
      console.log("Attempting to start work for contract:", contractId);
      const result = await startWork(contractId);
      console.log("Start work result:", result);
      alert("Work started successfully!");
      loadUserAndContracts();
    } catch (error) {
      console.error("Start work error:", error);
      alert("Failed to start work: " + error.message);
    }
  };

  const handleCompleteWork = async (contractId) => {
    try {
      console.log("Attempting to complete work for contract:", contractId);
      const result = await completeWork(contractId);
      console.log("Complete work result:", result);
      alert("Work marked as completed! Waiting for client confirmation.");
      loadUserAndContracts();
    } catch (error) {
      console.error("Complete work error:", error);
      alert("Failed to mark work as completed: " + error.message);
    }
  };

  const handleConfirmCompletion = async (contractId) => {
    try {
      await confirmWorkCompletion(contractId);
      alert("Work completion confirmed! You can now submit feedback.");
      loadUserAndContracts();
    } catch (error) {
      alert("Failed to confirm completion: " + error.message);
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      // Frontend validation
      if (!feedback.comment || feedback.comment.trim().length < 5) {
        alert("Feedback must be at least 5 characters long");
        return;
      }

      console.log(
        "Submitting feedback for contract:",
        feedbackModal.contract._id
      );
      console.log("Contract status:", feedbackModal.contract.contractStatus);
      console.log("Feedback data:", {
        rating: feedback.rating,
        feedback: feedback.comment,
      });

      await submitFeedback(feedbackModal.contract._id, {
        rating: feedback.rating,
        feedback: feedback.comment, // Backend expects 'feedback' not 'comment'
      });
      alert("Feedback submitted successfully!");
      setFeedbackModal({ show: false, contract: null });
      setFeedback({ rating: 5, comment: "" });
      loadUserAndContracts();
    } catch (error) {
      console.error("Feedback submission error:", error);
      alert("Failed to submit feedback: " + error.message);
    }
  };

  const handleMessageClick = async (contract) => {
    try {
      // Determine the other party's details
      const otherParty =
        currentUser?.userType === "worker"
          ? { credentialId: contract.clientId, userType: "client" }
          : { credentialId: contract.workerId, userType: "worker" };

      // Navigate to messages page with the other party's info
      navigate("/messages", {
        state: {
          targetCredentialId: otherParty.credentialId,
          targetUserType: otherParty.userType,
          contractId: contract._id,
        },
      });
    } catch (error) {
      console.error("Failed to navigate to conversation:", error);
      alert("Failed to open conversation");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Clock,
        text: "Active",
      },
      in_progress: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
        text: "In Progress",
      },
      awaiting_client_confirmation: {
        color: "bg-orange-100 text-orange-800 border-orange-200",
        icon: AlertCircle,
        text: "Awaiting Client Confirmation",
      },
      completed: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
        text: "Completed",
      },
      cancelled: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
        text: "Cancelled",
      },
    };

    const badge = badges[status] || {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: Clock,
      text: status,
    };
    const Icon = badge.icon;

    return (
      <span
        className={`px-3 py-2 rounded-full text-sm font-medium border ${badge.color} flex items-center gap-2 w-fit`}
      >
        <Icon size={16} />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 mt-20">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Contracts</h1>
          <p className="text-gray-600 mt-2">
            Manage your work contracts and track project progress
          </p>
        </div>

        {contracts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-[#545454] mb-2">
              No contracts found
            </h3>
            <p className="text-gray-500">
              {currentUser?.userType === "worker"
                ? "Apply to jobs to start getting contracts"
                : "Hire workers to create contracts"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {contracts.map((contract) => (
              <div
                key={contract._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {contract.description || "Contract Work"}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <DollarSign size={16} />
                          <span className="font-medium">
                            ${contract.agreedRate}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>
                            Created{" "}
                            {new Date(contract.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        Contract ID: {contract._id}
                      </p>
                    </div>
                    {getStatusBadge(contract.contractStatus)}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {/* Debug info - remove after testing */}
                    <div className="text-xs text-gray-400 w-full mb-2">
                      Debug: Status={contract.contractStatus}, User=
                      {currentUser?.userType}
                    </div>

                    {/* Worker actions */}
                    {currentUser?.userType === "worker" && (
                      <>
                        {contract.contractStatus === "active" && (
                          <button
                            onClick={() => handleStartWork(contract._id)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            <Clock size={16} className="mr-2" />
                            Start Work
                          </button>
                        )}
                        {contract.contractStatus === "in_progress" && (
                          <button
                            onClick={() => handleCompleteWork(contract._id)}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Request Completion
                          </button>
                        )}
                        {contract.contractStatus ===
                          "awaiting_client_confirmation" && (
                          <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 text-sm font-medium rounded-md">
                            <Clock size={16} className="mr-2" />
                            Waiting for client confirmation
                          </div>
                        )}
                        {contract.contractStatus === "completed" &&
                          !contract.workerFeedback && (
                            <button
                              onClick={() =>
                                setFeedbackModal({ show: true, contract })
                              }
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                              <Star size={16} className="mr-2" />
                              Submit Feedback
                            </button>
                          )}
                      </>
                    )}

                    {/* Client actions */}
                    {currentUser?.userType === "client" && (
                      <>
                        {contract.contractStatus ===
                          "awaiting_client_confirmation" && (
                          <button
                            onClick={() =>
                              handleConfirmCompletion(contract._id)
                            }
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Confirm Completion
                          </button>
                        )}
                        {contract.contractStatus === "completed" &&
                          !contract.clientFeedback && (
                            <button
                              onClick={() =>
                                setFeedbackModal({ show: true, contract })
                              }
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                              <Star size={16} className="mr-2" />
                              Submit Feedback
                            </button>
                          )}
                      </>
                    )}

                    {/* Message button for all contracts */}
                    <button
                      onClick={() => handleMessageClick(contract)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      <MessageSquare size={16} className="mr-2" />
                      Message
                    </button>
                  </div>

                  {/* Show feedback if exists */}
                  {(contract.clientFeedback || contract.workerFeedback) && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-gray-900">Feedback</h4>
                      {contract.clientFeedback && (
                        <div className="border-l-4 border-blue-400 pl-4">
                          <p className="text-sm font-medium text-gray-900">
                            Client Feedback:
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={
                                    i < contract.clientRating
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              ({contract.clientRating}/5)
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            {contract.clientFeedback}
                          </p>
                        </div>
                      )}
                      {contract.workerFeedback && (
                        <div className="border-l-4 border-green-400 pl-4">
                          <p className="text-sm font-medium text-gray-900">
                            Worker Feedback:
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={
                                    i < contract.workerRating
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              ({contract.workerRating}/5)
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            {contract.workerFeedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Feedback Modal */}
        {feedbackModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Submit Feedback</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedback({ ...feedback, rating: star })}
                      className={`p-1 ${
                        star <= feedback.rating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      <Star
                        size={24}
                        className={
                          star <= feedback.rating ? "fill-current" : ""
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Comment
                </label>
                <textarea
                  value={feedback.comment}
                  onChange={(e) =>
                    setFeedback({ ...feedback, comment: e.target.value })
                  }
                  className="w-full p-2 border rounded-md h-24"
                  placeholder="Share your experience (minimum 5 characters)..."
                  required
                  minLength={5}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {feedback.comment.length}/1000 characters (minimum 5)
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() =>
                    setFeedbackModal({ show: false, contract: null })
                  }
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractManagement;
