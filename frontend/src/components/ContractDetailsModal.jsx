import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Calendar,
  DollarSign,
  User,
  MapPin,
  Clock,
  CheckCircle,
  Star,
  MessageSquare,
  AlertCircle,
  Briefcase,
  Mail,
  Phone,
  Award,
} from "lucide-react";
import { getContractById } from "../api/feedback.jsx";
import worker from "../assets/worker.png";
import client from "../assets/client.png";

const ContractDetailsModal = ({ contractId, isOpen, onClose }) => {
  const [contractDetails, setContractDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to safely access contract data
  const getContract = () => {
    return contractDetails?.contract || contractDetails;
  };

  const getReviews = () => {
    const reviews = contractDetails?.review || contractDetails?.reviews || [];
    // Handle both single review object and array of reviews
    if (Array.isArray(reviews)) {
      return reviews;
    } else if (reviews && typeof reviews === "object") {
      return [reviews]; // Convert single review to array
    }
    return [];
  };

  const fetchContractDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getContractById(contractId);
      // Removed verbose console logging in production UI

      // Handle different response structures
      let contractData;
      if (response.data) {
        contractData = response.data;
      } else if (response.contract) {
        contractData = response;
      } else {
        contractData = response;
      }

      setContractDetails(contractData);
    } catch (err) {
      console.error("Failed to fetch contract details:", err);
      setError(err.message || "Failed to load contract details");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (isOpen && contractId) {
      fetchContractDetails();
    }
  }, [isOpen, contractId, fetchContractDetails]);

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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  // ---- Derived helpers for ratings and counts ----
  const computeAvgRating = ({ reviewerType, revieweeType } = {}) => {
    try {
      const list = getReviews().filter((r) => {
        const revType = (r?.reviewerType || "").toLowerCase();
        const reeType = (r?.revieweeType || "").toLowerCase();
        return (
          (!reviewerType || revType === reviewerType.toLowerCase()) &&
          (!revieweeType || reeType === revieweeType.toLowerCase())
        );
      });
      const nums = list
        .map((r) => Number(r?.rating))
        .filter((n) => Number.isFinite(n));
      if (!nums.length) return null;
      const sum = nums.reduce((a, b) => a + b, 0);
      return sum / nums.length;
    } catch (_) {
      return null;
    }
  };

  const formatRating = (val) =>
    Number.isFinite(val) && Number(val) !== 0 ? Number(val).toFixed(1) : "N/A";

  // Prefer backend aggregate avg when it's > 0; otherwise fallback to contract-local reviews
  const clientAvgBackend = getContract()?.clientId?.averageRating;
  const workerAvgBackend = getContract()?.workerId?.averageRating;

  const clientAvgFallback = computeAvgRating({
    reviewerType: "worker",
    revieweeType: "client",
  });
  const workerAvgFallback = computeAvgRating({
    reviewerType: "client",
    revieweeType: "worker",
  });

  // Gate backend averages by evidence of history: prefer contract-local reviews; otherwise only show
  // backend average if there are historical counts (jobs posted/completed) to avoid fake defaults.
  const clientReviewsCount = getReviews().filter(
    (r) => (r?.revieweeType || "").toLowerCase() === "client"
  ).length;
  const workerReviewsCount = getReviews().filter(
    (r) => (r?.revieweeType || "").toLowerCase() === "worker"
  ).length;

  const clientAvgRating =
    clientReviewsCount > 0
      ? clientAvgFallback
      : Number.isFinite(clientAvgBackend) && clientAvgBackend > 0 &&
        (getContract()?.clientId?.totalJobsPosted ?? 0) > 0
      ? clientAvgBackend
      : null;

  const workerAvgRating =
    workerReviewsCount > 0
      ? workerAvgFallback
      : Number.isFinite(workerAvgBackend) && workerAvgBackend > 0 &&
        (getContract()?.workerId?.totalJobsCompleted ?? 0) > 0
      ? workerAvgBackend
      : null;

  const clientJobsPosted = getContract()?.clientId?.totalJobsPosted;
  const workerJobsCompleted = getContract()?.workerId?.totalJobsCompleted;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md  bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-2xl font-bold text-[#545454]">
            Contract Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">
                Loading contract details...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error Loading Details
              </h3>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchContractDetails}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : contractDetails ? (
            <div className="space-y-8">
              {/* Basic Contract Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-[#545454] mb-2">
                      {getContract()?.jobId?.title ||
                        getContract()?.jobId?.description ||
                        "Contract Work"}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {getContract()?.jobId?.description ||
                        "No description available"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          ₱ {getContract()?.agreedRate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase size={16} />
                        <span>
                          {getContract()?.contractType?.replaceAll("_", " ")}
                        </span>
                      </div>
                      {getContract()?.jobId?.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span>{getContract().jobId.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(getContract()?.contractStatus)}
                </div>

                {/* Contract Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-blue-500" />
                      <span className="font-medium text-gray-700">Created</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDate(getContract()?.createdAt)}
                    </p>
                  </div>

                  {getContract()?.startDate && (
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-yellow-500" />
                        <span className="font-medium text-gray-700">
                          Started
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(getContract().startDate)}
                      </p>
                    </div>
                  )}

                  {getContract()?.completedAt && (
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="text-green-500" />
                        <span className="font-medium text-gray-700">
                          Completed
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(getContract().completedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Client and Worker Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Info */}
                {getContract()?.clientId && (
                  <div className="bg-white border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={getContract().clientId.profilePictureUrl || client}
                        alt="Client"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <User size={16} className="text-sky-500" />
                          Client Information
                        </h4>
                        <p className="text-lg font-medium text-gray-800">
                          {getContract().clientId.firstName}{" "}
                          {getContract().clientId.lastName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Average Rating:</span>
                        <div className="flex items-center gap-1">
                          <Star
                            size={16}
                            className="text-yellow-400 fill-current"
                          />
                          <span className="font-medium">{formatRating(clientAvgRating)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Jobs Posted:</span>
                        <span className="font-medium">{clientJobsPosted ?? "N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Worker Info */}
                {getContract()?.workerId && (
                  <div className="bg-white border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={getContract().workerId.profilePictureUrl || worker}
                        alt="Worker"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Award size={16} className="text-sky-500" />
                          Worker Information
                        </h4>
                        <p className="text-lg font-medium text-gray-800">
                          {getContract().workerId.firstName}{" "}
                          {getContract().workerId.lastName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Average Rating:</span>
                        <div className="flex items-center gap-1">
                          <Star
                            size={16}
                            className="text-yellow-400 fill-current"
                          />
                          <span className="font-medium">{formatRating(workerAvgRating)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Jobs Completed:</span>
                        <span className="font-medium">{workerJobsCompleted ?? "N/A"}</span>
                      </div>
                      {getContract().workerId.skills &&
                        getContract().workerId.skills.length > 0 && (
                          <div>
                            <span className="text-gray-600 block mb-2">
                              Skills:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {getContract()
                                .workerId.skills.slice(0, 3)
                                .map((skill, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              {getContract().workerId.skills.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  +{getContract().workerId.skills.length - 3}{" "}
                                  more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>

              {/* Job Category */}
              {getContract()?.jobId?.category && (
                <div className="bg-white rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase size={16} className="text-sky-500" />
                    Job Category
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <p className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-xs">
                      {getContract().jobId.category.categoryName ||
                        getContract().jobId.category}
                    </p>
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              {getReviews().length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare size={16} className="text-sky-500" />
                    Reviews & Feedback ({getReviews().length})
                  </h4>

                  <div className="space-y-4">
                    {getReviews().map((review, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg p-4 border-l-4 border-blue-500"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={
                              review.reviewerId?.profilePictureUrl ||
                              (review.reviewerType === "client"
                                ? client
                                : worker)
                            }
                            alt="Reviewer"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {review.reviewerId?.firstName}{" "}
                                  {review.reviewerId?.lastName}
                                </p>
                                <p className="text-sm text-gray-600 capitalize">
                                  {review.reviewerType}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={16}
                                    className={
                                      i < review.rating
                                        ? "text-yellow-400 fill-current"
                                        : "text-gray-300"
                                    }
                                  />
                                ))}
                                <span className="ml-1 text-sm text-gray-600">
                                  ({review.rating}/5)
                                </span>
                              </div>
                            </div>
                            <p className="text-gray-700">{review.feedback}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(review.reviewDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contract ID for Reference */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">
                  Contract ID:{" "}
                  <span className="font-mono font-medium">
                    {getContract()?._id}
                  </span>
                </p>
              </div>

            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-sky-500 mb-4" />
              <p className="text-gray-600">No contract details available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractDetailsModal;
