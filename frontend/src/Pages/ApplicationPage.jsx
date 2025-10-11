import React, { useEffect, useState } from "react";
import {
  getWorkerApplications,
  getClientApplications,
  respondToApplication,
  startApplicationDiscussion,
  markApplicationAgreement,
} from "../api/jobApplication";
import { getMyInvitations } from "../api/applications.jsx";
import {
  Loader,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  X,
  Eye,
  MessageCircle,
  Users,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { checkAuth } from "../api/auth";
import { createOrGetConversation } from "../api/message";
import { useNavigate } from "react-router-dom";

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userType, setUserType] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState("applications");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await checkAuth();
        if (!res?.data?.success) {
          setError("Not authenticated");
          return;
        }

        const user = res.data.data;
        setUserType(user.userType);

        let response;
        if (user.userType === "worker") {
          response = await getWorkerApplications();
        } else if (user.userType === "client") {
          response = await getClientApplications();
        }

        setApplications(response?.data?.applications || []);
      } catch (err) {
        console.error("❌ fetchApplications error:", err);
        setError(err.message || "Failed to load applications");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleResponse = async (applicationId, action) => {
    try {
      await respondToApplication(applicationId, { action });
      // Refresh applications to get updated status
      const user = await checkAuth();
      let response;
      if (user.data.data.userType === "worker") {
        response = await getWorkerApplications();
      } else if (user.data.data.userType === "client") {
        response = await getClientApplications();
      }
      setApplications(response?.data?.applications || []);

      // Update selected app if it's the one we just responded to
      if (selectedApp?._id === applicationId) {
        const updatedApp = response?.data?.applications?.find(
          (app) => app._id === applicationId
        );
        if (updatedApp) setSelectedApp(updatedApp);
      }
    } catch (err) {
      console.error("❌ Response failed:", err);
      alert(err.message || "Failed to respond to application");
    }
  };

  const handleStartDiscussion = async (applicationId) => {
    try {
      const response = await startApplicationDiscussion(applicationId);

      // Refresh applications
      const user = await checkAuth();
      let appsResponse;
      if (user.data.data.userType === "worker") {
        appsResponse = await getWorkerApplications();
      } else if (user.data.data.userType === "client") {
        appsResponse = await getClientApplications();
      }
      setApplications(appsResponse?.data?.applications || []);

      // Update selected app
      if (selectedApp?._id === applicationId) {
        const updatedApp = appsResponse?.data?.applications?.find(
          (app) => app._id === applicationId
        );
        if (updatedApp) setSelectedApp(updatedApp);
      }

      // Create or get conversation for messaging
      if (response?.data?.conversationInfo) {
        try {
          await createOrGetConversation(response.data.conversationInfo);
          alert("Discussion started! You can now message each other.");
        } catch (msgErr) {
          console.warn("Conversation creation failed:", msgErr);
          alert("Discussion started, but messaging may not be available.");
        }
      }
    } catch (err) {
      console.error("❌ Start discussion failed:", err);
      alert(err.message || "Failed to start discussion");
    }
  };

  const handleAgreement = async (applicationId, agreed) => {
    try {
      const response = await markApplicationAgreement(applicationId, agreed);

      // Refresh applications
      const user = await checkAuth();
      let appsResponse;
      if (user.data.data.userType === "worker") {
        appsResponse = await getWorkerApplications();
      } else if (user.data.data.userType === "client") {
        appsResponse = await getClientApplications();
      }
      setApplications(appsResponse?.data?.applications || []);

      // Update selected app
      if (selectedApp?._id === applicationId) {
        const updatedApp = appsResponse?.data?.applications?.find(
          (app) => app._id === applicationId
        );
        if (updatedApp) setSelectedApp(updatedApp);
      }

      if (response?.data?.contract) {
        alert(
          "🎉 Both parties agreed! Work contract has been created successfully!"
        );
      } else {
        alert(response?.message || "Agreement status updated!");
      }
    } catch (err) {
      console.error("❌ Agreement failed:", err);
      alert(err.message || "Failed to update agreement");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 mt-20">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-500 font-medium mt-10">{error}</p>
    );
  }

  return (
    <div className="p-4 sm:p-6 mt-24 max-w-5xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">
        {userType === "worker"
          ? "My Job Applications"
          : "Applications Received"}
      </h1>

      {applications.length === 0 ? (
        <p className="text-gray-500 text-center sm:text-left">
          {userType === "worker"
            ? "You have not applied to any jobs yet."
            : "No applications received yet."}
        </p>
      ) : (
        <div className="grid gap-4 sm:gap-5">
          {applications.map((app) => (
            <div
              key={app._id}
              onClick={() => setSelectedApp(app)}
              className="bg-white shadow-md rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              {/* LEFT SIDE INFO */}
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                <img
                  src={
                    userType === "worker"
                      ? app.clientId?.profilePicture?.url ||
                        "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                      : app.workerId?.profilePicture?.url ||
                        "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                  }
                  alt="Avatar"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border"
                />

                <div>
                  {/* Worker or Client Name */}
                  <p className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                    <User className="w-4 h-4 text-blue-500" />
                    {userType === "worker"
                      ? `${app.clientId?.firstName || ""} ${
                          app.clientId?.lastName || ""
                        }`
                      : `${app.workerId?.firstName || ""} ${
                          app.workerId?.lastName || ""
                        }`}
                  </p>

                  {/* Job Title (for worker) */}
                  {userType === "worker" && (
                    <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <Briefcase className="w-4 h-4" />
                      {app.jobId?.description?.substring(0, 50) || "Job"}
                    </p>
                  )}

                  {/* Cover Letter (preview only) */}
                  <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <FileText className="w-4 h-4" />
                    {app.message?.substring(0, 40) || "No message"}...
                  </p>
                </div>
              </div>

              {/* RIGHT SIDE - STATUS / VIEW */}
              <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
                {/* Status Badge */}
                <span
                  className={`px-2 py-1 sm:px-3 rounded-lg text-xs sm:text-sm font-medium ${
                    app.applicationStatus === "accepted"
                      ? "bg-green-100 text-green-600"
                      : app.applicationStatus === "rejected"
                      ? "bg-red-100 text-red-600"
                      : app.applicationStatus === "in_discussion"
                      ? "bg-blue-100 text-blue-600"
                      : app.applicationStatus === "client_agreed" ||
                        app.applicationStatus === "worker_agreed"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {app.applicationStatus === "pending"
                    ? "Pending"
                    : app.applicationStatus === "in_discussion"
                    ? "In Discussion"
                    : app.applicationStatus === "client_agreed"
                    ? "Client Agreed"
                    : app.applicationStatus === "worker_agreed"
                    ? "Worker Agreed"
                    : app.applicationStatus === "both_agreed"
                    ? "Both Agreed"
                    : app.applicationStatus}
                </span>

                {/* View Details Icon */}
                <div className="flex items-center gap-1 text-blue-500 group-hover:text-blue-600 text-xs sm:text-sm font-medium">
                  <Eye className="w-4 h-4" />
                  View
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Modal for Full Details */}
      {selectedApp && (
        <div className="fixed inset-0 bg-[#f4f6f6] bg-opacity-40 flex items-center justify-center z-50 px-3">
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 w-full max-w-md sm:max-w-lg relative">
            <button
              onClick={() => setSelectedApp(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
              Application Details
            </h2>

            {/* User Info */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <img
                src={
                  userType === "worker"
                    ? selectedApp.clientId?.profilePicture?.url ||
                      "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                    : selectedApp.workerId?.profilePicture?.url ||
                      "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                }
                alt="Avatar"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border object-cover"
              />
              <div>
                <p className="font-semibold text-gray-800 text-sm sm:text-base">
                  {userType === "worker"
                    ? `${selectedApp.clientId?.firstName} ${selectedApp.clientId?.lastName}`
                    : `${selectedApp.workerId?.firstName} ${selectedApp.workerId?.lastName}`}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  Status:{" "}
                  <span
                    className={`font-medium ${
                      selectedApp.applicationStatus === "accepted"
                        ? "text-green-600"
                        : selectedApp.applicationStatus === "rejected"
                        ? "text-red-600"
                        : selectedApp.applicationStatus === "in_discussion"
                        ? "text-blue-600"
                        : selectedApp.applicationStatus === "client_agreed" ||
                          selectedApp.applicationStatus === "worker_agreed"
                        ? "text-yellow-600"
                        : "text-gray-600"
                    }`}
                  >
                    {selectedApp.applicationStatus === "in_discussion"
                      ? "In Discussion"
                      : selectedApp.applicationStatus === "client_agreed"
                      ? "Client Agreed"
                      : selectedApp.applicationStatus === "worker_agreed"
                      ? "Worker Agreed"
                      : selectedApp.applicationStatus === "both_agreed"
                      ? "Both Agreed"
                      : selectedApp.applicationStatus}
                  </span>
                </p>
              </div>
            </div>

            {/* Details Box */}
            <div className="text-start py-4 shadow-sm rounded-md mb-4 px-2 space-y-3">
              <p className="text-gray-700 flex items-start gap-2 text-sm sm:text-base">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <span>{selectedApp.message || "No message"}</span>
              </p>

              <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <span>₱{selectedApp.proposedRate}</span>
              </p>

              {selectedApp.estimatedDuration && (
                <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span>
                    {selectedApp.estimatedDuration?.value}{" "}
                    {selectedApp.estimatedDuration?.unit}
                  </span>
                </p>
              )}
            </div>

            {/* Applied Date */}
            <p className="text-gray-500 text-xs sm:text-sm mb-4 text-start">
              <Clock className="w-3 h-3 inline mr-1" />
              Applied at:{" "}
              {selectedApp.appliedAt
                ? new Date(selectedApp.appliedAt).toLocaleString()
                : "N/A"}
            </p>

            {/* Client actions */}
            {userType === "client" &&
              selectedApp.applicationStatus === "pending" && (
                <div className="flex flex-col sm:flex-row gap-2 mt-3 justify-end">
                  <button
                    onClick={() => handleResponse(selectedApp._id, "accept")}
                    className="flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 cursor-pointer text-sm"
                  >
                    <CheckCircle className="w-4 h-4" /> Accept Directly
                  </button>
                  <button
                    onClick={() => handleStartDiscussion(selectedApp._id)}
                    className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 cursor-pointer text-sm"
                  >
                    <MessageCircle className="w-4 h-4" /> Start Discussion
                  </button>
                  <button
                    onClick={() => handleResponse(selectedApp._id, "reject")}
                    className="flex items-center gap-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 cursor-pointer text-sm"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}

            {/* Discussion phase actions */}
            {selectedApp.applicationStatus === "in_discussion" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">
                    Discussion Phase
                  </h3>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  You can now message each other to discuss the project details
                  and validate if this is legitimate.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleAgreement(selectedApp._id, true)}
                    className="flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 cursor-pointer text-sm"
                  >
                    <ThumbsUp className="w-4 h-4" /> I Agree to Proceed
                  </button>
                  <button
                    onClick={() => handleAgreement(selectedApp._id, false)}
                    className="flex items-center gap-1 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 cursor-pointer text-sm"
                  >
                    <ThumbsDown className="w-4 h-4" /> I Don't Agree
                  </button>
                </div>
              </div>
            )}

            {/* Agreement status display */}
            {(selectedApp.applicationStatus === "client_agreed" ||
              selectedApp.applicationStatus === "worker_agreed") && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">
                    Waiting for Agreement
                  </h3>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  {selectedApp.applicationStatus === "client_agreed"
                    ? "Client has agreed. Waiting for worker to agree."
                    : "Worker has agreed. Waiting for client to agree."}
                </p>
                {((userType === "client" &&
                  selectedApp.applicationStatus === "worker_agreed") ||
                  (userType === "worker" &&
                    selectedApp.applicationStatus === "client_agreed")) && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleAgreement(selectedApp._id, true)}
                      className="flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 cursor-pointer text-sm"
                    >
                      <ThumbsUp className="w-4 h-4" /> I Agree Too!
                    </button>
                    <button
                      onClick={() => handleAgreement(selectedApp._id, false)}
                      className="flex items-center gap-1 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 cursor-pointer text-sm"
                    >
                      <ThumbsDown className="w-4 h-4" /> I Don't Agree
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success state */}
            {selectedApp.applicationStatus === "accepted" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">
                    Contract Created!
                  </h3>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Both parties have agreed. A work contract has been created and
                  the work can begin.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;
