import React, { useEffect, useState } from "react";
import {
  getWorkerApplications,
  getClientApplications,
  respondToApplication,
  startApplicationDiscussion,
  markApplicationAgreement,
} from "../api/jobApplication";
import {
  getMyInvitations,
  getMySentInvitations,
  respondToInvitation,
  startInvitationDiscussion,
  markInvitationAgreement,
} from "../api/applications.jsx";
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

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userType, setUserType] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [activeTab, setActiveTab] = useState("applications");

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

    const handleResponse = async (applicationId, status) => {
        try {
            await respondToApplication(applicationId, { status });
            setApplications((prev) =>
                prev.map((app) =>
                    app._id === applicationId ? { ...app, status } : app
                )
            );
            if (selectedApp?._id === applicationId) {
                setSelectedApp({ ...selectedApp, status });
            }
        } catch (err) {
            console.error("❌ Response failed:", err);
            alert(err.message || "Failed to respond to application");
        }

        const user = res.data.data;
        setUserType(user.userType);

        // Fetch applications
        let applicationsResponse;
        if (user.userType === "worker") {
          applicationsResponse = await getWorkerApplications();
        } else if (user.userType === "client") {
          applicationsResponse = await getClientApplications();
        }
        setApplications(applicationsResponse?.data?.applications || []);

        // Fetch invitations
        let invitationsResponse;
        if (user.userType === "worker") {
          invitationsResponse = await getMyInvitations();
        } else if (user.userType === "client") {
          invitationsResponse = await getMySentInvitations();
        }
        setInvitations(invitationsResponse || []);
      } catch (err) {
        console.error("❌ fetchData error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  // ==================== INVITATION HANDLERS ====================
  const handleInvitationResponse = async (invitationId, action) => {
    try {
      await respondToInvitation(invitationId, { action });

      // Refresh invitations to get updated status
      const user = await checkAuth();
      let response;
      if (user.data.data.userType === "worker") {
        response = await getMyInvitations();
      } else if (user.data.data.userType === "client") {
        response = await getMySentInvitations();
      }
      setInvitations(response || []);

      // Update selected invitation if it's the one we just responded to
      if (selectedInvitation?._id === invitationId) {
        const updatedInvitation = response?.find(
          (inv) => inv._id === invitationId
        );
        if (updatedInvitation) setSelectedInvitation(updatedInvitation);
      }
    } catch (err) {
      console.error("❌ Invitation response failed:", err);
      alert(err.message || "Failed to respond to invitation");
    }
  };

  const handleStartInvitationDiscussion = async (invitationId) => {
    try {
      const response = await startInvitationDiscussion(invitationId);

      // Refresh invitations
      const user = await checkAuth();
      let invitationsResponse;
      if (user.data.data.userType === "worker") {
        invitationsResponse = await getMyInvitations();
      } else if (user.data.data.userType === "client") {
        invitationsResponse = await getMySentInvitations();
      }
      setInvitations(invitationsResponse || []);

      // Update selected invitation
      if (selectedInvitation?._id === invitationId) {
        const updatedInvitation = invitationsResponse?.find(
          (inv) => inv._id === invitationId
        );
        if (updatedInvitation) setSelectedInvitation(updatedInvitation);
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
      console.error("❌ Start invitation discussion failed:", err);
      alert(err.message || "Failed to start discussion");
    }
  };

  const handleInvitationAgreement = async (invitationId, agreed) => {
    try {
      const response = await markInvitationAgreement(invitationId, { agreed });

      // Refresh invitations
      const user = await checkAuth();
      let invitationsResponse;
      if (user.data.data.userType === "worker") {
        invitationsResponse = await getMyInvitations();
      } else if (user.data.data.userType === "client") {
        invitationsResponse = await getMySentInvitations();
      }
      setInvitations(invitationsResponse || []);

      // Update selected invitation
      if (selectedInvitation?._id === invitationId) {
        const updatedInvitation = invitationsResponse?.find(
          (inv) => inv._id === invitationId
        );
        if (updatedInvitation) setSelectedInvitation(updatedInvitation);
      }

      if (response?.data?.contract) {
        alert(
          "🎉 Both parties agreed! Work contract has been created successfully!"
        );
      } else {
        alert(response?.message || "Agreement status updated!");
      }
    } catch (err) {
      console.error("❌ Invitation agreement failed:", err);
      alert(err.message || "Failed to update agreement");
    }
  };

  if (loading) {
    return (
        <div className="p-4 sm:p-6 mt-24 max-w-5xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">
                {userType === "worker" ? "My Job Applications" : "Applications Received"}
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
                                            ? `${app.clientId?.firstName || ""} ${app.clientId?.lastName || ""
                                            }`
                                            : `${app.workerId?.firstName || ""} ${app.workerId?.lastName || ""
                                            }`}
                                    </p>

                                    {/* Job Title (for worker) */}
                                    {userType === "worker" && (
                                        <p className="text-xs sm:text-sm text-gray-600 flex items-center truncate gap-2 mt-1 ">
                                            <Briefcase className="w-4 h-4" />
                                            {app.jobId?.description?.substring(0, 49) || "Job"}
                                        </p>
                                    )}

                                    {/* Cover Letter (preview only) */}
                                    <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2 mt-1">
                                        <FileText className="w-4 h-4" />
                                        {app.message?.substring(0, 40) || "No cover letter"}...
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT SIDE - STATUS / VIEW */}
                            <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
                                {/* Status Badge */}
                                <span
                                    className={`px-2 py-1 sm:px-3 rounded-lg text-xs sm:text-sm font-medium ${app.applicationStatus === "accepted"
                                            ? "bg-green-100 text-green-600"
                                            : app.applicationStatus === "rejected"
                                                ? "bg-red-100 text-red-600"
                                                : "bg-yellow-100 text-yellow-600"
                                        }`}
                                >
                                    {app.applicationStatus === "pending" ? "Pending" : app.applicationStatus}
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
                                        className={`font-medium ${selectedApp.applicationStatus === "accepted"
                                                ? "text-green-600"
                                                : selectedApp.applicationStatus === "rejected"
                                                    ? "text-red-600"
                                                    : "text-yellow-600"
                                            }`}
                                    >
                                        {selectedApp.applicationStatus}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Details Box */}
                        <div className="text-start py-4 shadow-sm rounded-md mb-4 px-2 space-y-3">
                            <p className="text-gray-700 flex items-start gap-2 text-sm sm:text-base">
                                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                <span>{selectedApp.message || "No cover letter"}</span>
                            </p>

                            <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                <Briefcase className="w-5 h-5 text-gray-400" />
                                <span>₱{selectedApp.proposedRate}</span>
                            </p>

                            {/* <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                <Clock className="w-5 h-5 text-gray-400" />
                                <span>
                                    {selectedApp.estimatedDuration?.value}{" "}
                                    {selectedApp.estimatedDuration?.unit}
                                </span>
                            </p> */}
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
                        {userType === "client" && selectedApp.status === "pending" && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-3 justify-end">
                                <button
                                    onClick={() => handleResponse(selectedApp._id, "accepted")}
                                    className="flex items-center gap-1 bg-[#55b3f3] text-white px-3 py-2 rounded-lg hover:bg-sky-600 cursor-pointer text-sm"
                                >
                                    <CheckCircle className="w-4 h-4" /> Accept
                                </button>
                                <button
                                    onClick={() => handleResponse(selectedApp._id, "rejected")}
                                    className="flex items-center gap-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 cursor-pointer text-sm"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
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
          ? "My Applications & Invitations"
          : "Applications & Invitations Sent"}
      </h1>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab("applications")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "applications"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab("invitations")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "invitations"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          {userType === "worker" ? "Invitations Received" : "Invitations Sent"}{" "}
          ({invitations.length})
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === "applications" && (
        <div>
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
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === "invitations" && (
        <div>
          {invitations.length === 0 ? (
            <p className="text-gray-500 text-center sm:text-left">
              {userType === "worker"
                ? "You have not received any invitations yet."
                : "You have not sent any invitations yet."}
            </p>
          ) : (
            <div className="grid gap-4 sm:gap-5">
              {invitations.map((invitation) => (
                <div
                  key={invitation._id}
                  onClick={() => setSelectedInvitation(invitation)}
                  className="bg-white shadow-md rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-lg transition-all duration-200 cursor-pointer group"
                >
                  {/* LEFT SIDE INFO */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                    <img
                      src={
                        userType === "worker"
                          ? invitation.clientId?.profilePicture?.url ||
                            "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                          : invitation.workerId?.profilePicture?.url ||
                            "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                      }
                      alt="Avatar"
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border"
                    />

                    <div>
                      {/* Client or Worker Name */}
                      <p className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                        <User className="w-4 h-4 text-blue-500" />
                        {userType === "worker"
                          ? `${invitation.clientId?.firstName || ""} ${
                              invitation.clientId?.lastName || ""
                            }`
                          : `${invitation.workerId?.firstName || ""} ${
                              invitation.workerId?.lastName || ""
                            }`}
                      </p>

                      {/* Job Title */}
                      <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Briefcase className="w-4 h-4" />
                        {invitation.jobId?.description?.substring(0, 50) ||
                          "Job"}
                      </p>

                      {/* Proposed Rate */}
                      <p className="text-xs sm:text-sm text-green-600 font-medium mt-1">
                        Proposed Rate: ${invitation.proposedRate}
                      </p>

                      {/* Description Preview */}
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <FileText className="w-4 h-4" />
                        {invitation.description?.substring(0, 40) ||
                          "No description"}
                        ...
                      </p>
                    </div>
                  </div>

                  {/* RIGHT SIDE - STATUS */}
                  <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
                    {/* Status Badge */}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invitation.invitationStatus === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : invitation.invitationStatus === "accepted" ||
                            invitation.invitationStatus === "both_agreed"
                          ? "bg-green-100 text-green-800"
                          : invitation.invitationStatus === "rejected"
                          ? "bg-red-100 text-red-800"
                          : invitation.invitationStatus === "in_discussion" ||
                            invitation.invitationStatus === "client_agreed" ||
                            invitation.invitationStatus === "worker_agreed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {invitation.invitationStatus === "pending"
                        ? "Pending"
                        : invitation.invitationStatus === "in_discussion"
                        ? "In Discussion"
                        : invitation.invitationStatus === "client_agreed"
                        ? "Client Agreed"
                        : invitation.invitationStatus === "worker_agreed"
                        ? "Worker Agreed"
                        : invitation.invitationStatus === "both_agreed"
                        ? "Both Agreed"
                        : invitation.invitationStatus === "accepted"
                        ? "Accepted"
                        : invitation.invitationStatus === "rejected"
                        ? "Rejected"
                        : invitation.invitationStatus}
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

      {/* ✅ Modal for Invitation Details */}
      {selectedInvitation && (
        <div className="fixed inset-0 bg-[#f4f6f6] bg-opacity-40 flex items-center justify-center z-50 px-3">
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 w-full max-w-md sm:max-w-lg relative">
            <button
              onClick={() => setSelectedInvitation(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
              Invitation Details
            </h2>

            {/* User Info */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <img
                src={
                  userType === "worker"
                    ? selectedInvitation.clientId?.profilePicture?.url ||
                      "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                    : selectedInvitation.workerId?.profilePicture?.url ||
                      "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                }
                alt="Profile"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border"
              />
              <div>
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                  {userType === "worker"
                    ? `${selectedInvitation.clientId?.firstName || ""} ${
                        selectedInvitation.clientId?.lastName || ""
                      }`
                    : `${selectedInvitation.workerId?.firstName || ""} ${
                        selectedInvitation.workerId?.lastName || ""
                      }`}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {userType === "worker" ? "Client" : "Worker"}
                </p>
              </div>
            </div>

            {/* Job Info */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 text-sm mb-1">Job:</h4>
              <p className="text-xs sm:text-sm text-gray-600">
                {selectedInvitation.jobId?.description || "No job description"}
              </p>
            </div>

            {/* Proposed Rate */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 text-sm mb-1">
                Proposed Rate:
              </h4>
              <p className="text-lg font-semibold text-green-600">
                ${selectedInvitation.proposedRate}
              </p>
            </div>

            {/* Invitation Description */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 text-sm mb-1">
                Message:
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {selectedInvitation.description || "No message provided"}
              </p>
            </div>

            {/* Status */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 text-sm mb-1">
                Status:
              </h4>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedInvitation.invitationStatus === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : selectedInvitation.invitationStatus === "accepted" ||
                      selectedInvitation.invitationStatus === "both_agreed"
                    ? "bg-green-100 text-green-800"
                    : selectedInvitation.invitationStatus === "rejected"
                    ? "bg-red-100 text-red-800"
                    : selectedInvitation.invitationStatus === "in_discussion" ||
                      selectedInvitation.invitationStatus === "client_agreed" ||
                      selectedInvitation.invitationStatus === "worker_agreed"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {selectedInvitation.invitationStatus === "pending"
                  ? "Pending"
                  : selectedInvitation.invitationStatus === "in_discussion"
                  ? "In Discussion"
                  : selectedInvitation.invitationStatus === "client_agreed"
                  ? "Client Agreed"
                  : selectedInvitation.invitationStatus === "worker_agreed"
                  ? "Worker Agreed"
                  : selectedInvitation.invitationStatus === "both_agreed"
                  ? "Both Agreed"
                  : selectedInvitation.invitationStatus === "accepted"
                  ? "Accepted"
                  : selectedInvitation.invitationStatus === "rejected"
                  ? "Rejected"
                  : selectedInvitation.invitationStatus}
              </span>
            </div>

            {/* Action Buttons */}
            {userType === "worker" &&
              selectedInvitation.invitationStatus === "pending" && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
                  <button
                    onClick={() =>
                      handleInvitationResponse(selectedInvitation._id, "accept")
                    }
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      handleStartInvitationDiscussion(selectedInvitation._id)
                    }
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Discuss
                  </button>
                  <button
                    onClick={() =>
                      handleInvitationResponse(selectedInvitation._id, "reject")
                    }
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

            {/* Agreement Buttons for Discussion Phase */}
            {selectedInvitation.invitationStatus === "in_discussion" && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
                <button
                  onClick={() =>
                    handleInvitationAgreement(selectedInvitation._id, true)
                  }
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Agree
                </button>
                <button
                  onClick={() =>
                    handleInvitationAgreement(selectedInvitation._id, false)
                  }
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Disagree
                </button>
              </div>
            )}

            {/* Agreement Status Messages */}
            {(selectedInvitation.invitationStatus === "client_agreed" ||
              selectedInvitation.invitationStatus === "worker_agreed") && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-800 text-sm font-medium">
                  {selectedInvitation.invitationStatus === "client_agreed"
                    ? "Client has agreed. Waiting for worker to agree."
                    : "Worker has agreed. Waiting for client to agree."}
                </p>
              </div>
            )}

            {/* Client Agreement Buttons */}
            {userType === "client" &&
              (selectedInvitation.invitationStatus === "in_discussion" ||
                selectedInvitation.invitationStatus === "worker_agreed" ||
                (selectedInvitation.invitationStatus === "client_agreed" &&
                  userType === "client")) && (
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() =>
                        handleInvitationAgreement(selectedInvitation._id, true)
                      }
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Agree to Terms
                    </button>
                    <button
                      onClick={() =>
                        handleInvitationAgreement(selectedInvitation._id, false)
                      }
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Decline Terms
                    </button>
                  </div>
                </div>
              )}

            {/* Worker Agreement Buttons */}
            {userType === "worker" &&
              (selectedInvitation.invitationStatus === "in_discussion" ||
                selectedInvitation.invitationStatus === "client_agreed" ||
                (selectedInvitation.invitationStatus === "worker_agreed" &&
                  userType === "worker")) && (
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() =>
                        handleInvitationAgreement(selectedInvitation._id, true)
                      }
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Agree to Terms
                    </button>
                    <button
                      onClick={() =>
                        handleInvitationAgreement(selectedInvitation._id, false)
                      }
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Decline Terms
                    </button>
                  </div>
                </div>
              )}

            {/* Status Messages */}
            {(selectedInvitation.invitationStatus === "accepted" ||
              selectedInvitation.invitationStatus === "both_agreed") && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-green-800 text-sm font-medium">
                  ✅{" "}
                  {selectedInvitation.invitationStatus === "both_agreed"
                    ? "Both parties agreed! Work contract has been created."
                    : "Invitation accepted! Work can now begin."}
                </p>
              </div>
            )}

            {selectedInvitation.invitationStatus === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm font-medium">
                  ❌ Invitation was rejected.
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
