import React, { useEffect, useState } from "react";
import { Users, Eye } from "lucide-react";
import { getClients, getClientsWithFetch } from "../Api/clientmanagement";

const ClientManagement = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchClients(true); // Always load decrypted data
    }, []);

    const fetchClients = async (decrypt = true) => {
        try {
            console.log(`Fetching clients with decrypt=${decrypt}...`);
            setLoading(true);

            // First try with axios
            let res;
            try {
                res = await getClients(decrypt); // Pass decrypt parameter
                console.log("Axios response received:", res);
            } catch (axiosError) {
                console.warn("Axios failed, trying with fetch:", axiosError.message);
                // Fallback to native fetch with decrypt parameter
                res = await getClientsWithFetch(decrypt);
                console.log("Fetch response received:", res);
            }

            // Handle different response structures
            let clientsData = [];
            if (Array.isArray(res)) {
                console.log("Response is direct array");
                clientsData = res;
            } else if (res && res.data && Array.isArray(res.data)) {
                console.log("Response has data property");
                clientsData = res.data;
            } else if (res && typeof res === "object") {
                console.log("Response is object, checking for clients property");
                clientsData = Array.isArray(res.clients) ? res.clients : [];
            }

            console.log("Final clients data:", clientsData);
            console.log("Number of clients found:", clientsData.length);

            setClients(clientsData);
        } catch (err) {
            console.error("All fetch methods failed:", err);
            console.error("Error details:", {
                name: err.name,
                message: err.message,
                stack: err.stack,
            });
            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    const viewClientDetails = (client) => {
        setSelectedClient(client);
        setShowModal(true);
    };

    const closeModal = () => {
        setSelectedClient(null);
        setShowModal(false);
    };

    const formatDOB = (dobString) => {
        if (!dobString) return "N/A";
        return new Date(dobString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const calculateAge = (dobString) => {
        if (!dobString) return null;
        const dob = new Date(dobString);
        const diffMs = Date.now() - dob.getTime();
        const ageDate = new Date(diffMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="p-4 sm:ml-64">
            <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="w-7 h-7 text-blue-500" />
                        Client Management
                    </h1>
                    <div className="text-sm text-gray-500">
                        Total Clients: {clients.length}
                    </div>
                </div>

                {/* Data Status Notice */}
                <div className="mb-4 p-3 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <p className="text-sm text-green-800">
                            <span className="font-medium">Decrypted Data:</span> Showing{" "}
                            {clients.length} clients with decrypted sensitive information.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-gray-500">Loading clients...</span>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            No clients found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            No clients have registered yet.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow">
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Profile</th>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Gender</th>
                                    <th className="px-6 py-3">City</th>
                                    <th className="px-6 py-3">Contact Number</th>
                                    <th className="px-6 py-3">Join Date</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {clients.map((client) => (
                                    <tr
                                        key={client._id}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-3">
                                            <img
                                                src={
                                                    client.profilePicture?.url || "/default-avatar.png"
                                                }
                                                alt="Profile"
                                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-gray-900">
                                                {client.firstName}{" "}
                                                {client.middleName && `${client.middleName} `}
                                                {client.lastName}
                                                {client.suffixName && ` ${client.suffixName}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-gray-900">{client.email}</div>
                                            <div className="text-xs text-gray-500 capitalize">
                                                {client.userType}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 capitalize">{client.sex}</td>
                                        <td className="px-6 py-3">{client.address?.city}</td>
                                        <td className="px-6 py-3">{client.contactNumber}</td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDate(client.createdAt)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <button
                                                onClick={() => viewClientDetails(client)}
                                                className="flex items-center gap-1 px-3 py-1 text-xs bg-[#55b3f3] text-white rounded-lg hover:bg-blue-400 transition-colors cursor-pointer"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Client Details Modal */}
                {showModal && selectedClient && (
                    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-40 z-[1000]">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    Client Details
                                    {/* <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-600 rounded">
                                        Decrypted
                                    </span> */}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Profile Section */}
                                <div className="flex items-center space-x-4">
                                    <img
                                        src={
                                            selectedClient.profilePicture?.url ||
                                            "/default-avatar.png"
                                        }
                                        alt="Profile"
                                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                                    />
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {selectedClient.firstName}{" "}
                                            {selectedClient.middleName &&
                                                `${selectedClient.middleName} `}
                                            {selectedClient.lastName}{" "}
                                            {selectedClient.suffixName &&
                                                ` ${selectedClient.suffixName}`}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {selectedClient.email}
                                        </p>
                                        <p className="text-sm text-gray-500 capitalize">
                                            {selectedClient.userType}
                                        </p>
                                    </div>
                                </div>

                                {/* Personal Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-700 mb-1">
                                            Personal Information
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <span className="font-medium">Gender:</span>{" "}
                                                <span className="capitalize">{selectedClient.sex}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Date of Birth:</span>{" "}
                                                {selectedClient.dateOfBirth
                                                    ? `${formatDOB(selectedClient.dateOfBirth)}`
                                                    : "N/A"}
                                            </div>
                                            <div>
                                                <span className="font-medium">Age: </span>{" "}
                                                 {selectedClient.dateOfBirth
                                                    ? `${calculateAge(selectedClient.dateOfBirth)} years old`
                                                    : "N/A"}
                                            </div>

                                            <div>
                                                <span className="font-medium">Marital Status:</span>{" "}
                                                <span className="capitalize">
                                                    {selectedClient.maritalStatus || "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-700 mb-2">
                                            Contact Information
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <span className="font-medium">Email:</span>{" "}
                                                {selectedClient.email}
                                            </div>
                                            <div>
                                                <span className="font-medium">Phone:</span>{" "}
                                                {selectedClient.contactNumber}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Address Information */}
                                {selectedClient.address && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-700 mb-1">Address</h4>
                                        <div className="text-sm text-gray-600">
                                            {selectedClient.address.street},{" "}
                                            {selectedClient.address.barangay},{" "}
                                            {selectedClient.address.city},{" "}
                                            {selectedClient.address.province},{" "}
                                            {selectedClient.address.region}
                                        </div>
                                    </div>
                                )}

                                {/* Account Information */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-700 mb-1">
                                        Account Information
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="font-medium">Joined:</span>{" "}
                                            {formatDate(selectedClient.createdAt)}
                                        </div>
                                        <div>
                                            <span className="font-medium">Account ID:</span>{" "}
                                            {selectedClient._id}
                                        </div>
                                        {selectedClient.credentialId && (
                                            <div>
                                                <span className="font-medium">Credential ID:</span>{" "}
                                                {selectedClient.credentialId}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end mt-2">
                                {/* <button
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                                >
                                    Close
                                </button> */}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientManagement;
