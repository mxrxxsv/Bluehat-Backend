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
import workers from "../Objects/workers";
import skillCategories from "../Objects/skillCategories";
import skillsByCategory from "../Objects/skillsByCategory";
import profile from '../assets/worker.png';


const rainbowColors = [
  "#FF595E",
  "#FFCA3A",
  "#8AC926",
  "#1982C4",
  "#6A4C93",
  "#FF8C42",
  "#6DC6FF",
];

const FindWorker = () => {
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

    const matchesSearch =
      worker.name.toLowerCase().includes(filtering.search.toLowerCase()) ||
      worker.skills.some((s) =>
        s.toLowerCase().includes(filtering.search.toLowerCase())
      ) ||
      worker.location.toLowerCase().includes(filtering.search.toLowerCase());

    const matchesLocation = filtering.location
      ? worker.location.toLowerCase().includes(filtering.location.toLowerCase())
      : true;

    const matchesSkills = filtering.selectedSkills.length
      ? filtering.selectedSkills.every((skill) =>
        worker.skills.some((s) => s.toLowerCase() === skill.toLowerCase())
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
                  : "No rating";

                return (
                  <Link
                    to={`/worker/${worker.id}`}
                    key={worker.id}
                    className="w-full py-4"
                  >
                    <div
                      className="relative bg-white rounded-2xl shadow-md p-4 flex items-center w-full"
                      onMouseOver={isMouseOver}
                      onMouseOut={isMouseOut}
                    >
                      <div className="flex flex-col justify-between h-full mr-4" />
                      <div className="flex items-start gap-4 flex-1 text-[#252525]">
                        <img
                          src={profile}
                          alt={worker.name}
                          className="w-24 h-24 rounded-full object-cover border pt-3"
                        />
                        <div className="flex flex-col justify-between h-full">
                          <h2 className="text-xl font-semibold text-left">
                            {worker.name}
                          </h2>
                          <p className="text-sm text-gray-700 mt-1 text-left">
                            {worker.description}
                          </p>
                          <p className="text-sm text-gray-700 text-left flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            {worker.location}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {worker.skills.slice(0, 3).map((skill, index) => (
                              <span
                                key={index}
                                className="text-[#f4f6f6] text-[12.5px] font-light px-3 py-1 rounded-full text-xs bg-[#55b3f3] shadow-md"
                              >
                                {skill}
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

                      <div className="absolute top-4 right-4">
                        <p className="text-yellow-500 font-semibold text-sm">
                          ⭐ {avgRating}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleBookmarkClick(worker.id);
                        }}
                        className="flex items-center gap-1 absolute bottom-2 md:bottom-4 right-1.5 bg-blue-500 text-white p-1 px-2 md:px-4 md:py-2 rounded-[8px] hover:bg-blue-600 shadow-md cursor-pointer"
                      >
                        {isBookmark[worker.id] ? (
                          <BookmarkCheck size={16} />
                        ) : (
                          <Bookmark size={16} />
                        )}
                        Save
                      </button>
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
