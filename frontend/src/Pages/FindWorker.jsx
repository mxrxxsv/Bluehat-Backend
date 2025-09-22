import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import skillCategories from "../Objects/skillCategories";
import skillsByCategory from "../Objects/skillsByCategory";
import { getWorkers } from "../api/worker";



const FindWorker = () => {

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtering, setFiltering] = useState({
    search: "",
    location: "",
    selectedSkills: [],
    priceRange: "",
    rating: "",
  });
  const [isBookmark, setBookmark] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const initialState = {};
    skillCategories.forEach((category) => {
      initialState[category.id] = true;
    });
    return initialState;
  });

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true);

        const query = {
          search: filtering.search?.length >= 2 ? filtering.search : undefined,
          city: filtering.location || undefined,
          skills: filtering.selectedSkills.length > 0
            ? filtering.selectedSkills.join(",")
            : undefined,
          status: "all",
          sortBy: "rating",
          order: "desc",
          page: 1,
          limit: 12,
        };

        const data = await getWorkers(query);
        setWorkers(data.workers || []);
        console.log("Fetched workers:", data.workers);
      } catch (err) {
        setError(err.message || "Failed to fetch workers");
      } finally {
        setLoading(false);
      }
    };



    fetchWorkers();
  }, [filtering]);

  const handleCollapseToggle = (categoryId) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const filteredWorkers = workers.filter((worker) => {
    const avgRating = worker.reviews?.length
      ? worker.reviews.reduce((sum, r) => sum + r.rating, 0) /
      worker.reviews.length
      : 0;

    const matchesSearch = filtering.search
      ? worker.fullName.toLowerCase().includes(filtering.search.toLowerCase()) ||
      worker.skills.some((s) => {
        const skillName = typeof s === "string" ? s : s.categoryName;
        return skillName.toLowerCase().includes(filtering.search.toLowerCase());
      }) ||
      worker.location.toLowerCase().includes(filtering.search.toLowerCase())
      : true;


    const matchesLocation = filtering.location
      ? worker.location.toLowerCase().includes(filtering.location.toLowerCase())
      : true;

    const matchesSkills = filtering.selectedSkills.length
      ? filtering.selectedSkills.every((skill) =>
        worker.skills.some((s) => {
          const skillName = typeof s === "string" ? s : s.categoryName;
          return skillName.toLowerCase() === skill.toLowerCase();
        })
      )
      : true;


    const matchesRating = filtering.rating
      ? avgRating >= Number(filtering.rating)
      : true;

    const matchesPrice = filtering.priceRange
      ? worker.priceRate >= Number(filtering.priceRange)
      : true;

    return (
      matchesSearch &&
      matchesLocation &&
      matchesSkills &&
      matchesRating &&
      matchesPrice
    );
  });

  const handleBookmarkClick = (workerId) => {
    setBookmark((prev) => ({
      ...prev,
      [workerId]: !prev[workerId],
    }));
  };

  const isMouseOver = (e) => {
    e.currentTarget.style.backgroundColor = "#f4f6f6";
  };

  const isMouseOut = (e) => {
    e.currentTarget.style.backgroundColor = "white";
  };

  const handleSkillToggle = (skillName) => {
    setFiltering((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skillName)
        ? prev.selectedSkills.filter((skill) => skill !== skillName)
        : [...prev.selectedSkills, skillName],
    }));
  };

  return (
    <div className="h-screen overflow-hidden">
      <div className="max-w-5xl mx-auto mt-30 h-full flex">
        <div className="flex gap-4">
          {/* LEFT PANEL - Skills by Category */}
          <div className="w-50 border-r border-gray-200 pr-4 hidden md:block">
            <h3 className="text-lg font-bold mb-4 text-[#252525]">Filter by Skill</h3>
            <div className="flex flex-col gap-2">
              {skillCategories.map((category) => (
                <div key={category.id}>
                  <div
                    className="flex items-center p-2 justify-between cursor-pointer mb-2 hover:shadow-md hover:bg-white hover:rounded-[12px]"
                    onClick={() => handleCollapseToggle(category.id)}
                  >
                    <h4 className="text-sm font-semibold text-gray-700">
                      {category.name}
                    </h4>
                    {collapsedCategories[category.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                  {!collapsedCategories[category.id] && (
                    <div className="flex flex-wrap gap-2">
                      {skillsByCategory
                        .filter((skill) => skill.categoryId === category.id)
                        .map((skill) => (
                          <button
                            key={skill.id}
                            className={`px-3 py-1 text-xs rounded-full border cursor-pointer ${filtering.selectedSkills.includes(skill.name)
                              ? "bg-blue-400 text-white"
                              : "bg-gray-100 text-gray-700 hover:text-white hover:bg-blue-400"
                              }`}
                            onClick={() => handleSkillToggle(skill.name)} // Handle multiple selection
                          >
                            {skill.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
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
                  placeholder="Search by name, skill, or location"
                  className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-[20px] w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={filtering.search}
                  onChange={(e) =>
                    setFiltering((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </div>

              {/* Other Filters */}
              <div className="flex flex-col md:flex-row flex-wrap gap-4">
                <select
                  className="w-full md:w-auto h-10 px-4 py-2 border border-gray-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm cursor-pointer"
                  value={filtering.location}
                  onChange={(e) =>
                    setFiltering((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                >
                  <option value="">All Locations</option>
                  <option value="Manila">Manila</option>
                  <option value="Cebu">Cebu</option>
                  <option value="Davao">Davao</option>
                </select>

                <select
                  className="w-full md:w-auto h-10 px-4 py-2 border border-gray-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm cursor-pointer"
                  value={filtering.rating}
                  onChange={(e) =>
                    setFiltering((prev) => ({ ...prev, rating: e.target.value }))
                  }
                >
                  <option value="">All Ratings</option>
                  <option value="5">★★★★★ (5 stars)</option>
                  <option value="4">★★★★ & up</option>
                  <option value="3">★★★ & up</option>
                  <option value="2">★★ & up</option>
                  <option value="1">★ & up</option>
                </select>

                <select
                  className="w-48 h-10 px-4 py-2 border border-gray-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm cursor-pointer"
                  value={filtering.priceRange}
                  onChange={(e) =>
                    setFiltering((prev) => ({
                      ...prev,
                      priceRange: e.target.value,
                    }))
                  }
                >
                  <option value="">All Prices</option>
                  <option value="100">₱100 and above</option>
                  <option value="500">₱500 and above</option>
                  <option value="1000">₱1000 and above</option>
                  <option value="5000">₱5000 and above</option>
                </select>
              </div>
            </div>

            {/* Results */}
            <div
              className="flex flex-col overflow-y-auto py-4 pr-2 mt-4 max-h-[calc(100vh-340px)] md:max-h-[calc(100vh-220px)]">
              {filteredWorkers.map((worker) => {
                const avgRating = worker.reviews?.length
                  ? (
                    worker.reviews.reduce((sum, r) => sum + r.rating, 0) /
                    worker.reviews.length
                  ).toFixed(1)
                  : "0";

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
                          src={worker.profilePicture.url}
                          alt={worker.fullName}
                          className="w-20 h-20 md:w-22 md:h-22 rounded-full object-cover border"
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

                          <p className="text-[12px] md:text-sm text-gray-700 mt-1 text-left line-clamp-3 md:line-clamp-3">
                            {worker.biography || "4th Year BSIT Student from Cabiao, Nueva Ecija."}
                          </p>
                          <p className="text-[12px] md:text-sm text-gray-700 text-left flex items-center gap-1 mt-1">
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

                      <div className="absolute top-4 right-4 px-3 py-1">
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
                                    absolute bottom-2 md:bottom-4 right-2
                                    inline-flex items-center gap-2
                                    text-xs md:text-[12px] font-semibold
                                    px-2 py-1.5 rounded-full 
                                    shadow-md
                                    transition-colors duration-200
                                    ${worker.status === "available" ? "bg-green-100 text-green-800" : ""}
                                    ${worker.status === "working" ? "bg-red-100 text-red-700" : ""}
                                    ${!worker.status || worker.status === "not available" ? "bg-gray-200 text-gray-600" : ""}
                                  `}
                      >
                        <span
                          className={`h-2 w-2 rounded-full 
                          ${worker.status === "available" ? "bg-green-500" : ""}
                          ${worker.status === "working" ? "bg-red-500" : ""}
                          ${!worker.status || worker.status === "not available" ? "bg-gray-400" : ""}
                        `}
                        ></span>
                        {worker.status ? worker.status.charAt(0).toUpperCase() + worker.status.slice(1) : "not available"}
                      </p>

                    </div>

                  </Link>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FindWorker;
