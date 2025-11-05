import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Clock, MapPin, Briefcase, ArrowLeft, X } from "lucide-react";
import { getProfile } from "../api/profile";
import { getJobById } from "../api/jobs";
import { applyToJob } from "../api/jobApplication";
import IDSetup from "../components/IDSetup";
import VerificationNotice from "../components/VerificationNotice";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [error, setError] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showIdSetup, setShowIdSetup] = useState(false);
  const [portfolioSetupCompleted, setPortfolioSetupCompleted] = useState({
    profilePhoto: false,
    biography: false,
    portfolio: false,
    certificates: false,
    experience: false,
    education: false,
    skills: false,
  });
  const [portfolioSetupInitialStep, setPortfolioSetupInitialStep] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Navigate to client profile from avatar/name
  const goToClientProfile = () => {
    const clientId = job?.client?.id || job?.clientId;
    if (clientId) navigate(`/client/${clientId}`);
  };

  // Fetch job by ID
  useEffect(() => {
    const fetchJob = async () => {
      try {
  const res = await getJobById(id);
  const jobData = res.data.data || res.data;
  setJob(jobData);
      } catch (err) {
        console.error("Error fetching job:", err);
        setError("Job not found.");
      } finally {
        setLoadingJob(false);
      }
    };
    fetchJob();
  }, [id]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getProfile();
        if (res.data.success) {
          const userData = res.data.data;
          setCurrentUser(userData);

          // Build completion flags similar to FindWork
          if (userData?.userType === "worker") {
            const biography = typeof userData.biography === "string" ? userData.biography.trim() : "";
            const portfolios = Array.isArray(userData.portfolio) ? userData.portfolio : [];
            const certificates = Array.isArray(userData.certificates) ? userData.certificates : [];
            const skills = Array.isArray(userData.skillsByCategory) ? userData.skillsByCategory : [];
            const experiences = Array.isArray(userData.experience) ? userData.experience : [];
            const education = Array.isArray(userData.education) ? userData.education : [];
            const hasProfilePhoto = Boolean(userData?.image);

            const completedFlags = {
              profilePhoto: hasProfilePhoto,
              biography: biography.length > 0,
              portfolio: portfolios.length > 0,
              certificates: certificates.length > 0,
              experience: experiences.length > 0,
              education: education.length > 0,
              skills: skills.length > 0,
            };

            setPortfolioSetupCompleted(completedFlags);

            const stepOrder = [
              { key: "profilePhoto", step: 1 },
              { key: "biography", step: 2 },
              { key: "portfolio", step: 3 },
              { key: "certificates", step: 4 },
              { key: "experience", step: 5 },
              { key: "education", step: 6 },
              { key: "skills", step: 7 },
            ];
            const firstIncomplete = stepOrder.find(({ key }) => !completedFlags[key]);
            setPortfolioSetupInitialStep(firstIncomplete ? firstIncomplete.step : 7);
          }
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

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!job?.id) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await applyToJob(job.id, {
        message: coverLetter,
        proposedRate: Number(proposedPrice),
      });

      // Close modal and show success
      setShowModal(false);
     
      // Optionally navigate to applications page
      navigate("/applications");
    } catch (err) {
      console.error("❌ Error applying:", err);
      setSubmitError(err.message || "Failed to apply.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return <p className="text-center mt-10">Loading job...</p>;
  }

  if (error || !job) {
    return (
      <p className="text-center text-red-500 mt-10">
        {error || "Job not found."}
      </p>
    );
  }

  return (
    <div className="max-w-5xl p-4 md:mx-auto pt-35 md:pt-45">
      {/* Verification Notice like FindWork */}
      <VerificationNotice user={currentUser} />
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-[#55b3f3] hover:text-blue-300 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
        </button>
      </div>

      {/* Job Card */}
      <article className="rounded-[20px] p-4 bg-white shadow-sm transition-all block">
        <div className="rounded-xl p-2 bg-white transition-all">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <img
                src={
                  typeof job.client?.profilePicture === "string" &&
                    job.client.profilePicture.trim() !== ""
                    ? job.client.profilePicture
                    : job.client?.profilePicture?.url &&
                      job.client.profilePicture.url.trim() !== ""
                      ? job.client.profilePicture.url
                      : "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                }
                alt={job.client?.name || "Client Avatar"}
                className="w-8 h-8 rounded-full object-cover cursor-pointer"
                onClick={goToClientProfile}
              />
              <span className="text-md md:text-base font-bold text-[#252525]">
                {job.client?.name || "Client Name"}
              </span>
            </div>
            <span className="flex items-center gap-1 font-medium text-sm text-[#252525] opacity-80">
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

          <div className="flex flex-wrap gap-2 mt-3 hidden md:flex">
            <span className="bg-[#55B2F3]/90 text-white font-medium backdrop-blur-sm px-2.5 py-1 rounded-md text-sm">
              {job.category?.name || "Uncategorized"}
            </span>
          </div>

          <div className="flex justify-between mt-3 items-center text-sm text-gray-600 ">
            <span className="flex items-center gap-1 ">
              <MapPin size={16} />
              <span className="overflow-hidden max-w-45 md:max-w-full text-left md:mt-0 md:text-base text-gray-500">
                {job.location}
              </span>
            </span>
            <span className="font-bold text-green-400">
              ₱{job.price?.toLocaleString() || 0}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 flex md:hidden">
            <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-xs">
              {job.category?.name || "Uncategorized"}
            </span>
          </div>
        </div>
      </article>

      {/* Bottom Action Button */}
      <div className="flex justify-end md:mt-5 gap-2">
        {String(job?.status || "").toLowerCase() === "open" && (
          loadingUser ? (
            <p className="text-gray-500">Checking user...</p>
          ) : currentUser ? (
            <>
              {currentUser.userType === "worker" ? (
                <>
                  {!currentUser.isVerified ? (
                    <button
                      onClick={() => setShowIdSetup(true)}
                      className="bg-amber-500 mt-4 md:mt-0 hover:bg-amber-600 text-white px-6 py-2 rounded-full shadow font-semibold cursor-pointer"
                    >
                      Verify
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowModal(true)}
                      className="bg-[#55b3f3] mt-4  md:mt-0 hover:bg-sky-500 text-white px-6 py-2 rounded-full shadow font-semibold cursor-pointer"
                    >
                      Apply
                    </button>
                  )}
                </>
              ) : currentUser.userType === "client" &&
                job.client?.credentialId._id === currentUser.id ? (
                <button
                  onClick={() => navigate(`/invite-workers/${job.id}`)}
                  className="bg-[#55b3f3] hover:bg-sky-500 mt-4 md:mt-0 text-white px-6 py-2 rounded-full shadow font-semibold cursor-pointer"
                >
                  Invite Workers
                </button>
              ) : null}
            </>
          ) : (
            <button
              onClick={() => navigate("/signup")}
              className="bg-[#55b3f3] mt-4  md:mt-0 hover:bg-sky-500 text-white px-6 py-2 rounded-full shadow font-semibold cursor-pointer"
            >
              Create Account
            </button>
          )
        )}
      </div>

      {/* Modal */}
      {showModal && (
  <div className="fixed inset-0 bg-[#f4f6f6] bg-opacity-40 flex justify-center items-center z-[2000] pointer-events-none">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative shadow-md pointer-events-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-[#252525]">
              Apply for this Job
            </h2>

            {submitError && (
              <p className="text-red-500 text-sm mb-3">{submitError}</p>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-3">
              <div>
                <label className="block text-sm font-medium">
                  Cover Letter
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  required
                  minLength={20}
                  maxLength={2000}
                  className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                  rows="4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Proposed Price
                </label>
                <input
                  type="number"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  required
                  min={0}
                  max={1000000}
                  className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                />
              </div>

              {/* <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium">Duration</label>
                  <input
                    type="number"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    required
                    min={1}
                    max={365}
                    className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium">Unit</label>
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div> */}

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#55b3f3] hover:bg-blue-300 text-white px-6 py-2 rounded-full shadow font-semibold w-full cursor-pointer"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ID Setup Modal */}
      {showIdSetup && (
        <IDSetup onClose={() => setShowIdSetup(false)} />
      )}
    </div>
  );
};

export default JobDetails;
