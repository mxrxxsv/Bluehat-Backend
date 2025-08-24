import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import jobPosts from "../Objects/jobPosts";
import { Clock, MapPin, Briefcase, ArrowLeft } from "lucide-react";
import { checkAuth } from "../api/auth"; 

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const job = jobPosts.find((job) => job.id.toString() === id);

  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await checkAuth(); 
        if (res.data.success) {
          setCurrentUser(res.data.data);
        }
      } catch (err) {
        console.error("❌ Error fetching user:", err);
        setCurrentUser(null); 
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  if (!job) {
    return <p className="text-center text-red-500 mt-10">Job not found.</p>;
  }

  return (
    <div className="max-w-5xl p-4 md:mx-auto pt-35 md:pt-45">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-[#55b3f3] hover:text-blue-300 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
        </button>
      </div>

      <article className="md:gap-2 md:grid md:grid-cols-2 p-8 bg-white shadow-sm rounded-[20px]">
        {/* LEFT: Profile Info */}
        <div>
          <div className="flex items-center mb-6">
            <img
              className="w-10 h-10 rounded-full"
              src={
                job.clientImage ||
                "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0="
              }
              alt={job.clientName}
            />
            <div className="ms-4 font-medium">
              <p>{job.clientName}</p>
              <div className="flex items-center text-sm text-gray-500">
                <Clock size={13} className="mr-0.5" />
                {job.datePosted}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Job Description */}
        <div className="col-span-2 mt-6 md:mt-0">
          <div className="flex items-start mb-5 justify-between">
            <div className="pe-4">
              <div className="flex flex-row gap-2">
                <Briefcase size={26} className="text-blue-400" />
                <h4 className="text-xl font-bold text-gray-900 text-left">
                  {job.title}
                </h4>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={15} className="mr-0.5" />
                {job.location}
              </p>
            </div>
            <span className="text-green-400 text-sm font-semibold px-3 py-1 rounded">
              ₱{job.priceOffer.toLocaleString()}
            </span>
          </div>

          <p className="mb-2 text-gray-500 text-left">{job.description}</p>

          <div className="mt-4">
            <h5 className="font-semibold mb-2 text-gray-700 text-left">
              Skills Required:
            </h5>
            <div className="flex flex-wrap gap-2">
              {job.skillsRequired.map((skill, index) => (
                <span
                  key={index}
                  className="bg-[#55b3f3] text-white px-3 py-1 rounded-full text-xs shadow-md"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>

      {/* Bottom Action Button */}
      <div className="flex justify-end mt-10">
        {loadingUser ? (
          <p className="text-gray-500">Checking user...</p>
        ) : currentUser ? (
          currentUser.userType === "worker" ? (
            <button className="bg-[#55b3f3] hover:bg-blue-300 text-white px-6 py-2 rounded-full shadow font-semibold cursor-pointer">
              Apply
            </button>
          ) : (
            <button className="bg-green-500 hover:bg-green-400 text-white px-6 py-2 rounded-full shadow font-semibold cursor-pointer">
              View Applicants
            </button>
          )
        ) : (
          <p className="text-red-500 font-medium">
            Please log in to apply or edit jobs.
          </p>
        )}
      </div>
    </div>
  );
};

export default JobDetails;
