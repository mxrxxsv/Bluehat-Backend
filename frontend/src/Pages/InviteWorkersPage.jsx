import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Filter, MapPin, Star, ArrowLeft } from "lucide-react";
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
          navigate("/dashboard");
          return;
        }

        setCurrentUser(authRes.data.data);
        await loadJobAndWorkers();
      } catch (error) {
        console.error("Failed to initialize page:", error);
        navigate("/dashboard");
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-64 mt-24">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {job && (
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Invite Workers for: {job.title}
              </h1>
              <p className="text-gray-600 mb-4">{job.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                <span>Budget: ₱{job.budget}</span>
                <span>Duration: {job.duration}</span>
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

              <select
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
              </select>
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
