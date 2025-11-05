import { useState, useEffect, useRef } from "react";
import { Search, MapPin, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getWorkers } from "../api/worker";
import axios from "axios";

const FindWorker = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Backend filtering
  const [location, setLocation] = useState("");
  const [locationInput, setLocationInput] = useState(""); // For input field
  const [selectedCategory, setSelectedCategory] = useState("");
  const [status, setStatus] = useState("");
  const [minRating, setMinRating] = useState("");

  // Client-side search
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For input field

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // UI state for filters (match FindWork)
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const desktopFilterContainerRef = useRef(null);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const mode = import.meta.env.VITE_APP_MODE;
        const baseURL =
          mode === "production"
            ? import.meta.env.VITE_API_PROD_URL
            : import.meta.env.VITE_API_DEV_URL;
        const res = await axios.get(`${baseURL}/skills`);
        const cats = res.data?.data?.categories;
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch workers when filters change
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true);
        const baseQuery = { page: 1 };
        if (selectedCategory) baseQuery.category = selectedCategory;
        if (location) baseQuery.location = location;
        if (status) baseQuery.status = status;
        if (minRating) baseQuery.minRating = minRating;

        const all = [];
        let page = 1;
        let hasNext = true;
        const maxPages = 5; // safety cap
        while (hasNext && page <= maxPages) {
          const data = await getWorkers({ ...baseQuery, page });
          const pageWorkers = data?.workers || [];
          if (pageWorkers.length) all.push(...pageWorkers);
          const pagination = data?.pagination;
          hasNext = Boolean(pagination?.hasNextPage) && pageWorkers.length > 0;
          page += 1;
        }

        // Backend provides rating and totalRatings from Review collection
        setWorkers(all);
      } catch {
        console.error("Error fetching workers");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [selectedCategory, location, status, minRating]);

  // Close desktop filters dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!showDesktopFilters) return;
    const handleClickOutside = (e) => {
      if (
        desktopFilterContainerRef.current &&
        !desktopFilterContainerRef.current.contains(e.target)
      ) {
        setShowDesktopFilters(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setShowDesktopFilters(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDesktopFilters]);

  // Handle Enter key press for search and location
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      setSearch(searchInput.trim());
    }
  };

  const handleLocationKeyDown = (e) => {
    if (e.key === "Enter") {
      setLocation(locationInput.trim());
    }
  };

  // Client-side filtering for search only
  const filteredWorkers = workers.filter((worker) => {
    if (!search) return true;

    const searchLower = search.toLowerCase();
    const fullNameMatch = worker.fullName?.toLowerCase().includes(searchLower);
    const skillsMatch = worker.skills?.some((s) => {
      const skillName = typeof s === "string" ? s : s.categoryName;
      return skillName?.toLowerCase().includes(searchLower);
    });
    const locationMatch = worker.location?.toLowerCase().includes(searchLower);

    return fullNameMatch || skillsMatch || locationMatch;
  });

  const isMouseOver = (e) => {
    e.currentTarget.style.backgroundColor = "#f4f6f6";
  };

  const isMouseOut = (e) => {
    e.currentTarget.style.backgroundColor = "white";
  };

  // Loading skeleton (match FindWork style)
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-0 mt-25 md:mt-35">
        <div className="space-y-4 pb-4 animate-pulse">
          {/* Search + Filters Skeleton (FindWork-like) */}
          <div className="relative w-full md:flex-1 mb-2">
            <div className="w-full h-11 bg-gray-200 rounded-[18px]" />
            <div className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 h-8 w-24 bg-gray-200 rounded-[14px]" />
            <div className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 h-8 w-20 bg-gray-200 rounded-[14px]" />
          </div>

          {/* Worker Card Skeletons */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="relative bg-white rounded-2xl shadow-md p-4 pb-14 md:pt-4 md:pr-4 md:pb-4"
            >
              {/* Rating (top-right) */}
              <div className="hidden md:flex absolute top-2 right-4 md:top-4 items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-10" />
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>

              {/* Card content */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                  {/* Mobile rating row */}
                  <div className="md:hidden flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-10" />
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />

                  {/* Desktop location & skills placeholders */}
                  <div className="hidden md:flex items-center gap-2 text-gray-500 mt-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-40" />
                  </div>
                  <div className="hidden md:flex flex-wrap gap-2 mt-3">
                    <div className="h-6 bg-gray-200 rounded-md w-24" />
                    <div className="h-6 bg-gray-200 rounded-md w-20" />
                    <div className="h-6 bg-gray-200 rounded-md w-28" />
                  </div>
                </div>
              </div>

              {/* Mobile location & skills placeholders */}
              <div className="block md:hidden mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-40" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded-md w-24" />
                  <div className="h-6 bg-gray-200 rounded-md w-20" />
                  <div className="h-6 bg-gray-200 rounded-md w-16" />
                </div>
              </div>

              {/* Status pill (bottom-right) */}
              <div className="absolute bottom-3 md:bottom-4 right-2 h-6 w-28 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-0 mt-25 md:mt-35 animate-fade-in">

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div ref={desktopFilterContainerRef} className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
          <input
            type="text"
            placeholder="Search by skill, or location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full px-4 py-4 md:py-3 shadow rounded-[18px] bg-white pl-10 pr-44 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {/* <button
            type="button"
            onClick={() => setSearch(searchInput.trim())}
            className="absolute right-24 md:right-26 top-1/2 -translate-y-1/2 px-3 py-2 rounded-[14px] bg-[#55b3f3] text-white text-sm hover:bg-blue-400 shadow-md cursor-pointer"
            aria-label="Search"
          >
            Search
          </button> */}

          {/* Mobile filters trigger next to Search (inline) */}
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

          {/* Desktop filters trigger inside search row */}
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

          {/* Desktop filters dropdown popover */}
          {showDesktopFilters && (
            <div className="hidden md:block absolute right-0 top-full mt-2 w-80 bg-white shadow-lg rounded-lg p-3 z-20 animate-scale-in">
              {/* Location */}
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
                  onClick={() => setLocation(locationInput.trim())}
                  className="shrink-0 px-3 py-2 rounded-md bg-[#55b3f3] text-white text-sm hover:bg-blue-400 cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {/* Category */}
              {categoriesLoading ? (
                <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse mb-3" />
              ) : (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
                >
                  <option value="">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              )}
              {/* Status */}
              <select
                className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All status</option>
                <option value="available">Available</option>
                <option value="working">Working</option>
                <option value="not available">Not available</option>
              </select>
              {/* Min Rating */}
              <select
                className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              >
                <option value="">All ratings</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              {(selectedCategory || location || status || minRating) && (
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setStatus("");
                    setMinRating("");
                    setLocation("");
                    setSearch("");
                    setSearchInput("");
                    setLocationInput("");
                  }}
                  className="text-sm text-[#55b3f3] hover:text-sky-700 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filters modal */}
      {showMobileFilters && (
  <div className="fixed inset-0 z-[2000] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setShowMobileFilters(false)}
            aria-hidden="true"
          />
          {/* Bottom sheet panel */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar animate-slide-up">
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
            {/* Location */}
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
                onClick={() => setLocation(locationInput.trim())}
                className="shrink-0 px-3 py-2 rounded-md bg-[#55b3f3] text-white text-sm hover:bg-blue-400 cursor-pointer"
              >
                Apply
              </button>
            </div>
            {/* Category */}
            <div className="mb-3">
              {categoriesLoading ? (
                <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse" />
              ) : (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {/* Status */}
            <div className="mb-3">
              <select
                className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All status</option>
                <option value="available">Available</option>
                <option value="working">Working</option>
                <option value="not available">Not available</option>
              </select>
            </div>
            {/* Min Rating */}
            <div className="mb-3">
              <select
                className="w-full px-3 py-2 shadow rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              >
                <option value="">All ratings</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            {(selectedCategory || location || status || minRating) && (
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setStatus("");
                  setMinRating("");
                  setLocation("");
                  setSearch("");
                  setSearchInput("");
                  setLocationInput("");
                }}
                className="text-sm text-[#55b3f3] hover:text-sky-700 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Worker Cards */}
      {filteredWorkers.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No workers found matching your criteria
        </div>
      ) : (
  <div className="custom-scrollbar flex flex-col overflow-y-auto pr-2 h-[calc(100vh-230px)] md:h-[calc(100vh-220px)] stagger-children">
          {filteredWorkers.map((worker) => {
            // Prefer backend-provided average rating; fallback to computing from reviews if present
            const avgRating = Number.isFinite(worker.rating)
              ? Number(worker.rating).toFixed(1)
              : Array.isArray(worker.reviews) && worker.reviews.length
                ? (
                  worker.reviews.reduce(
                    (sum, r) => sum + (Number(r.rating) || 0),
                    0
                  ) / worker.reviews.length
                ).toFixed(1)
                : "0";

            // Show review count from backend if available; fallback to reviews length
            const reviewCount = Number.isFinite(worker.totalRatings)
              ? worker.totalRatings
              : Array.isArray(worker.reviews)
                ? worker.reviews.length
                : 0;

            return (
              <Link
                to={`/worker/${worker._id}`}
                key={worker._id}
                className="w-full py-2"
              >
                <div
                  className="relative bg-white rounded-2xl shadow-md p-4 md:pt-4 md:pr-4 md:pb-4 flex flex-col md:flex-row md:items-center w-full"
                  onMouseOver={isMouseOver}
                  onMouseOut={isMouseOut}
                >
                  <div className="flex-1 text-[#252525]">
                    <div className="flex items-start gap-4">
                      <img
                        src={
                          worker?.profilePicture?.url ||
                          "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                        }
                        alt={worker.fullName}
                        className="w-15 h-15 md:w-30 md:h-30 rounded-full object-cover border"
                      />
                      <div className="flex flex-col justify-between h-full flex-1">
                        <div className="flex flex-row justify-between items-start w-full md:block">
                          <h2 className="text-[14px] md:text-xl font-semibold text-left pr-10">
                            {worker.fullName}
                          </h2>

                          {/* Mobile rating row (aligned right) */}
                          <div className="md:hidden text-gray-700 font-medium text-xs flex items-center gap-1 mt-0.5">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4 mb-0.5 text-yellow-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.97c.3.922-.755 1.688-1.54 1.118l-3.386-2.46a1 1 0 00-1.175 0l-3.386 2.46c-.785.57-1.84-.196-1.54-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.05 9.397c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.97z" />
                            </svg>
                            <span>{avgRating || 0}</span>
                            <span className="text-gray-500">({reviewCount})</span>
                          </div>
                        </div>


                        <p className="text-xs md:text-base text-gray-700 mt-1 text-left line-clamp-3 md:line-clamp-3">
                          {worker.biography ||
                            "4th Year BSIT Student from Cabiao, Nueva Ecija."}
                        </p>

                        {/* Desktop/tablet: location and skills in the right column */}
                        <p className="hidden md:flex text-xs md:text-base text-gray-500 text-left items-center gap-1 mt-3">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {worker.location}
                        </p>
                        <div className="hidden md:flex flex-wrap gap-2 mt-3">
                          {(worker.skills || []).map((skill, index) => (
                            <span
                              key={skill.skillCategoryId || index}
                              className="bg-[#55B2F3]/90 text-white font-medium backdrop-blur-sm px-2 py-1 rounded-md text-sm "
                            >
                              {skill.categoryName}
                            </span>
                          ))}

                        </div>
                      </div>
                    </div>
                    {/* Location below image and bio (mobile aligns with profile picture) */}
                    <p className="block md:hidden text-[12px] text-gray-500 flex items-center gap-1 mt-3">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {worker.location}
                    </p>
                    {/* Skills below image and bio */}
                    <div className="block md:hidden text-sm flex flex-wrap gap-2 mt-3">
                      {(worker.skills || []).slice(0, 2).map((skill, index) => (
                        <span
                          key={skill.skillCategoryId || index}
                          className="bg-[#55B2F3]/90 text-white font-medium backdrop-blur-sm px-2 py-1 rounded-md text-xs"
                        >
                          {skill.categoryName}
                        </span>
                      ))}

                      {/* {(worker.skills?.length || 0) > 3 && (
                              <span className="text-gray-500 text-[12px] px-3 py-1  md:text-sm italic">
                                +{worker.skills.length - 3} more
                              </span>
                            )} */}
                    </div>
                  </div>

                  <div className="hidden md:block absolute top-2 right-4 md:top-4">
                    <p className="text-gray-700 font-medium text-sm flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 text-yellow-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.97c.3.922-.755 1.688-1.54 1.118l-3.386-2.46a1 1 0 00-1.175 0l-3.386 2.46c-.785.57-1.84-.196-1.54-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.05 9.397c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.97z" />
                      </svg>
                      <span className="mt-0.5">{avgRating || 0}</span>
                      <span className="mt-0.5 text-gray-500">
                        ({reviewCount})
                      </span>
                    </p>
                  </div>

                  <p
                    className={`
                                    absolute bottom-4 md:bottom-4 right-2
                                    inline-flex items-center gap-2
                                    text-xs md:text-sm font-semibold
                                    px-2 py-1.5 rounded-full 
                                    shadow-md
                                    transition-colors duration-200
                                    ${worker.status === "available"
                        ? "bg-green-100 text-green-600"
                        : ""
                      }
                                    ${worker.status === "working"
                        ? "bg-red-100 text-red-700"
                        : ""
                      }
                                    ${!worker.status ||
                        worker.status === "not available"
                        ? "bg-gray-200 text-gray-600"
                        : ""
                      }
                                  `}
                  >
                    <span
                      className={`h-2 w-2 rounded-full 
                          ${worker.status === "available" ? "bg-green-500" : ""}
                          ${worker.status === "working" ? "bg-red-500" : ""}
                          ${!worker.status || worker.status === "not available"
                          ? "bg-gray-400"
                          : ""
                        }
                        `}
                    ></span>
                    {worker.status
                      ? worker.status.charAt(0).toUpperCase() +
                      worker.status.slice(1)
                      : "not available"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FindWorker;
