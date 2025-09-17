import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Clock, MapPin, Briefcase, ArrowLeft } from "lucide-react";
import { checkAuth } from "../api/auth";
import { getJobById } from "../api/jobs";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [error, setError] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ✅ Fetch job by ID
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await getJobById(id);
        const jobData = res.data.data || res.data;
        console.log("Fetched job:", jobData); // ✅ log the data
        setJob(jobData); // ✅ update state
      } catch (err) {
        console.error("❌ Error fetching job:", err);
        setError("Job not found.");
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJob();
  }, [id]);

  // ✅ Fetch current user
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

  if (loadingJob) {
    return <p className="text-center mt-10">Loading job...</p>;
  }

  if (error || !job) {
    return <p className="text-center text-red-500 mt-10">{error || "Job not found."}</p>;
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

      <article className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block">

        <div className="rounded-xl p-4 bg-white transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#252525] opacity-75">
              {job.client?.name || "Client Name"}
            </span>
            <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
              {/* <Clock size={16} /> */}
              {new Date(job.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>

          </div>
          <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
            <Briefcase size={20} className="text-blue-400" />
            {job.description}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-xs">
              {job.category?.name || "Uncategorized"}
            </span>
          </div>
          <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin size={16} /> {job.location}
            </span>
            <span className="font-bold text-green-400">
              ₱{job.price?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </article>

      {/* Bottom Action Button */}
      <div className="flex justify-end mt-10">
        {loadingUser ? (
          <p className="text-gray-500">Checking user...</p>
        ) : currentUser ? (
          currentUser.userType === "worker" ? (
            <button
              onClick={() => {
                if (job.client?.credentialId?._id) {
                  navigate(`/chat/${job.client.credentialId._id}`, {
                    state: { clientName: job.client.name },
                  });
                }
              }}
              className="bg-[#55b3f3] hover:bg-blue-300 text-white px-6 py-2 rounded-full shadow font-semibold cursor-pointer"
            >
              Apply
            </button>

          ) : (
            <>
            </>
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
