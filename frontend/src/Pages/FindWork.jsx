import { useState, useEffect } from "react";
import { MapPin, Briefcase, Clock, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import jobPostsData from "../Objects/jobPosts";
import { checkAuth } from "../api/auth";
import skillCategories from "../Objects/skillCategories";
import skillsByCategory from "../Objects/skillsByCategory";

// Example placeholder user (replace with real auth user later)
const currentUser = {
  avatar: "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
};

const FindWork = () => {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [jobPosts, setJobPosts] = useState(jobPostsData);
  const [user, setUser] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    location: "",
    priceOffer: "",
  });

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);

  // Toggle skill selection
  const handleSkillToggle = (skillName) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((s) => s !== skillName)
        : [...prev, skillName]
    );
  };

  // Handle posting a new job
  const handlePostJob = (e) => {
    e.preventDefault();

    if (
      !newJob.title ||
      !newJob.description ||
      !newJob.location ||
      !newJob.priceOffer
    ) {
      alert("Please fill out all required fields");
      return;
    }

    const jobToAdd = {
      id: Date.now(),
      clientName: user.fullName, 
      title: newJob.title,
      description: newJob.description,
      location: newJob.location,
      skillsRequired: selectedSkills,
      priceOffer: parseFloat(newJob.priceOffer),
      datePosted: "Just now",
    };

    setJobPosts([jobToAdd, ...jobPosts]);
    setNewJob({
      title: "",
      description: "",
      location: "",
      priceOffer: "",
    });
    setSelectedCategory("");
    setSelectedSkills([]);
    setIsModalOpen(false);
  };

  // Filter jobs based on search inputs
  const filteredJobs = jobPosts.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = location
      ? job.location.toLowerCase().includes(location.toLowerCase())
      : true;
    const matchesSkill = skill
      ? job.skillsRequired.some((s) =>
        s.toLowerCase().includes(skill.toLowerCase())
      )
      : true;

    return matchesSearch && matchesLocation && matchesSkill;
  });

  // Fetch logged-in user
  useEffect(() => {
    checkAuth()
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 mt-20 md:mt-30">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Search className="relative left-2 top-11.5 md:left-12 md:top-2.5 text-gray-400 w-5 h-5 z-10" />
        <input
          type="text"
          placeholder="Search job titles or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/2 px-4 py-2 shadow rounded-[18px] bg-white pl-10 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          type="text"
          placeholder="Filter by location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full md:w-1/4 px-4 py-2 shadow rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          type="text"
          placeholder="Filter by skill"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="w-full md:w-1/4 px-4 py-2 shadow rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Post Box */}
      <div
        onClick={() => setIsModalOpen(true)}
        className="bg-white shadow rounded-[20px] p-4 mb-6 cursor-pointer hover:shadow-md transition"
      >
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatar}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 bg-gray-100 px-4 py-2 rounded-full text-gray-500 text-left">
            Post a work...
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (

        
        


        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 shadow-lg relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-1 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X size={20} />
            </button>

             {/* Live Preview */}
            {(newJob.title || newJob.description || newJob.location || selectedSkills.length > 0) && (
              <div className="mt-6 pt-4">
               
                <div className="rounded-[20px] p-4 bg-gray-50 shadow-sm mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[#252525] opacity-75">
                      {user.fullName}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                      <Clock size={16} /> Just now
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase size={20} className="text-blue-400" />
                    {newJob.title || "Job title here..."}
                  </h2>
                  <p className="text-gray-700 mt-1 text-left">
                    {newJob.description || "Job description will appear here..."}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedSkills.length > 0 ? (
                      selectedSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">No skills selected</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin size={16} /> {newJob.location || "Location"}
                    </span>
                    <span className="font-bold text-green-400">
                      {newJob.priceOffer ? `₱${parseFloat(newJob.priceOffer).toLocaleString()}` : "₱0"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handlePostJob} className="space-y-3">
              <input
                type="text"
                placeholder="Job title"
                value={newJob.title}
                onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                className="px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full"
              />
              <textarea
                placeholder="Job description"
                value={newJob.description}
                onChange={(e) =>
                  setNewJob({ ...newJob, description: e.target.value })
                }
                className="px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full"
              />
              <input
                type="text"
                placeholder="Location"
                value={newJob.location}
                onChange={(e) =>
                  setNewJob({ ...newJob, location: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block"
              />

              {/* Category + Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(Number(e.target.value))}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full"
                >
                  <option value="">Select a category</option>
                  {skillCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {selectedCategory && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                      Skills
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {skillsByCategory
                        .filter((s) => s.categoryId === selectedCategory)
                        .map((s) => {
                          const isSelected = selectedSkills.includes(s.name);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleSkillToggle(s.name)}
                              className={`px-3 py-1 rounded-full text-sm border ${isSelected
                                  ? "bg-[#55b3f3] text-white border-blue-500"
                                  : "bg-gray-100 text-gray-700 border-gray-300"
                                }`}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <input
                type="number"
                placeholder="Price offer (₱)"
                value={newJob.priceOffer}
                onChange={(e) =>
                  setNewJob({ ...newJob, priceOffer: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block"
              />

              <button
                type="submit"
                className="w-full px-4 py-2 bg-[#55b3f3] text-white rounded-md hover:bg-blue-400 cursor-pointer"
              >
                Post Job
              </button>
            </form>

           
          </div>
        </div>
      )}


      {/* Job Posts */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              to={`/job/${job.id}`}
              className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block"
            >
              <div className="rounded-xl p-4 bg-white transition-all">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#252525] opacity-75">
                    {job.clientName}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                    <Clock size={16} />
                    {job.datePosted}
                  </span>
                </div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase size={20} className="text-blue-400" />
                  {job.title}
                </h2>
                <p className="text-gray-700 mt-1 text-left">{job.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {job.skillsRequired.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} /> {job.location}
                  </span>
                  <span className="font-bold text-green-400">
                    ₱{job.priceOffer.toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center mt-10">No job posts found.</p>
      )}
    </div>
  );
};

export default FindWork;
