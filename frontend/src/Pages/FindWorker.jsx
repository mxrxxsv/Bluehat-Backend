import { useState, useEffect } from "react";
import { Search, MapPin } from "lucide-react";
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

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
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
      }
    };
    fetchCategories();
  }, []);

  // Fetch workers when filters change
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true);

        const query = { page: 1 };
        if (selectedCategory) query.category = selectedCategory;
        if (location) query.location = location;
        if (status) query.status = status;
        if (minRating) query.minRating = minRating;

        const data = await getWorkers(query);
        const baseWorkers = data.workers || [];

        // Backend now provides rating and totalRatings from Review collection
        setWorkers(baseWorkers);
        console.log("Fetched workers:", baseWorkers);
      } catch {
        console.error("Error fetching workers");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [selectedCategory, location, status, minRating]);

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

  return (
    <div className="h-screen overflow-hidden">
      <div className="max-w-5xl mx-auto mt-30 h-full flex">
        <div className="flex gap-4">
          {/* LEFT PANEL - Category Filter */}
          <div className="w-50 border-r border-gray-200 pr-4 hidden md:block">
            <h3 className="text-lg font-bold mb-4 text-[#252525]">
              Filter by Category
            </h3>
            <div className="flex flex-col gap-2">
              {categories.map((category) => (
                <button
                  key={category._id}
                  className={`px-4 py-2 text-sm rounded-lg border cursor-pointer text-left ${
                    selectedCategory === category._id
                      ? "bg-blue-400 text-white border-blue-400"
                      : "bg-gray-100 text-gray-700 hover:bg-blue-50 border-gray-300"
                  }`}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category._id ? "" : category._id
                    )
                  }
                >
                  {category.categoryName}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL - Search and Results */}
          <div className="flex-1 mx-4 mt-1">
            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, skill, or location (Press Enter)"
                  className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-[20px] w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                />
              </div>

              {/* Other Filters */}
              <div className="flex flex-col md:flex-row flex-wrap gap-4">
                {/* Location */}
                <input
                  type="text"
                  placeholder="Location (Press Enter to search)"
                  className="w-full md:w-auto h-10 px-4 py-2 border border-gray-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyPress={handleLocationKeyPress}
                />

                {/* Status */}
                <select
                  className="w-full md:w-auto h-10 px-4 py-2 border border-gray-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm cursor-pointer"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="working">Working</option>
                  <option value="not available">Not Available</option>
                </select>

                {/* Min Rating */}
                <select
                  className="w-full md:w-auto h-10 px-4 py-2 border border-gray-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm cursor-pointer"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                >
                  <option value="">All Ratings</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
            </div>

            {/* Worker Cards */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                No workers found matching your criteria
              </div>
            ) : (
              <div className="flex flex-col overflow-y-auto py-4 pr-2 mt-4 max-h-[calc(100vh-340px)] md:max-h-[calc(100vh-220px)]">
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
                      className="w-full py-4"
                    >
                      <div
                        className="relative bg-white rounded-2xl shadow-md p-4 flex items-center w-full pb-15 md:pb-4"
                        onMouseOver={isMouseOver}
                        onMouseOut={isMouseOut}
                      >
                        <div className="flex flex-col justify-between h-full mr-4" />
                        <div className="flex items-start gap-4 flex-1 text-[#252525]">
                          <img
                            src={
                              worker.profilePicture.url ||
                              "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                            }
                            alt={worker.fullName}
                            className="w-20 h-20 md:w-30 md:h-30 rounded-full object-cover border"
                          />
                          <div className="flex flex-col justify-between h-full">
                            <h2 className="text-[14px] md:text-xl font-semibold text-left">
                              {worker.fullName}
                            </h2>

                            {/* ✅ Status section */}
                            {/* <p
                            className={`text-xs font-medium mt-0.5 text-left ${worker.status === "available"
                              ? "text-green-600"
                              : worker.status === "working"
                                ? "text-red-500"
                                : "text-gray-500"
                              }`}
                          >
                            ● {worker.status || "Offline"}
                          </p> */}

                            <p className="text-[12px] md:text-base text-gray-700 mt-1 text-left line-clamp-3 md:line-clamp-3">
                              {worker.biography ||
                                "4th Year BSIT Student from Cabiao, Nueva Ecija."}
                            </p>
                            <p className="text-[12px] md:text-base text-gray-500 text-left flex items-center gap-1 mt-3">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              {worker.location}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {worker.skills.slice(0, 3).map((skill, index) => (
                                <span
                                  key={skill.skillCategoryId || index}
                                  className="text-[#f4f6f6] text-[12px] md:text-sm  font-light px-3 py-1 rounded-full text-xs bg-[#55b3f3] shadow-md"
                                >
                                  {skill.categoryName}
                                </span>
                              ))}

                              {worker.skills.length > 3 && (
                                <span className="text-[#252525] text-[12.5px] font-medium px-3 py-1 rounded-full text-xs bg-gray-200 shadow-sm">
                                  +{worker.skills.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="absolute top-2 right-4 md:top-4 px-3 py-1">
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

                        {/* <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleBookmarkClick(worker.id);
                        }}
                        className="flex items-center text-[14px] md:text-sm gap-1 absolute bottom-2 md:bottom-4 right-1.5 bg-[#55b3f3] text-white p-1 px-2 md:px-4 md:py-2 rounded-[8px] hover:bg-blue-400 shadow-md cursor-pointer"
                      >
                        {isBookmark[worker.id] ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        Save
                      </button> */}

                        <p
                          className={`
                                    absolute bottom-1 md:bottom-4 right-2
                                    inline-flex items-center gap-2
                                    text-xs md:text-[12px] font-semibold
                                    px-2 py-1.5 rounded-full 
                                    shadow-md
                                    transition-colors duration-200
                                    ${
                                      worker.status === "available"
                                        ? "bg-green-100 text-green-800"
                                        : ""
                                    }
                                    ${
                                      worker.status === "working"
                                        ? "bg-red-100 text-red-700"
                                        : ""
                                    }
                                    ${
                                      !worker.status ||
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
                          ${
                            !worker.status || worker.status === "not available"
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
        </div>
      </div>
    </div>
  );
};

export default FindWorker;
