import { useState, useEffect } from "react";
import {
  MapPin,
  Briefcase,
  Clock,
  Search,
  X,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { checkAuth } from "../api/auth";
import { getAllJobs, postJob as createJob } from "../api/jobs";
import axios from "axios";
import AddressInput from "../components/AddressInput";
import PortfolioSetup from "../components/PortfolioSetup";
import IDSetup from "../components/IDSetup";
import VerificationNotice from "../components/VerificationNotice";

const currentUser = {
  avatar:
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
};

const FindWork = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For input field
  const [location, setLocation] = useState("");
  const [locationInput, setLocationInput] = useState(""); // For input field
  const [jobPosts, setJobPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPortfolioSetup, setShowPortfolioSetup] = useState(false);

  const [loading, setLoading] = useState(true);

  // Cache of client ratings: { [clientId]: { averageRating, totalReviews } }
  const [clientRatings, setClientRatings] = useState({});

  const [newJob, setNewJob] = useState({
    description: "",
    location: "",
    priceOffer: "",
  });

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  // New: filter category for searching jobs
  const [filterCategory, setFilterCategory] = useState("");

  // Sorting states
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  // NEW: Draft and confirm modal state
  const [draft, setDraft] = useState(null);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);

  const [showIdSetup, setShowIdSetup] = useState(false);

  // NEW: Reset form helper
  const resetForm = () => {
    setNewJob({ description: "", location: "", priceOffer: "" });
    setSelectedCategory("");
  };

  // NEW: Handle modal close with draft check
  const handleCloseModal = () => {
    const hasInput =
      newJob.description ||
      newJob.location ||
      newJob.priceOffer ||
      selectedCategory;

    if (hasInput) {
      setShowDraftConfirm(true);
    } else {
      resetForm();
      setIsModalOpen(false);
    }
  };

  // NEW: Save/Discard draft
  const handleSaveDraft = () => {
    setDraft({ ...newJob, category: selectedCategory });
    setShowDraftConfirm(false);
    setIsModalOpen(false);
  };

  const handleDiscardDraft = () => {
    resetForm();
    setDraft(null);
    setShowDraftConfirm(false);
    setIsModalOpen(false);
  };

  // NEW: Load draft when modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (draft) {
        setNewJob({
          description: draft.description,
          location: draft.location,
          priceOffer: draft.priceOffer,
        });
        setSelectedCategory(draft.category);
      } else {
        resetForm();
      }
    }
  }, [isModalOpen]);

  // ================== YOUR EXISTING LOGIC ==================

  // EXTRACTED: Fetch jobs function for reuse
  const fetchJobs = async (useCache = true) => {
    try {
      setLoading(true);
      const options = { page: 1 };
      if (filterCategory) options.category = filterCategory;
      if (location) options.location = location;
      if (sortBy) options.sortBy = sortBy;
      if (order) options.order = order;
      if (!useCache) options._t = Date.now();
      const response = await getAllJobs(options);
      const jobsArray = Array.isArray(response.data?.data?.jobs)
        ? response.data.data.jobs
        : [];
      console.log("Fetched jobs:", jobsArray);
      setJobPosts(jobsArray);
      setLastRefreshTime(new Date());

      // Prefetch rating stats for distinct clientIds
      const uniqueClientIds = Array.from(
        new Set(
          jobsArray
            .map((j) => j.clientId)
            .filter((id) => !!id && typeof id === "string")
        )
      );
      const toFetch = uniqueClientIds.filter((id) => !clientRatings[id]);
      if (toFetch.length > 0) {
        // Fetch small pages (limit=1) just to get the statistics
        const fetchStats = async (clientId) => {
          try {
            const { getClientReviewsById } = await import(
              "../api/feedback.jsx"
            );
            const res = await getClientReviewsById(clientId, {
              page: 1,
              limit: 1,
            });
            const stats = res?.data?.statistics;
            if (stats) {
              setClientRatings((prev) => ({
                ...prev,
                [clientId]: {
                  averageRating: stats.averageRating || 0,
                  totalReviews: stats.totalReviews || 0,
                },
              }));
            }
          } catch (e) {
            console.warn("Failed to fetch client stats for", clientId, e);
          }
        };
        // Run in sequence to avoid flooding
        for (const id of toFetch) {
          // eslint-disable-next-line no-await-in-loop
          await fetchStats(id);
        }
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchJobs(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const mode = import.meta.env.VITE_APP_MODE;

  const baseURL =
    mode === "production"
      ? import.meta.env.VITE_API_PROD_URL
      : import.meta.env.VITE_API_DEV_URL;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${baseURL}/skills`);
        const cats = res.data?.data?.categories;
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Initial fetch + tab visibility refresh
  useEffect(() => {
    fetchJobs(true);
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchJobs(false);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Handle Enter key press for search and location
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      setSearch(searchInput);
    }
  };

  const handleLocationKeyPress = (e) => {
    if (e.key === "Enter") {
      setLocation(locationInput);
    }
  };

  // Refetch when filters or sorting changes
  useEffect(() => {
    fetchJobs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, location, sortBy, order]);

  // Handle posting a new job
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!newJob.description || !newJob.location || !newJob.priceOffer) {
      alert("Please fill out all required fields");
      return;
    }
    if (!selectedCategory) {
      alert("Please select a category");
      return;
    }
    try {
      const jobData = {
        description: newJob.description,
        location: newJob.location,
        price: parseFloat(newJob.priceOffer),
        category: selectedCategory,
      };

      await createJob(jobData);

      // Refresh job list to include the new job
      await fetchJobs(false);

      resetForm();
      setIsModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error posting job:", error);
      alert(error.response?.data?.message || "Failed to post job");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await checkAuth();
        const userData = res.data?.data;
        console.log("Fetched user data:", userData);

        setUser(userData);

        if (userData?.userType === "worker") {
          const biography =
            typeof userData.biography === "string"
              ? userData.biography.trim()
              : "";
          const portfolios = Array.isArray(userData.portfolio)
            ? userData.portfolio
            : [];
          const certificates = Array.isArray(userData.certificates)
            ? userData.certificates
            : [];
          const skills = Array.isArray(userData.skillsByCategory)
            ? userData.skillsByCategory
            : [];
          const experiences = Array.isArray(userData.experience)
            ? userData.experience
            : [];
          const education = Array.isArray(userData.education)
            ? userData.education
            : [];

          const shouldShowModal =
            portfolios.length === 0 ||
            certificates.length === 0 ||
            skills.length === 0 ||
            experiences.length === 0 ||
            biography.length === 0 ||
            education.length === 0;

          setShowPortfolioSetup(shouldShowModal);

          if (!userData.idPictureId && !userData.selfiePictureId) {
            setShowIdSetup(true);
          }
        } else {
          setShowPortfolioSetup(false);
        }
      } catch (err) {
        console.error("Auth check failed", err);
        setShowPortfolioSetup(false);
      }
    };

    fetchUser();
  }, []);

  // Filter jobs (only client-side search filtering, category & location are backend-filtered)
  const filteredJobs = Array.isArray(jobPosts)
    ? jobPosts.filter((job) => {
        const desc = job.description || "";
        return desc.toLowerCase().includes(search.toLowerCase());
      })
    : [];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-0 mt-20 md:mt-35">
        <div className="space-y-4 pb-4 animate-pulse">
          {/* Search Bar Skeleton */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-1/2 h-10 bg-gray-200 rounded-[18px]" />
            <div className="w-full md:w-1/4 h-10 bg-gray-200 rounded-md" />
          </div>

          {/* Post Box Skeleton */}
          {user?.userType === "client" && (
            <div className="bg-white shadow rounded-[20px] p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 bg-gray-100 h-10 rounded-full" />
              </div>
            </div>
          )}

          {/* Job Cards Skeleton (repeat 3 times) */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="flex gap-2 mt-3">
                <div className="h-6 bg-gray-200 rounded-full w-24" />
                <div className="h-6 bg-gray-200 rounded-full w-20" />
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-0 mt-20 md:mt-35">
      <VerificationNotice user={user} />
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
          <input
            type="text"
            placeholder="Search job descriptions (Press Enter)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="w-full px-4 py-2 shadow rounded-[18px] bg-white pl-10 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by location (Press Enter)"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          onKeyPress={handleLocationKeyPress}
          className="w-full md:w-1/4 px-4 py-2 shadow rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full md:w-1/4 px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.categoryName}
            </option>
          ))}
        </select>
      </div>

      {/* Sorting Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
        <span className="text-sm text-gray-600 font-medium">Sort by:</span>
        <div className="flex gap-3 flex-wrap">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 shadow rounded-md bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="createdAt">Date Posted</option>
            <option value="price">Price</option>
            <option value="updatedAt">Last Updated</option>
          </select>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="px-3 py-2 shadow rounded-md bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        {(filterCategory ||
          location ||
          sortBy !== "createdAt" ||
          order !== "desc") && (
          <button
            onClick={() => {
              setFilterCategory("");
              setLocation("");
              setSearch("");
              setSortBy("createdAt");
              setOrder("desc");
            }}
            className="text-sm text-blue-500 hover:text-blue-700 hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Post Box */}
      {user?.userType === "client" && (
        <div
          onClick={() => setIsModalOpen(true)}
          className="bg-white shadow rounded-[20px] p-4 mb-6 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <img
              src={user?.image || currentUser.avatar}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover"
            />

            <div className="flex-1 bg-gray-100 px-4 py-2 rounded-full text-gray-500 text-left">
              Post a work...
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 shadow-lg relative">
            {/* CHANGED: Close uses draft check */}
            <button
              onClick={handleCloseModal}
              className="absolute top-1 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Job Preview */}
            {(newJob.description || newJob.location || selectedCategory) && (
              <div className="mt-6 pt-4">
                <div className="rounded-[20px] p-4 bg-gray-50 shadow-sm mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={user?.image || currentUser.avatar}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />

                      <span className="text-sm font-medium text-[#252525] opacity-75">
                        {user?.fullName || "Client Name"}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                      {/* <Clock size={16} /> Just now */}
                    </span>
                  </div>
                  <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                    <Briefcase size={20} className="text-blue-400" />
                    {newJob.description ||
                      "Job description will appear here..."}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedCategory ? (
                      <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-xs">
                        {
                          categories.find((c) => c._id === selectedCategory)
                            ?.categoryName
                        }
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">
                        No category selected
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin size={16} /> {newJob.location || "Location"}
                    </span>
                    <span className="font-bold text-green-400">
                      {newJob.priceOffer
                        ? `₱${parseFloat(newJob.priceOffer).toLocaleString()}`
                        : "₱0"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Job Creation Form */}
            <form onSubmit={handlePostJob} className="space-y-3">
              <textarea
                placeholder="Job description"
                value={newJob.description}
                onChange={(e) =>
                  setNewJob({ ...newJob, description: e.target.value })
                }
                className="px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full"
                rows="3"
              />
              <label className="block text-sm font-medium text-gray-500 mb-1 text-left">
                Address
              </label>
              <AddressInput
                value={newJob.location}
                onChange={(address) =>
                  setNewJob({ ...newJob, location: address })
                }
              />
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1 text-left">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 text-gray-500 text-sm rounded-lg block w-full"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                placeholder="Price offer (₱)"
                value={newJob.priceOffer}
                onChange={(e) =>
                  setNewJob({ ...newJob, priceOffer: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block"
                min="0"
                step="0.01"
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-[#55b3f3] text-white rounded-md hover:bg-blue-400 cursor-pointer transition-colors"
              >
                Post Job
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Draft confirmation modal */}
      {showDraftConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-40 z-50">
          <div className="bg-white rounded-[20px] p-6 shadow-lg max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold mb-4">Save draft</h3>
            <p className="text-gray-600 mb-6">
              You have unsaved input. Do you want to save it as a draft or
              discard it?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleDiscardDraft}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-[#55b3f3] text-white rounded-md hover:bg-sky-600 cursor-pointer transition-colors"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Setup Modal */}
      {showIdSetup && <IDSetup onClose={() => setShowIdSetup(false)} />}

      {/* Show Portfolio Setup */}
      {showPortfolioSetup && (
        <PortfolioSetup onClose={() => setShowPortfolioSetup(false)} />
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 bg-[#55b3f3] text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle size={20} /> Job posted successfully!
        </div>
      )}

      {/* Job Posts Display */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-4 pb-4">
          {filteredJobs.map((job) => {
            const clientId = job.clientId;
            return (
              <div
                key={job.id || job._id}
                className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block cursor-pointer"
                onClick={() => {
                  if (user?.userType === "client") {
                    navigate(`/invite-workers/${job.id || job._id}`);
                  } else {
                    navigate(`/job/${job.id || job._id}`);
                  }
                }}
              >
                <div className="rounded-xl p-4 bg-white transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (clientId) navigate(`/client/${clientId}`);
                        }}
                        className="focus:outline-none"
                        title="View client profile"
                      >
                        <img
                          src={
                            job.client?.profilePicture?.url ||
                            currentUser.avatar
                          }
                          alt="Client Avatar"
                          className="w-8 h-8 rounded-full object-cover cursor-pointer"
                        />
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#252525] opacity-75">
                          {job.client?.name || "Client Name"}
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
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
                    <span className="line-clamp-1 md:text-base">
                      {job.description}
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-sm">
                      {job.category?.name || "Uncategorized"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-4 text-sm text-gray-600 ">
                    <span className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span className="truncate overflow-hidden max-w-45 md:max-w-full md:text-base text-gray-500">
                        {job.location}
                      </span>
                    </span>
                    <span className="font-bold text-green-400">
                      ₱{job.price?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center mt-10">
          <p className="text-gray-500 mb-4">No job posts found.</p>
          {search ||
          location ||
          filterCategory ||
          sortBy !== "createdAt" ||
          order !== "desc" ? (
            <p className="text-sm text-gray-400">
              Try adjusting your search filters or{" "}
              <button
                onClick={() => {
                  setSearch("");
                  setLocation("");
                  setFilterCategory("");
                  setSortBy("createdAt");
                  setOrder("desc");
                }}
                className="text-blue-500 hover:underline"
              >
                clear all filters
              </button>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default FindWork;
