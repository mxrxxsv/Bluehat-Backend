import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Filter, MapPin, Star, ArrowLeft, X, Briefcase } from "lucide-react";
import Header from "../components/Header";
import WorkerInvitationCard from "../components/WorkerInvitationCard";
import { checkAuth } from "../api/auth";
import { getJobById } from "../api/jobs.jsx";
import { searchWorkers } from "../api/worker.jsx";

const InviteWorkersPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [job, setJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    minRating: "",
    experienceLevel: "",
    availability: "",
  });

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Check auth first
        const authRes = await checkAuth();
        if (
          !authRes?.data?.success ||
          authRes.data.data.userType !== "client"
        ) {
          navigate("/find-work");
          return;
        }

        setCurrentUser(authRes.data.data);
        await loadJobAndWorkers();
      } catch (error) {
        console.error("Failed to initialize page:", error);
        navigate("/find-work");
      }
    };

    initializePage();
  }, [jobId, navigate]);

  const loadJobAndWorkers = async () => {
    try {
      setLoading(true);

      // Load job details
      const jobResponse = await getJobById(jobId);
      const jobData = jobResponse.data.data || jobResponse.data;
      setJob(jobData);

      // Load available workers
      const workerData = await searchWorkers();

      // Extract workers array from response
      const workersArray = workerData.workers || [];

      setWorkers(workersArray);
      setFilteredWorkers(workersArray);
    } catch (error) {
      console.error("Failed to load data:", error);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, workers]);

  const applyFilters = () => {
    let filtered = workers;

    // Search by name or skills
    if (searchTerm) {
      filtered = filtered.filter((worker) => {
        const name = `${worker.firstName} ${worker.lastName}`.toLowerCase();
        const skills = worker.skills?.join(" ").toLowerCase() || "";
        const bio = worker.bio?.toLowerCase() || "";
        const search = searchTerm.toLowerCase();

        return (
          name.includes(search) ||
          skills.includes(search) ||
          bio.includes(search)
        );
      });
    }

    // Filter by location
    if (filters.location) {
      filtered = filtered.filter((worker) =>
        worker.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Filter by minimum rating
    if (filters.minRating) {
      filtered = filtered.filter(
        (worker) => worker.rating >= Number(filters.minRating)
      );
    }

    // Filter by experience level
    if (filters.experienceLevel) {
      filtered = filtered.filter(
        (worker) => worker.experienceLevel === filters.experienceLevel
      );
    }

    // Filter by availability
    if (filters.availability) {
      filtered = filtered.filter(
        (worker) => worker.availability === filters.availability
      );
    }

    setFilteredWorkers(filtered);
  };

  const handleInviteSent = () => {
    // Refresh or update UI after invitation is sent
    alert(
      "Invitation sent! You can track responses in your applications page."
    );
  };

  if (!currentUser || currentUser.userType !== "client") {
    return <div>Access denied. Clients only.</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 mt-24 space-y-8 mt-35">
          {/* Header Skeleton */}
          <div className="bg-white rounded-xl p-6 shadow-md animate-pulse">
            <div className="h-6 w-1/3 bg-gray-200 rounded mb-3"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded mb-4"></div>
            <div className="flex flex-wrap gap-3">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-4 w-28 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Search & Filter Skeleton */}
          <div className="bg-white rounded-xl p-6 shadow-md animate-pulse">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="h-10 w-full bg-gray-200 rounded-lg"></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>

          {/* Result Count Skeleton */}
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>

          {/* Worker Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-xl shadow-md animate-pulse flex flex-col items-start gap-3"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>

                <div className="h-3 bg-gray-200 rounded w-4/5 mt-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/5"></div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>

                <div className="mt-4 h-8 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      <div className="max-w-7xl mx-auto px-4 py-8 mt-25">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/find-work")}
            className="flex items-center gap-2 text-[#55b3f3] hover:text-sky-500 mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {job && (
            <div className="space-y-4 pb-4">
              <div className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block">
                <div className="rounded-xl p-4 bg-white transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">

                      <img
                        src={job.client?.profilePicture || currentUser.avatar}
                        alt="Client Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />

                      <span className="text-sm font-medium text-[#252525] opacity-75">
                        {job.client?.name || "Client Name"}
                      </span>
                    </div>
    
                    <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                      {/* <Clock size={16} /> */}
                      {new Date(job.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                  </div>
                  <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5">
                      <Briefcase size={20} className="text-blue-400" />
                    </span>
                    <span className="line-clamp-1 md:text-base">{job.description}</span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-sm">
                      {job.category?.name || "Uncategorized"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-4 text-sm text-gray-600 ">
                    <span className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span className="truncate overflow-hidden max-w-45 md:max-w-full md:text-base text-gray-500">{job.location}</span>
                    </span>
                    <span className="font-bold text-green-400">
                      ₱{job.price?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-6 shadow-md mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, skills, or bio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.location}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, location: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                <option value="Manila">Manila</option>
                <option value="Cebu">Cebu</option>
                <option value="Davao">Davao</option>
                <option value="Remote">Remote</option>
              </select>

              <select
                value={filters.minRating}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, minRating: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="5">5 Stars</option>
              </select>

              {/* <select
                value={filters.experienceLevel}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    experienceLevel: e.target.value,
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Experience</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>

              <select
                value={filters.availability}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    availability: e.target.value,
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Availability</option>
                <option value="Available">Available</option>
                <option value="Busy">Busy</option>
                <option value="Part-time">Part-time</option>
              </select> */}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredWorkers.length} of {workers.length} workers
          </p>
        </div>

        {/* Workers Grid */}
        {filteredWorkers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No workers found matching your criteria.
            </p>
            <p className="text-gray-400 mt-2">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkers.map((worker) => (
              <WorkerInvitationCard
                key={worker._id}
                worker={worker}
                jobId={jobId}
                onInviteSent={handleInviteSent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteWorkersPage;
