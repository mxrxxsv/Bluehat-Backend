import { useState, useEffect } from "react";
import { MapPin, Briefcase, Clock, Search, X, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { checkAuth } from "../api/auth";
import { getAllJobs, postJob as createJob } from "../api/jobs";
import axios from "axios";

const currentUser = {
  avatar:
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
};

const FindWork = () => {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobPosts, setJobPosts] = useState([]);
  const [user, setUser] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [newJob, setNewJob] = useState({
    description: "",
    location: "",
    priceOffer: "",
  });

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get("http://localhost:5000/skills");
        const cats = res.data?.data?.categories;
        if (Array.isArray(cats)) setCategories(cats);
        else setCategories([]);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

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
      const token = localStorage.getItem("token");
      const jobData = {
        description: newJob.description,
        location: newJob.location,
        price: parseFloat(newJob.priceOffer),
        category: selectedCategory,
      };
      const res = await createJob(jobData, token);
      const jobCreated = res.data?.data?.job || res.data?.data || res.data;
      setJobPosts((prev) => [jobCreated, ...prev]);
      setNewJob({ description: "", location: "", priceOffer: "" });
      setSelectedCategory("");
      setIsModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error posting job:", error);
      alert(error.response?.data?.message || "Failed to post job");
    }
  };

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await getAllJobs({ page: 1, limit: 20, status: "open" });
        const jobsArray = Array.isArray(res.data?.jobs) ? res.data.jobs : [];

        setJobPosts(jobsArray);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  // Fetch logged-in user
  useEffect(() => {
    checkAuth()
      .then((res) => setUser(res.data?.data))
      .catch(() => setUser(null));
  }, []);

  // Filter jobs based on search inputs
  const filteredJobs = Array.isArray(jobPosts)
    ? jobPosts.filter((job) => {
        const desc = job.description || "";
        const loc = job.location || "";
        return (
          desc.toLowerCase().includes(search.toLowerCase()) &&
          (location ? loc.toLowerCase().includes(location.toLowerCase()) : true)
        );
      })
    : [];

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

            {(newJob.description || newJob.location || selectedCategory) && (
              <div className="mt-6 pt-4">
                <div className="rounded-[20px] p-4 bg-gray-50 shadow-sm mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[#252525] opacity-75">
                      {user?.fullName || "Client Name"}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                      <Clock size={16} /> Just now
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

            <form onSubmit={handlePostJob} className="space-y-3">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full"
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

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle size={20} /> Job posted successfully!
        </div>
      )}

      {/* Job Posts */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Link
              key={job._id}
              to={`/job/${job._id}`}
              className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block"
            >
              <div className="rounded-xl p-4 bg-white transition-all">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#252525] opacity-75">
                    {job.client?.fullName || "Client Name"}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                    <Clock size={16} />{" "}
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                  <Briefcase size={20} className="text-blue-400" />
                  {job.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-xs">
                    {job.categoryName || "Uncategorized"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} /> {job.location}
                  </span>
                  <span className="font-bold text-green-400">
                    ₱{job.price.toLocaleString()}
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
