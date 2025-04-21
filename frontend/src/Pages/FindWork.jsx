import { useState } from "react";
import { MapPin, Briefcase, Clock, Search } from "lucide-react";
import { Link } from "react-router-dom";
import jobPosts from "../Objects/jobPosts"; // this will contain dummy or real data

const FindWork = () => {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");

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

  return (
    <div className="max-w-5xl mx-auto p-4 mt-20 md:mt-30">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
      <Search className="relative left-2 top-11.5  md:left-12 md:top-2.5 text-gray-400 w-5 h-5 z-10" />
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

      {/* Job Posts */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              to={`/job/${job.id}`} // Use the job ID for routing
              className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block"
            >
              <div
                key={job.id}
                className="rounded-xl p-4 bg-white transition-all"
              >
                {/* Header: Client Name and Date */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm md:text-[14px] font-medium text-[#252525] opacity-75">
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

                <p className="text-gray-700 mt-1 text-left">
                  {job.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {job.skillsRequired.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-[#55b3f3] shadow-md text-[#f4f6f6] px-3 py-1 rounded-full text-xs"
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
