import React, { useEffect, useState } from "react";
import {
  Users,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
  AlertTriangle,
  X,
  Loader,
  UserCheck,
  UserX,
  Star,
  MapPin,
  Phone,
  Calendar,
  Shield,
} from "lucide-react";
import {
  getWorkers,
  blockWorker,
  unblockWorker,
  getWorkerDetails,
} from "../Api/workermanagement";

const WorkerManagement = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingWorker, setBlockingWorker] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination and filtering states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statistics, setStatistics] = useState({
    total: 0,
    blocked: 0,
    active: 0,
    verified: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchWorkers();
  }, [
    currentPage,
    searchTerm,
    statusFilter,
    verificationFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      console.log("🔍 Fetching workers...");

      const params = {
        page: currentPage,
        search: searchTerm.trim() || undefined,
        // Backend expects `blockedStatus` for blocked/active/all
        blockedStatus: statusFilter,
        // Backend expects `verificationStatus` for verification filter
        verificationStatus: verificationFilter,
        sortBy,
        order: sortOrder,
      };

      console.log("📤 Request params:", params);

      const response = await getWorkers(params);
      console.log("📥 API Response:", response);

      if (response && response.success) {
        console.log("✅ Workers data:", response.data.workers);
        setWorkers(response.data.workers || []);

        // Update pagination info
        const pagination = response.data.pagination || {};
        setTotalPages(pagination.totalPages || 1);
        setTotalItems(pagination.totalItems || 0);

        // Update statistics
        setStatistics(
          response.data.statistics || {
            total: 0,
            blocked: 0,
            active: 0,
            approved: 0,
            pending: 0,
          }
        );
      } else {
        console.error("❌ API returned error:", response?.message);
        setWorkers([]);
      }
    } catch (error) {
      console.error("💥 Error fetching workers:", error);
      console.error("💥 Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setWorkers([]);

      alert(
        `Error loading workers: ${error.response?.data?.message || error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleVerificationFilter = (verification) => {
    setVerificationFilter(verification);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const viewWorkerDetails = async (worker) => {
    try {
      setActionLoading(true);
      const response = await getWorkerDetails(worker._id);
      if (response.success) {
        setSelectedWorker(response.data.worker);
        setShowModal(true);
      } else {
        alert("Failed to load worker details");
      }
    } catch (error) {
      console.error("Error loading worker details:", error);
      alert("Failed to load worker details");
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedWorker(null);
    setShowModal(false);
  };

  const openBlockModal = (worker) => {
    setBlockingWorker(worker);
    setBlockReason("");
    setShowBlockModal(true);
  };

  const closeBlockModal = () => {
    setBlockingWorker(null);
    setBlockReason("");
    setShowBlockModal(false);
  };

  const handleBlockWorker = async () => {
    if (!blockReason.trim()) {
      alert("Please provide a reason for blocking this worker.");
      return;
    }

    try {
      setActionLoading(true);

      const response = await blockWorker(blockingWorker._id, {
        reason: blockReason.trim(),
      });

      if (response.success) {
        await fetchWorkers();
        closeBlockModal();
        alert("Worker blocked successfully!");
      } else {
        alert(response.message || "Failed to block worker");
      }
    } catch (error) {
      console.error("Error blocking worker:", error);
      alert("Failed to block worker. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockWorker = async (worker) => {
    if (
      !confirm(
        `Are you sure you want to unblock ${worker.firstName} ${worker.lastName}?`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);

      const response = await unblockWorker(worker._id);

      if (response.success) {
        await fetchWorkers();
        alert("Worker unblocked successfully!");
      } else {
        alert(response.message || "Failed to unblock worker");
      }
    } catch (error) {
      console.error("Error unblocking worker:", error);
      alert("Failed to unblock worker. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const getVerificationBadge = (worker) => {
    if (worker.verificationStatus === "approved") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <UserCheck className="w-3 h-3 mr-1" />
          Verified
        </span>
      );
    } else if (worker.verificationStatus === "rejected") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <UserX className="w-3 h-3 mr-1" />
          Rejected
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
  };


  const getRatingDisplay = (rating) => {
    if (!rating || rating === 0) return "No ratings";
    return (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 text-yellow-500 fill-current" />
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="p-4 md:ml-64">
      <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-500" />
            Worker Management
          </h1>
          <div className="text-sm text-gray-500">
            Total: {totalItems} workers
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 mb-6">
          {/* Total Workers */}
          <div className="bg-blue-50 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Workers</p>
                <p className="text-2xl font-bold text-blue-800">{statistics.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          {/* Active Workers */}
          <div className="bg-green-50 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Workers</p>
                <p className="text-2xl font-bold text-green-800">{statistics.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          {/* Verified */}
          <div className="bg-purple-50 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Verified</p>
                <p className="text-2xl font-bold text-purple-800">{statistics.approved}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          {/* Pending */}
          {/* <div className="bg-yellow-50 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">{statistics.pending}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div> */}

          {/* Blocked */}
          <div className="bg-red-50 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Blocked</p>
                <p className="text-2xl font-bold text-red-800">{statistics.blocked}</p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>


        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusFilter("all")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === "all"
                ? "bg-[#55b3f3] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusFilter("active")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === "active"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Active
            </button>
            <button
              onClick={() => handleStatusFilter("blocked")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === "blocked"
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Blocked
            </button>
          </div>

          {/* Verification Filter */}
          <div className="flex gap-2">
            {/* <button
              onClick={() => handleVerificationFilter("all")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${verificationFilter === "all"
                ? "bg-purple-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              All
            </button> */}
            <button
              onClick={() => handleVerificationFilter("verified")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${verificationFilter === "verified"
                ? "bg-purple-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Verified
            </button>
            <button
              onClick={() => handleVerificationFilter("pending")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${verificationFilter === "pending"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Pending
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin w-8 h-8 text-blue-500" />
            <span className="ml-2 text-gray-500">Loading workers...</span>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No workers found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ||
                statusFilter !== "all" ||
                verificationFilter !== "all"
                ? "Try adjusting your search or filters."
                : "No workers have registered yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Profile</th>
                    <th
                      className="px-6 py-3 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("firstName")}
                    >
                      Name
                      {sortBy === "firstName" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("email")}
                    >
                      Email
                      {sortBy === "email" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Verification</th>
                    {/* <th className="px-6 py-3">Rating</th>
                    <th className="px-6 py-3">Skills</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Contact</th> */}
                    <th
                      className="px-6 py-3 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("createdAt")}
                    >
                      Join Date
                      {sortBy === "createdAt" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workers.map((worker) => (
                    <tr
                      key={worker._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <img
                          src={
                            worker.profilePicture?.url || "https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg"
                          }
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">
                          {worker.firstName}{" "}
                          {worker.middleName && `${worker.middleName} `}
                          {worker.lastName}
                          {worker.suffixName && ` ${worker.suffixName}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {worker.sex && `${worker.sex} • `}
                          {worker.dateOfBirth &&
                            `${calculateAge(worker.dateOfBirth)} years old`}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-gray-900">{worker.email}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {worker.userType}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {worker.blocked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Ban className="w-3 h-3 mr-1" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {getVerificationBadge(worker)}
                      </td>
                      {/* <td className="px-6 py-3">
                        {getRatingDisplay(worker.averageRating)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="max-w-32">
                          {worker.skills && worker.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {worker.skills.slice(0, 2).map((skill, index) => (
                                <span
                                  key={index}
                                  className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                              {worker.skills.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{worker.skills.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">
                              No skills listed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {worker.address?.city || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          {worker.contactNumber}
                        </div>
                      </td> */}
                      <td className="px-6 py-3 text-gray-500">
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3" />
                          {formatDate(worker.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => viewWorkerDetails(worker)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-[#55b3f3] text-white rounded hover:bg-sky-500 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          {worker.blocked ? (
                            <button
                              onClick={() => handleUnblockWorker(worker)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => openBlockModal(worker)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Ban className="w-3 h-3" />
                              Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({totalItems} total
                  workers)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const startPage = Math.max(1, currentPage - 2);
                    const pageNum = startPage + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${currentPage === pageNum
                          ? "bg-blue-500 text-white border-blue-500"
                          : "hover:bg-gray-50"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Worker Details Modal */}
        {showModal && selectedWorker && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#f4f6f6] bg-opacity-50 z-[2000]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  {/* Worker Details */}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Profile Section */}
                <div className="flex items-start space-x-6">
                  <img
                    src={
                      selectedWorker.profilePicture?.url || "https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg"
                    }
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-medium text-gray-900">
                      {selectedWorker.firstName}{" "}
                      {selectedWorker.middleName &&
                        `${selectedWorker.middleName} `}
                      {selectedWorker.lastName}{" "}
                      {selectedWorker.suffixName &&
                        ` ${selectedWorker.suffixName}`}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {selectedWorker.email}
                    </p>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500 capitalize">
                          {selectedWorker.userType}
                        </p>
                        {selectedWorker.blocked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Ban className="w-3 h-3 mr-1" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </span>
                        )}
                        {getVerificationBadge(selectedWorker)}
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-4">
                      {getRatingDisplay(selectedWorker.averageRating)}
                      {selectedWorker.totalJobs && (
                        <span className="text-sm text-gray-600">
                          {selectedWorker.totalJobs} completed jobs
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Block Reason */}
                {selectedWorker.blocked && selectedWorker.blockReason && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-800 mb-1">
                      Block Reason
                    </h4>
                    <p className="text-sm text-red-700">
                      {selectedWorker.blockReason}
                    </p>
                    {selectedWorker.blockedAt && (
                      <p className="text-xs text-red-600 mt-1">
                        Blocked on: {formatDate(selectedWorker.blockedAt)}
                      </p>
                    )}
                  </div>
                )}

                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-3">
                      Personal Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Gender:</span>{" "}
                        <span className="capitalize">{selectedWorker.sex}</span>
                      </div>
                      <div>
                        <span className="font-medium">Date of Birth:</span>{" "}
                        {selectedWorker.dateOfBirth
                          ? formatDOB(selectedWorker.dateOfBirth)
                          : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Age:</span>{" "}
                        {selectedWorker.dateOfBirth
                          ? `${calculateAge(
                            selectedWorker.dateOfBirth
                          )} years old`
                          : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Marital Status:</span>{" "}
                        <span className="capitalize">
                          {selectedWorker.maritalStatus || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-3">
                      Contact Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {selectedWorker.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        {selectedWorker.contactNumber}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                {selectedWorker.address && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-3">Address</h4>
                    <div className="text-sm text-gray-600">
                      {selectedWorker.address.street},{" "}
                      {selectedWorker.address.barangay},{" "}
                      {selectedWorker.address.city},{" "}
                      {selectedWorker.address.province},{" "}
                      {selectedWorker.address.region}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {selectedWorker.skills && selectedWorker.skills.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorker.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work History */}
                {selectedWorker.experience &&
                  selectedWorker.experience.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-3">
                        Work Experience
                      </h4>
                      <div className="space-y-3">
                        {selectedWorker.experience.map((exp, index) => (
                          <div
                            key={index}
                            className="border-l-2 border-blue-200 pl-3"
                          >
                            <h5 className="font-medium text-gray-800">
                              {exp.position}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {exp.companyName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {exp.startYear} - {exp.endYear || "Present"}
                            </p>
                            {exp.responsibilities && (
                              <p className="text-sm text-gray-600 mt-1">
                                {exp.responsibilities}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Account Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-3">
                    Account Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Joined:</span>{" "}
                      {formatDate(selectedWorker.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Account ID:</span>{" "}
                      {selectedWorker._id}
                    </div>
                    {selectedWorker.credentialId && (
                      <div>
                        <span className="font-medium">Credential ID:</span>{" "}
                        {selectedWorker.credentialId}
                      </div>
                    )}
                    {selectedWorker.isVerified && selectedWorker.verifiedAt && (
                      <div>
                        <span className="font-medium">Verified Date:</span>{" "}
                        {formatDate(selectedWorker.verifiedAt)}
                      </div>
                    )}
                    {selectedWorker.lastLogin && (
                      <div>
                        <span className="font-medium">Last Login:</span>{" "}
                        {formatDate(selectedWorker.lastLogin)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 mt-6">
                {selectedWorker.blocked ? (
                  <button
                    onClick={() => {
                      handleUnblockWorker(selectedWorker);
                      closeModal();
                    }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Unblock Worker
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      closeModal();
                      openBlockModal(selectedWorker);
                    }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Ban className="w-4 h-4" />
                    Block Worker
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Block Worker Modal */}
        {showBlockModal && blockingWorker && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#f4f6f6] bg-opacity-50 z-[2000]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Block Worker
                </h2>
                <button
                  onClick={closeBlockModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  You are about to block:
                </p>
                <p className="font-medium text-gray-900">
                  {blockingWorker.firstName} {blockingWorker.lastName}
                </p>
                <p className="text-sm text-gray-500">{blockingWorker.email}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for blocking *
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Please provide a reason for blocking this worker..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {blockReason.length}/200 characters
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeBlockModal}
                  disabled={actionLoading}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockWorker}
                  disabled={actionLoading || !blockReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  Block Worker
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerManagement;
