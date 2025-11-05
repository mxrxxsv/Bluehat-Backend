import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Filter, MapPin, Star, ArrowLeft, X, Briefcase, SlidersHorizontal } from "lucide-react";
import Header from "../components/Header";
import WorkerInvitationCard from "../components/WorkerInvitationCard";
import { getProfile } from "../api/profile";
import { getJobById } from "../api/jobs.jsx";
import { searchWorkers } from "../api/worker.jsx";
import { getWorkerReviewsById } from "../api/feedback.jsx";

const InviteWorkersPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [job, setJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestedWorkers, setSuggestedWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    minRating: "",
    experienceLevel: "",
    availability: "",
  });
  const [locationInput, setLocationInput] = useState("");

  // FindWork-like filters UI state
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const desktopFilterContainerRef = useRef(null);

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Check auth first
          const authRes = await getProfile();
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

  // Close desktop filters dropdown on outside click or Escape
  useEffect(() => {
    if (!showDesktopFilters) return;
    const handleOutside = (e) => {
      if (
        desktopFilterContainerRef.current &&
        !desktopFilterContainerRef.current.contains(e.target)
      ) {
        setShowDesktopFilters(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setShowDesktopFilters(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showDesktopFilters]);

  // Navigate to client profile from avatar/name in the job header
  const goToClientProfile = () => {
    const clientId = job?.client?.id || job?.client?._id || job?.clientId;
    if (clientId) navigate(`/client/${clientId}`);
  };

  const loadJobAndWorkers = async () => {
    try {
      setLoading(true);

      // Load job details
      const jobResponse = await getJobById(jobId);
      const jobData = jobResponse.data.data || jobResponse.data;
      setJob(jobData);

      // Load available workers across multiple pages to avoid under-fetching
      const allWorkers = [];
      let page = 1;
      let hasNext = true;
      const maxPages = 5; // safety cap
      while (hasNext && page <= maxPages) {
        const workerRes = await searchWorkers({ page });
        const pageWorkers = workerRes?.workers || workerRes?.data?.workers || [];
        if (Array.isArray(pageWorkers) && pageWorkers.length) {
          allWorkers.push(...pageWorkers);
        }
        const pagination = workerRes?.pagination || workerRes?.data?.pagination;
        hasNext = Boolean(pagination?.hasNextPage) && pageWorkers.length > 0;
        page += 1;
      }

      // Normalize workers to ensure rating/totalRatings are numeric and text fields are searchable
      // De-duplicate by _id then normalize
      const dedupMap = new Map();
      for (const w of allWorkers) {
        const id = w?._id || w?.id;
        if (!id) continue;
        if (!dedupMap.has(id)) dedupMap.set(id, w);
      }
      const uniqueWorkers = Array.from(dedupMap.values());

      const normalizedWorkers = (Array.isArray(uniqueWorkers) ? uniqueWorkers : []).map((w) => {
        const rating = Number(
          w?.rating ?? w?.averageRating ?? 0
        );
        const totalRatings = Number(
          w?.totalRatings ?? w?.reviewCount ?? 0
        );

        // Support skills as array of strings or array of objects with common name keys
        const skillsArray = Array.isArray(w?.skills) ? w.skills : [];
        const skillsText = skillsArray
          .map((s) =>
            typeof s === "string"
              ? s
              : s?.name || s?.categoryName || s?.title || ""
          )
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const firstName = w?.firstName || "";
        const lastName = w?.lastName || "";
        const bio = w?.bio || "";
        const location = w?.location || "";

        return {
          ...w,
          rating,
          totalRatings,
          // Precomputed lowercase text fields for efficient filtering
          nameText: `${firstName} ${lastName}`.trim().toLowerCase(),
          skillsText,
          bioText: String(bio).toLowerCase(),
          locationText: String(location).toLowerCase(),
        };
      });

      // Debug logs removed

      // Enrich ratings/review counts from reviews API to ensure accuracy
      const enrichedWorkers = await enrichWorkersWithReviewStats(
        normalizedWorkers
      );

      setWorkers(enrichedWorkers);
      setFilteredWorkers(enrichedWorkers);
      // Compute suggestions based on job requirements
      const suggestions = getSuggestedWorkers(jobData, enrichedWorkers);
      setSuggestedWorkers(suggestions);
    } catch (error) {
      console.error("Failed to load data:", error);

    } finally {
      setLoading(false);
    }
  };

  // Helper: build normalized labels for a worker's skills
  const getWorkerSkillLabels = (w) => {
    if (!Array.isArray(w?.skills)) return [];
    return w.skills
      .map((s) =>
        typeof s === "string"
          ? s
          : s?.name || s?.categoryName || s?.title || ""
      )
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());
  };

  // Heuristic: simple proximity by shared tokens in location strings
  const isNearby = (jobLoc = "", workerLoc = "") => {
    const a = String(jobLoc).toLowerCase();
    const b = String(workerLoc).toLowerCase();
    if (!a || !b) return 0; // unknown
    if (a === b) return 2; // exact
    const tokensA = a.split(/[\s,]+/).filter(Boolean);
    const tokensB = b.split(/[\s,]+/).filter(Boolean);
    const overlap = tokensA.some((t) => tokensB.includes(t));
    return overlap ? 1 : 0;
  };

  // Suggest top workers by skill match + rating + proximity
  const getSuggestedWorkers = (jobObj, list) => {
    if (!jobObj || !Array.isArray(list)) return [];
    const required = [];
    const cat = jobObj?.category?.name || jobObj?.categoryName;
    if (cat) required.push(String(cat).toLowerCase());
    const desc = String(jobObj?.description || "").toLowerCase();
    if (desc && required.length === 0) {
      const words = desc.match(/[a-zA-Z]+/g) || [];
      required.push(...words.filter((w) => w.length > 3).slice(0, 2));
    }

    const scored = list.map((w) => {
      const skills = getWorkerSkillLabels(w);
      const skillMatches = required.filter((r) =>
        skills.some((s) => s.includes(r) || r.includes(s))
      ).length;
      const rating = Number(w?.rating || 0);
      const locScore = isNearby(jobObj?.location, w?.location); // 0,1,2
      const confidence = Math.min(Number(w?.totalRatings || 0) / 10, 1);
      const score = skillMatches * 3 + rating * 1.5 + locScore * 1 + confidence;
      return { w, score, skillMatches, locScore };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .filter((x) => x.skillMatches > 0 || x.locScore > 0)
      .slice(0, 5)
      .map((x) => x.w);
  };

  // Fetch review statistics per worker (averageRating, totalReviews)
  const enrichWorkersWithReviewStats = async (list) => {
    // Concurrency limiter: process sequentially to avoid flooding server
    const result = [];
    for (const w of list) {
      try {
        // If we already have ratings and counts, keep them, but refresh for consistency
        const res = await getWorkerReviewsById(w._id, { page: 1, limit: 1 });
        const stats = res?.data?.statistics || res?.statistics;
        if (stats) {
          const avg = Number(stats.averageRating || 0);
          const count = Number(stats.totalReviews || 0);
          const updated = {
            ...w,
            rating: isNaN(avg) ? w.rating : avg,
            totalRatings: isNaN(count) ? w.totalRatings : count,
          };
          result.push(updated);
          // Debug logs removed
        } else {
          result.push(w);
        }
      } catch (e) {
        console.warn("[InviteWorkers] review stats fetch failed", w._id, e?.message);
        result.push(w);
      }
    }
    return result;
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, workers]);

  // Handlers similar to FindWork page
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      setSearchTerm(searchInput.trim());
    }
  };
  const handleLocationKeyDown = (e) => {
    if (e.key === "Enter") {
      setFilters((prev) => ({ ...prev, location: locationInput.trim() }));
    }
  };

  const applyFilters = () => {
    let filtered = [...workers];

    // Search by name or skills
    const kw = searchTerm.trim().toLowerCase();
    if (kw) {
      filtered = filtered.filter((w) => {
        const nameText = w?.nameText ?? `${w?.firstName || ""} ${w?.lastName || ""}`.trim().toLowerCase();
        const skillsText = w?.skillsText ?? (Array.isArray(w?.skills) ? w.skills.map((s) => (typeof s === "string" ? s : s?.name || s?.categoryName || s?.title || "")).join(" ") : "").toLowerCase();
        const bioText = w?.bioText ?? String(w?.bio || "").toLowerCase();
        return nameText.includes(kw) || skillsText.includes(kw) || bioText.includes(kw);
      });
    }

    // Filter by location
    if (filters.location) {
      const loc = filters.location.trim().toLowerCase();
      filtered = filtered.filter((w) =>
        (w?.locationText ?? String(w?.location || "").toLowerCase()).includes(loc)
      );
    }

    // Filter by minimum rating
    if (filters.minRating) {
      const min = parseFloat(filters.minRating);
      filtered = filtered.filter((w) => {
        const rating = Number(w?.rating ?? 0);
        const total = Number(w?.totalRatings ?? 0);
        // When filtering by rating, exclude unrated workers (totalRatings === 0)
        return total > 0 && rating >= min;
      });
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

  if (!currentUser || currentUser.userType !== "client") {
    return <div>Access denied. Clients only.</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 mt-25 space-y-8">

          {/* Search & Filter Skeleton (FindWork-like) */}
          <div className="relative w-full animate-pulse">
            <div className="w-full h-11 bg-gray-200 rounded-[18px]" />
            <div className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 h-8 w-24 bg-gray-200 rounded-[14px]" />
            <div className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 h-8 w-20 bg-gray-200 rounded-[14px]" />
          </div>

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
        <div className="mb-2">
          <button
            onClick={() => navigate("/find-work")}
            className="flex items-center gap-2 text-[#55b3f3] hover:text-sky-500 mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Search and Filters (FindWork-like, no card background) */}
          <div ref={desktopFilterContainerRef} className="relative w-full mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <input
              type="text"
              placeholder="Search by name, skills, or bio..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-4 py-4 md:py-3 shadow rounded-[18px] bg-white pl-10 pr-44 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {/* Mobile filters trigger inline */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="flex md:hidden absolute right-2 top-1/2 -translate-y-1/2 px-2 md:px-3 py-2 rounded-[14px] bg-white border border-gray-200 text-gray-700 text-sm shadow-sm hover:bg-gray-50 cursor-pointer items-center gap-2"
              aria-label="Filters"
              aria-expanded={showMobileFilters}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>

            {/* Desktop filters trigger */}
            <button
              type="button"
              onClick={() => setShowDesktopFilters((s) => !s)}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-[14px] bg-white border border-gray-200 text-gray-700 text-sm shadow-sm hover:bg-gray-50 cursor-pointer items-center gap-2"
              aria-label="Filters"
              aria-expanded={showDesktopFilters}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>

            {/* Desktop filters dropdown */}
            {showDesktopFilters && (
              <div className="hidden md:block absolute right-0 top-full mt-2 w-80 bg-white shadow-lg rounded-lg p-3 z-20">
                <div className="flex items-stretch gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Filter by location"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={handleLocationKeyDown}
                    className="flex-1 px-3 py-2 shadow rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, location: locationInput.trim() }))}
                    className="shrink-0 px-3 py-2 rounded-md bg-[#55b3f3] text-white text-sm hover:bg-blue-400 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minRating: e.target.value }))}
                  className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="5">5 Stars</option>
                </select>
                <select
                  value={filters.experienceLevel}
                  onChange={(e) => setFilters((prev) => ({ ...prev, experienceLevel: e.target.value }))}
                  className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
                >
                  <option value="">Any Experience</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
                <select
                  value={filters.availability}
                  onChange={(e) => setFilters((prev) => ({ ...prev, availability: e.target.value }))}
                  className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
                >
                  <option value="">Any Availability</option>
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Part-time">Part-time</option>
                </select>
                {(filters.location || filters.minRating || filters.experienceLevel || filters.availability || searchTerm) && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSearchInput("");
                      setLocationInput("");
                      setFilters({ location: "", minRating: "", experienceLevel: "", availability: "" });
                    }}
                    className="text-sm text-[#55b3f3] hover:text-sky-700 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile filters modal */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-[2000] md:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setShowMobileFilters(false)}
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-800">Filters</h3>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                    aria-label="Close filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="flex gap-2">
                      <div className="flex-1 h-10 bg-gray-100 rounded-md" />
                      <div className="w-20 h-10 bg-gray-100 rounded-md" />
                    </div>
                    <div className="h-10 bg-gray-100 rounded-md" />
                    <div className="h-10 bg-gray-100 rounded-md" />
                    <div className="h-10 bg-gray-100 rounded-md" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-stretch gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Filter by location"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyDown={handleLocationKeyDown}
                        className="flex-1 px-3 py-2 shadow rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, location: locationInput.trim() }))}
                        className="shrink-0 px-3 py-2 rounded-md bg-[#55b3f3] text-white text-sm hover:bg-blue-400 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    <div className="mb-3">
                      <select
                        value={filters.minRating}
                        onChange={(e) => setFilters((prev) => ({ ...prev, minRating: e.target.value }))}
                        className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">Any Rating</option>
                        <option value="4">4+ Stars</option>
                        <option value="4.5">4.5+ Stars</option>
                        <option value="5">5 Stars</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <select
                        value={filters.experienceLevel}
                        onChange={(e) => setFilters((prev) => ({ ...prev, experienceLevel: e.target.value }))}
                        className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">Any Experience</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <select
                        value={filters.availability}
                        onChange={(e) => setFilters((prev) => ({ ...prev, availability: e.target.value }))}
                        className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">Any Availability</option>
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="Part-time">Part-time</option>
                      </select>
                    </div>
                  </>
                )}
                {(filters.location || filters.minRating || filters.experienceLevel || filters.availability || searchTerm) && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSearchInput("");
                      setLocationInput("");
                      setFilters({ location: "", minRating: "", experienceLevel: "", availability: "" });
                    }}
                    className="text-sm text-[#55b3f3] hover:text-sky-700 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}

          {job && (
            <div className="space-y-4 pb-4 transition-all">
              <div className="rounded-[20px] p-2 bg-white shadow-sm transition-all block">
                <div className="rounded-xl p-4 bg-white transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">

                      <img
                        src={
                          typeof job?.client?.profilePicture === "string" &&
                            job.client.profilePicture.trim() !== ""
                            ? job.client.profilePicture
                            : job?.client?.profilePicture?.url &&
                              job.client.profilePicture.url.trim() !== ""
                              ? job.client.profilePicture.url
                              : currentUser?.avatar ||
                              "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                        }
                        alt={job?.client?.name || "Client Avatar"}
                        className="w-8 h-8 rounded-full object-cover cursor-pointer"
                        onClick={goToClientProfile}
                      />

                      <span
                        onClick={goToClientProfile}
                        className="text-md font-bold text-[#252525] cursor-pointer"
                        title="View client profile"
                      >
                        {job.client?.name || "Client Name"}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 font-medium text-sm text-[#252525] opacity-80">
                      {/* <Clock size={16} /> */}
                      {new Date(job.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                  </div>
                  <p className="text-gray-700 mt-1 text-left flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 flex-none">
                      <Briefcase size={20} className="text-[#55B2F3]" />
                    </span>
                    <span className="md:text-base break-words whitespace-pre-line">{job.description}</span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="bg-[#55B2F3]/90 text-white font-medium backdrop-blur-sm px-2.5 py-1 rounded-md text-sm">
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


        {/* Suggested Workers (minimal) */}
        {/* {suggestedWorkers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-700 mb-3 text-left">Suggested for this job</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedWorkers.slice(0, 3).map((w) => (
                <button
                  key={w._id}
                  onClick={() => {
                    const el = document.getElementById(`worker-${w._id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="text-left bg-white rounded-xl p-4 shadow hover:shadow-md transition cursor-pointer"
                  title="Scroll to this worker below"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        w?.profilePicture?.url ||
                        "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                      }
                      alt={`${w.firstName || ""} ${w.lastName || ""}`.trim()}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">
                        {(w.firstName || "") + " " + (w.lastName || "")}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {Number(w.rating || 0).toFixed(1)}
                        <span className="text-gray-400">({Number(w.totalRatings || 0)})</span>
                        {w.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {w.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )} */}



        {/* Results Count */}
        <div className="mb-4">
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
              <div key={worker._id} id={`worker-${worker._id}`}>
                <WorkerInvitationCard
                  worker={worker}
                  jobId={jobId}
                  jobPrice={job?.price}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteWorkersPage;
