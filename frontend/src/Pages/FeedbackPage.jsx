import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, Send, ArrowLeft } from "lucide-react";
import Header from "../components/Header";
import { getProfile } from "../api/profile";
import { submitFeedback, getContractById } from "../api/feedback.jsx";

const FeedbackPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 0,
    comment: "",
    workQuality: "",
    communication: "",
    timeliness: "",
    wouldRecommend: null,
  });

  // UI alert modal (system-styled) to replace blocking alerts
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    const fetchUserAndContract = async () => {
      try {
        // Check auth first
        const authRes = await getProfile();
        if (authRes?.data?.success) {
          const user = authRes.data.data;
          setCurrentUser(user);

          // Then load contract with user context for gating
          await loadContract(user);
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/login");
      }
    };

    fetchUserAndContract();
  }, [contractId, navigate]);

  const loadContract = async (userCtx) => {
    try {
      const contractData = await getContractById(contractId);
      setContract(contractData);

      // Determine if current user already submitted feedback
      try {
        const reviewsRaw = contractData?.review || contractData?.reviews || [];
        const reviews = Array.isArray(reviewsRaw)
          ? reviewsRaw
          : reviewsRaw && typeof reviewsRaw === "object"
          ? [reviewsRaw]
          : [];

        const userType = (userCtx?.userType || "").toLowerCase();
        const hasSubmitted = reviews.some(
          (r) => (r?.reviewerType || "").toLowerCase() === userType
        );
        setAlreadySubmitted(Boolean(hasSubmitted));
      } catch (_) {
        setAlreadySubmitted(false);
      }
    } catch (error) {
      console.error("Failed to load contract:", error);
      setAlertModal({ open: true, title: "Unable to load", message: "Failed to load contract details." });
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (rating) => {
    setFeedback((prev) => ({ ...prev, rating }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    if (feedback.rating === 0) {
      setAlertModal({ open: true, title: "Missing rating", message: "Please provide a rating." });
      return;
    }

    if (!feedback.comment.trim()) {
      setAlertModal({ open: true, title: "Missing comment", message: "Please provide a comment." });
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback(contractId, feedback);
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      setAlertModal({ open: true, title: "Submit failed", message: error.message || "Failed to submit feedback. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-64 mt-24">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-8 mt-20 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Contract Not Found
          </h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const otherParty =
    currentUser?.userType === "client" ? contract.worker : contract.client;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-8 mt-20">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            {alreadySubmitted ? "Feedback Submitted" : "Leave Feedback"}
          </h1>

          {/* Contract Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Project: {contract.job?.title || "Contract Work"}
            </h3>
            <p className="text-gray-600 mb-2">
              {currentUser?.userType === "client" ? "Worker" : "Client"}:{" "}
              {otherParty?.firstName} {otherParty?.lastName}
            </p>
            <p className="text-sm text-gray-500">
              Completed on:{" "}
              {new Date(contract.completedAt).toLocaleDateString()}
            </p>
          </div>

          {/* If already submitted, show an info panel instead of the form */}
          {alreadySubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              You have already submitted feedback for this contract. Thank you!
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Overall Rating *
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleStarClick(star)}
                    className={`w-8 h-8 ${
                      star <= feedback.rating
                        ? "text-yellow-500 fill-current"
                        : "text-gray-300"
                    } hover:text-yellow-500 transition-colors`}
                  >
                    <Star className="w-full h-full" />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  ({feedback.rating}/5)
                </span>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review *
              </label>
              <textarea
                value={feedback.comment}
                onChange={(e) =>
                  setFeedback((prev) => ({ ...prev, comment: e.target.value }))
                }
                placeholder="Share your experience working with this person..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentUser?.userType === "client"
                    ? "Work Quality"
                    : "Project Clarity"}
                </label>
                <select
                  value={feedback.workQuality}
                  onChange={(e) =>
                    setFeedback((prev) => ({
                      ...prev,
                      workQuality: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select rating</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication
                </label>
                <select
                  value={feedback.communication}
                  onChange={(e) =>
                    setFeedback((prev) => ({
                      ...prev,
                      communication: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select rating</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeliness
                </label>
                <select
                  value={feedback.timeliness}
                  onChange={(e) =>
                    setFeedback((prev) => ({
                      ...prev,
                      timeliness: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select rating</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Would Recommend?
                </label>
                <select
                  value={
                    feedback.wouldRecommend === null
                      ? ""
                      : feedback.wouldRecommend.toString()
                  }
                  onChange={(e) =>
                    setFeedback((prev) => ({
                      ...prev,
                      wouldRecommend:
                        e.target.value === ""
                          ? null
                          : e.target.value === "true",
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select option</option>
                  <option value="true">Yes, definitely</option>
                  <option value="false">No, would not recommend</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
            </form>
          )}
        </div>
      </div>

      {/* Alert Modal (system-styled) */}
      {alertModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/20 backdrop-blur-md bg-opacity-40 z-[2000]">
          <div className="bg-white rounded-[20px] p-6 shadow-lg max-w-sm w-[92%] sm:w-full relative">
            <button
              type="button"
              onClick={() => setAlertModal({ open: false, title: "", message: "" })}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-500 absolute top-3 right-3"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800 pr-8">{alertModal.title || "Notice"}</h3>
            <p className="text-gray-600 mt-4 whitespace-pre-line">{alertModal.message}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setAlertModal({ open: false, title: "", message: "" })}
                className="px-4 py-2 bg-[#55b3f3] text-white rounded-md hover:bg-blue-400 cursor-pointer transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
