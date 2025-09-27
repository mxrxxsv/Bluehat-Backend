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
} from "lucide-react";
import { checkAuth } from "../api/auth";

const ApplicationsPage = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userType, setUserType] = useState(null);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const res = await checkAuth();
                console.log("🔑 checkAuth response:", res?.data?.data);

                if (!res?.data?.success) {
                    setError("Not authenticated");
                    return;
                }

                const user = res.data.data;
                console.log("✅ Logged in user:", user.userType);
                setUserType(user.userType);

                let response;
                if (user.userType === "worker") {
                    response = await getWorkerApplications();
                } else if (user.userType === "client") {
                    response = await getClientApplications();
                }

                console.log("📦 Applications API response:", response);

                // ✅ Fix: dig into response.data.applications
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
        } catch (err) {
            console.error("❌ Response failed:", err);
            alert(err.message || "Failed to respond to application");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
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
        <div className="p-6 mt-30">
            <h1 className="text-xl font-bold text-gray-800 mb-4">
                {userType === "worker"
                    ? "My Job Applications"
                    : "Applications Received"}
            </h1>

            {applications.length === 0 ? (
                <p className="text-gray-500">
                    {userType === "worker"
                        ? "You have not applied to any jobs yet."
                        : "No applications received yet."}
                </p>
            ) : (
                <div className="grid gap-4 mt-10">
                    {applications.map((app) => (
                        <div
                            key={app._id}
                            className="bg-white shadow-md rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center border"
                        >
                            {/* LEFT SIDE INFO */}
                            <div className="flex items-start gap-4 flex-1">
                                <img
                                    src={
                                        userType === "worker"
                                            ? app.clientId?.profilePicture?.url &&
                                                app.clientId.profilePicture.url.trim() !== ""
                                                ? app.clientId.profilePicture.url
                                                : "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                                            : app.workerId?.profilePicture?.url &&
                                                app.workerId.profilePicture.url.trim() !== ""
                                                ? app.workerId.profilePicture.url
                                                : "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                                    }
                                    alt="Avatar"
                                    className="w-12 h-12 rounded-full object-cover border"
                                />

                                <div>
                                    {/* Worker or Client Name */}
                                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-500" />
                                        {userType === "worker"
                                            ? `${app.clientId?.firstName || ""} ${app.clientId?.lastName || ""}`
                                            : `${app.workerId?.firstName || ""} ${app.workerId?.lastName || ""}`}
                                    </p>


                                    {/* Job Title (for worker) */}
                                    {userType === "worker" && (
                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" />
                                            {app.jobId?.description?.substring(0, 50) || "Job"}
                                        </p>
                                    )}

                                    {/* Cover Letter */}
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        {app.coverLetter || "No cover letter"}
                                    </p>

                                    {/* Price & Duration */}
                                    <p className="text-sm text-gray-600 mt-1 text-left">
                                        Proposed Price:{" "}
                                        <span className="font-medium">₱{app.proposedPrice}</span>
                                    </p>
                                    <p className="text-sm text-gray-600 text-left">
                                        Duration:{" "}
                                        <span className="font-medium">
                                            {app.estimatedDuration?.value}{" "}
                                            {app.estimatedDuration?.unit}
                                        </span>
                                    </p>

                                    {/* Applied Date */}
                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Applied at:{" "}
                                        {app.appliedAt
                                            ? new Date(app.appliedAt).toLocaleString()
                                            : "N/A"}
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT SIDE ACTIONS */}
                            <div className="flex gap-2 mt-3 md:mt-0">
                                {userType === "client" && app.status === "pending" ? (
                                    <>
                                        <button
                                            onClick={() => handleResponse(app._id, "accepted")}
                                            className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Accept
                                        </button>
                                        <button
                                            onClick={() => handleResponse(app._id, "rejected")}
                                            className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                                        >
                                            <XCircle className="w-4 h-4" /> Reject
                                        </button>
                                    </>
                                ) : (
                                    <span
                                        className={`px-3 py-1 rounded-lg text-sm font-medium ${app.status === "accepted"
                                            ? "bg-green-100 text-green-600"
                                            : app.status === "rejected"
                                                ? "bg-red-100 text-red-600"
                                                : "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {app.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ApplicationsPage;
