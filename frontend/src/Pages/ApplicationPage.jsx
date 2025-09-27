import React, { useEffect, useState } from "react";
import {
    getWorkerApplications,
    getClientApplications,
    respondToApplication,
} from "../api/jobApplication";
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
} from "lucide-react";
import { checkAuth } from "../api/auth";

const ApplicationsPage = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userType, setUserType] = useState(null);
    const [selectedApp, setSelectedApp] = useState(null);

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
                                        <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 mt-1">
                                            <Briefcase className="w-4 h-4" />
                                            {app.jobId?.description?.substring(0, 50) || "Job"}
                                        </p>
                                    )}

                                    {/* Cover Letter (preview only) */}
                                    <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2 mt-1">
                                        <FileText className="w-4 h-4" />
                                        {app.coverLetter?.substring(0, 40) || "No cover letter"}...
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT SIDE - STATUS / VIEW */}
                            <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
                                {/* Status Badge */}
                                <span
                                    className={`px-2 py-1 sm:px-3 rounded-lg text-xs sm:text-sm font-medium ${app.status === "accepted"
                                            ? "bg-green-100 text-green-600"
                                            : app.status === "rejected"
                                                ? "bg-red-100 text-red-600"
                                                : "bg-yellow-100 text-yellow-600"
                                        }`}
                                >
                                    {app.status === "pending" ? "Pending" : app.status}
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
                                        className={`font-medium ${selectedApp.status === "accepted"
                                                ? "text-green-600"
                                                : selectedApp.status === "rejected"
                                                    ? "text-red-600"
                                                    : "text-yellow-600"
                                            }`}
                                    >
                                        {selectedApp.status}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Details Box */}
                        <div className="text-start py-4 shadow-sm rounded-md mb-4 px-2 space-y-3">
                            <p className="text-gray-700 flex items-start gap-2 text-sm sm:text-base">
                                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                <span>{selectedApp.coverLetter || "No cover letter"}</span>
                            </p>

                            <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                <Briefcase className="w-5 h-5 text-gray-400" />
                                <span>₱{selectedApp.proposedPrice}</span>
                            </p>

                            <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                <Clock className="w-5 h-5 text-gray-400" />
                                <span>
                                    {selectedApp.estimatedDuration?.value}{" "}
                                    {selectedApp.estimatedDuration?.unit}
                                </span>
                            </p>
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
};

export default ApplicationsPage;
