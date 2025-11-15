import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Briefcase, CheckCircle, X, Send } from "lucide-react";
import axios from "axios";
import AddressInput from "../components/AddressInput";

const PLACEHOLDER =
  "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
import { getWorkerById } from "../api/worker";
import { getWorkerReviewsById } from "../api/feedback";
import { getJobById, postJob as createJob, getAllJobs } from "../api/jobs";
import { inviteWorker } from "../api/workerInvitation.jsx";
import { baseURL } from "../utils/appMode.js";
import { getProfile } from "../api/profile";

const WorkerPortfolio = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [reviewsState, setReviewsState] = useState({
    reviews: [],
    averageRating: 0,
    totalReviews: 0,
  });
  const [jobMap, setJobMap] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobCategory, setJobCategory] = useState("");
  const [jobPrice, setJobPrice] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState({ show: false, message: "" });

  // Existing jobs for the current user
  const [useExistingJob, setUseExistingJob] = useState(false);
  const [userJobs, setUserJobs] = useState([]);
  const [userJobsLoading, setUserJobsLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        setLoading(true);
        const data = await getWorkerById(id);
        const workerData = data.worker || data;
        setWorker(workerData);

        // Frontend-only enrichment: fetch worker reviews & stats (auth required)
        try {
          const resp = await getWorkerReviewsById(id, { page: 1, limit: 10 });
          const payload = resp?.data || resp; // controller likely wraps in { success, data: { ... } }
          const stats = payload?.data?.statistics || payload?.statistics || {};
          const reviews = payload?.data?.reviews || payload?.reviews || [];

          setReviewsState({
            reviews,
            averageRating: Number(
              stats?.averageRating ?? workerData?.rating ?? 0
            ),
            totalReviews: Number(
              stats?.totalReviews ??
              (Array.isArray(workerData?.reviews)
                ? workerData.reviews.length
                : 0)
            ),
          });
        } catch (e) {
          console.error(
            "[WorkerPortfolio] Failed to fetch worker reviews; falling back to worker.reviews",
            e
          );
          // Fallback to worker embedded reviews if reviews endpoint not accessible (e.g., unauthenticated)
          const fallbackReviews = Array.isArray(workerData?.reviews)
            ? workerData.reviews
            : [];
          const avg = fallbackReviews.length
            ? fallbackReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) /
            fallbackReviews.length
            : 0;
          setReviewsState({
            reviews: fallbackReviews,
            averageRating: avg,
            totalReviews: fallbackReviews.length,
          });
        }
      } catch {
        // keep existing error UI
      } finally {
        setLoading(false);
      }
    };

    fetchWorker();
  }, [id]);

  // Load categories and user's jobs when opening invite modal
  useEffect(() => {
    const loadCats = async () => {
      try {
        setCatsLoading(true);
        const res = await axios.get(`${baseURL}/skills`);
        const cats = res?.data?.data?.categories || [];
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (e) {
        console.error("[WorkerPortfolio] Failed to load categories", e);
        setCategories([]);
      } finally {
        setCatsLoading(false);
      }
    };
    const loadUserJobs = async () => {
      // Backend expects clientId to be the Client profile _id, not credential _id
      const clientProfileId = currentUser?.profileId;
      if (!clientProfileId) return;
      try {
        setUserJobsLoading(true);
        let jobs = [];
        // 1) Try: filter by clientId + open
        try {
          const resp1 = await getAllJobs({ clientId: clientProfileId, status: "open", page: 1, limit: 50, _t: Date.now() });
          const p1 = resp1?.data || resp1;
          jobs = p1?.data?.jobs || p1?.data || p1?.jobs || [];
        } catch { }

        // 2) Fallback: filter by clientId only
        if (!Array.isArray(jobs) || jobs.length === 0) {
          try {
            const resp2 = await getAllJobs({ clientId: clientProfileId, page: 1, limit: 50, _t: Date.now() });
            const p2 = resp2?.data || resp2;
            jobs = p2?.data?.jobs || p2?.data || p2?.jobs || [];
          } catch { }
        }

        // 3) Last resort: fetch without filters then filter locally by client id
        if (!Array.isArray(jobs) || jobs.length === 0) {
          try {
            const resp3 = await getAllJobs({ page: 1, limit: 50, _t: Date.now() });
            const p3 = resp3?.data || resp3;
            const all = p3?.data?.jobs || p3?.data || p3?.jobs || [];
            jobs = Array.isArray(all)
              ? all.filter((j) => (j?.client?.id) === clientProfileId)
              : [];
          } catch { }
        }

        // Filter out ineligible jobs: completed/working (and common variants)
        const rawArr = Array.isArray(jobs) ? jobs : [];
        const filteredArr = rawArr.filter((j) => {
          const statusRaw = j?.status || j?.currentStatus || "";
          const s = String(statusRaw).toLowerCase().replace(/\s+/g, "_");
          return !["completed", "working", "in_progress", "in-progress"].includes(s);
        });

        setUserJobs(filteredArr);
        // Default to existing job tab when eligible jobs are available
        if (filteredArr.length > 0) {
          setUseExistingJob(true);
          // Do not auto-select any job; selection should always be explicit
        } else {
          setUseExistingJob(false);
        }
      } catch (e) {
        console.error("[WorkerPortfolio] Failed to load user's jobs", e);
        setUserJobs([]);
        setUseExistingJob(false);
      } finally {
        setUserJobsLoading(false);
      }
    };
    if (showInviteModal && categories.length === 0) {
      loadCats();
    }
    if (showInviteModal) {
      loadUserJobs();
    }
  }, [showInviteModal, currentUser]);

  // Enrich missing job details for each review's job header (frontend-only; cached by jobMap)
  useEffect(() => {
    const reviews = reviewsState?.reviews || [];
    if (!reviews.length) return;

    const idsToFetch = new Set();
    for (const r of reviews) {
      const j = r.jobId || r.job;
      if (!j) continue;
      if (typeof j === "string") {
        if (!jobMap[j]) idsToFetch.add(j);
      } else if (j && typeof j === "object") {
        const jid = j._id;
        // Fetch if essential fields are missing
        const missingFields = !(
          j.price &&
          j.location &&
          j.category &&
          j.client
        );
        if (jid && missingFields && !jobMap[jid]) idsToFetch.add(jid);
      }
    }

    const fetchIds = Array.from(idsToFetch);
    if (!fetchIds.length) return;

    let cancelled = false;
    const run = async () => {
      const entries = await Promise.all(
        fetchIds.map(async (jid) => {
          try {
            const resp = await getJobById(jid);
            const payload = resp?.data || resp;
            const jobData =
              payload?.data?.job || payload?.data || payload?.job || payload;
            // Debug log removed
            return [jid, jobData];
          } catch (err) {
            console.warn("[WorkerPortfolio] Failed to fetch job for review", {
              jobId: jid,
              error: err,
            });
            return [jid, null];
          }
        })
      );
      if (cancelled) return;
      setJobMap((prev) => {
        const next = { ...prev };
        for (const [jid, jdata] of entries) {
          if (jdata) next[jid] = jdata;
        }
        return next;
      });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [reviewsState.reviews, jobMap]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getProfile();
        setCurrentUser(userData.data.data);
      } catch {
        setCurrentUser(null);
      }
    };

    fetchUser();
  }, []);
  const { province, city, barangay } = worker?.address || {};

  const isBusy =
    String(worker?.status || "").toLowerCase() === "working" ||
    String(worker?.status || "").toLowerCase() === "not available" ||
    String(worker?.availability || "").toLowerCase() === "busy";

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  if (loading) return <p>Loading worker details...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!worker) return <p>Worker not found.</p>;

  const renderStars = (rating) => {
    return "⭐️".repeat(rating) + "☆".repeat(5 - rating);
  };

  const reviews = reviewsState.reviews || worker?.reviews || [];
  const averageRating = Number.isFinite(reviewsState.averageRating)
    ? Number(reviewsState.averageRating).toFixed(1)
    : reviews.length > 0
      ? (
        reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
        reviews.length
      ).toFixed(1)
      : "0";

  return (
    <div className="p-6 bg-[#f4f6f6] rounded-xl shadow-md space-y-6 w-full lg:w-[90%] my-4 mx-auto mt-30 bg-white">
      {/* Top Section: Profile Picture and Basic Info */}

      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-[#55b3f3] hover:text-blue-300 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
        </button>
      </div>

      <div className="flex items-start gap-6">
        <img
          src={worker.profilePicture?.url || PLACEHOLDER}
          alt={worker.fullName || "Worker"}
          onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
          className="w-24 h-24 rounded-full object-cover border"
        />

        <div className="flex-1 space-y-1 text-left ">
          <h1 className="text-sm md:text-3xl font-bold">{worker?.fullName}</h1>
          <p className="text-gray-700">{worker?.biography}</p>
          <p className="text-[12px] md:text-sm text-gray-500 flex flex-row">
            {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg> */}
            <span className="font-bold pr-1">Location:</span>{" "}
            {`${barangay}, ${city}, ${province}`}
          </p>
          <p className="text-[12px] md:text-sm text-gray-500">
            <span className="font-bold">Age:</span>{" "}
            {`${calculateAge(worker.dateOfBirth)} years old`} <br />
            <span className="font-bold">Gender:</span> {worker?.sex}
          </p>

          <div className="mt-3 flex gap-2">
            {currentUser?.userType === "client" && (
              <button
                onClick={() => {
                  if (isBusy) {
                    setInviteFeedback({
                      show: true,
                      message:
                        "This worker is currently busy. Please choose another worker or try again later.",
                    });
                    return;
                  }
                  setShowInviteModal(true);
                }}
                disabled={isBusy}
                className={
                  "flex p-2 px-4 text-white shadow-md rounded-[16px] hover:shadow-lg cursor-pointer " +
                  (isBusy
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-[#55b3f3] hover:bg-sky-500")
                }
              >
                <Send className="w-4 h-4 mt-1 mr-2" />
                Invite Worker

              </button>
            )}

            {/* <button className="px-4 py-2 bg-gray-500 text-white shadow-md rounded-[14px] hover:bg-gray-400 hover:shadow-lg cursor-pointer">
              Save
            </button> */}
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-left">Skills</h2>
        <div className="flex flex-wrap gap-2 mt-3">
          {(worker.skills || []).map((skill, index) => (
            <span
              key={skill.skillCategoryId || index}
              className="bg-[#55B2F3]/90 text-white font-medium backdrop-blur-sm px-2.5 py-1 rounded-md text-sm"
            >
              {skill.categoryName || "Unnamed Skill"}
            </span>
          ))}

          {/* Removed '+N more' badge on this page as requested */}
        </div>
      </div>

      {/* Experience + Education side-by-side on large screens */}
      <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Experience Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2 text-left">
            Work Experience
          </h2>
          <div className="space-y-4">
            {(worker.experience || []).map((exp, index) => (
              <div
                key={exp._id || index}
                className="shadow p-4 my-2 rounded-md text-left bg-white shadow-sm"
              >
                <h3 className="font-semibold text-lg">
                  {exp.companyName || exp.company}
                </h3>
                <p className="text-sm text-gray-500">
                  {exp.startYear || exp.years} • {exp.position}
                </p>
                <p className="mt-1 text-gray-700">
                  {exp.description || exp.responsibilities}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Education Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2 text-left">Education</h2>
          <div className="space-y-4">
            {(worker.education || []).map((edu, index) => {
              const startDate = edu.startDate
                ? new Date(edu.startDate).getFullYear()
                : "";
              const endDate = edu.endDate
                ? new Date(edu.endDate).getFullYear()
                : "Present";
              const yearRange = startDate ? `${startDate} - ${endDate}` : "";

              return (
                <div
                  key={edu._id || index}
                  className="shadow p-4 my-2 rounded-md text-left bg-white shadow-sm"
                >
                  <h3 className="font-semibold text-lg">{edu.schoolName}</h3>
                  <p className="text-sm text-gray-500">
                    {yearRange} • {edu.educationLevel}
                  </p>
                  {edu.degree && (
                    <p className="text-sm text-gray-600 mt-1">{edu.degree}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Status: {edu.educationStatus}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Portfolio Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-left">Portfolio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {(worker.portfolio || []).map((item) => (
            <div
              key={item._id}
              className="shadow p-4 rounded-xl text-left bg-white hover:shadow-lg transition flex flex-col justify-between"
            >
              {/* Image Section */}
              <div className="w-full h-40 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                <img
                  src={
                    item.image?.url
                      ? item.image.url
                      : "https://via.placeholder.com/300x200?text=No+Image"
                  }
                  alt={item.projectTitle || "Portfolio Project"}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>

              {/* Content Section */}
              <div className="mt-3 flex-1">
                <h4 className="text-lg font-semibold text-gray-800">
                  {item.projectTitle || "Untitled Project"}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {item.description || "No description provided."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificates Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-left">Certificates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(worker.certificates || []).map((cert, index) => (
            <div
              key={cert._id || index}
              className="shadow p-2 rounded-md bg-white shadow-sm"
            >
              <img
                src={cert.url || cert.image}
                alt={cert.title || `Certificate ${index + 1}`}
                className="w-full h-auto rounded-md"
              />
              {cert.title && (
                <p className="text-sm text-center mt-2 text-gray-700 font-bold">
                  {cert.title}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-left">Ratings & Reviews</h2>
          <p className="text-gray-700 font-medium text-sm flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.97c.3.922-.755 1.688-1.54 1.118l-3.386-2.46a1 1 0 00-1.175 0l-3.386 2.46c-.785.57-1.84-.196-1.54-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.05 9.397c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.97z" />
            </svg>
            <span className="mt-0.5">{averageRating}</span>
            <span className="mt-0.5 text-gray-500">
              ({reviewsState.totalReviews || reviews.length})
            </span>
          </p>
        </div>

        <div className="space-y-2">
          {(reviews || []).map((review, index) => {
            const reviewerObj = review.reviewer || review.reviewerId || {};
            const reviewerName =
              (
                review.reviewerName ||
                `${reviewerObj.firstName || ""} ${reviewerObj.lastName || ""}`
              ).trim() || "Anonymous";
            const avatar =
              reviewerObj.profilePicture?.url ||
              "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
            const text = review.feedback || review.comment || "";
            const rate = Number(review.rating) || 0;
            const baseJob = review.jobId || review.job || null;
            const jobId = typeof baseJob === "string" ? baseJob : baseJob?._id;
            const job = jobId ? jobMap[jobId] || baseJob : baseJob;
            const reviewDate = review.reviewDate || review.createdAt;
            const clientName =
              job?.client?.name ||
              `${job?.client?.firstName || ""} ${job?.client?.lastName || ""
                }`.trim() ||
              reviewerName;

            return (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-md text-left bg-white shadow-sm flex flex-col"
              >
                {/* Job post header - full FindWork-style block */}
                {job && (
                  <div className="w-full mb-3 space-y-4 pb-4">
                    <div
                      className="rounded-[20px] p-2 bg-white shadow-sm hover:shadow-lg transition-all block cursor-pointer"
                      onClick={() => jobId && navigate(`/job/${jobId}`)}
                      role="button"
                      aria-label="View job details"
                    >
                      <div className="rounded-xl p-4 bg-white transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={job.client?.profilePicture?.url || avatar}
                              alt="Client Avatar"
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) =>
                                (e.currentTarget.src = "/default-profile.png")
                              }
                            />

                            <span className="text-md font-semibold text-[#252525]">
                              {clientName}
                            </span>
                          </div>

                          <span className="flex items-center gap-1 text-sm font-medium text-[#252525] opacity-80">
                            {reviewDate
                              ? new Date(reviewDate).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )
                              : ""}
                          </span>
                        </div>
                        <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5">
                            <Briefcase size={20} className="text-[#55B2F3]" />
                          </span>
                          <span className="line-clamp-1 md:text-base">
                            {job.description || job.title || "Job post"}
                          </span>
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {(job.category?.name ||
                            job.category?.categoryName ||
                            (typeof job.category === "string" &&
                              job.category)) && (
                              <span className="bg-[#55B2F3]/90 text-white font-medium backdrop-blur-sm px-2.5 py-1 rounded-md text-sm">
                                {job.category?.name ||
                                  job.category?.categoryName ||
                                  (typeof job.category === "string"
                                    ? job.category
                                    : "")}
                              </span>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-4 text-sm text-gray-600 ">
                          <span className="flex items-center gap-1">
                            <MapPin size={16} />
                            <span className="truncate overflow-hidden max-w-45 md:max-w-full md:text-base text-gray-500">
                              {job.location || ""}
                            </span>
                          </span>
                          <span className="font-bold text-green-400">
                            {typeof job.price === "number" ||
                              typeof job.price === "string"
                              ? `₱${Number(job.price).toLocaleString()}`
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-[10px]">
                  <div className="flex flex-row gap-2">
                    <img
                      src={avatar || PLACEHOLDER}
                      alt={clientName}
                      className="w-8 h-8 rounded-full object-cover border"
                      onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                    />
                    <p className="font-semibold mt-1">{clientName}</p>
                  </div>
                  <p className="text-sm text-yellow-500 mt-2">{renderStars(rate)}</p>
                  {text && <p className="mt-1 text-gray-700">{text}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Invite Modal: Create Job Send Invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-xl shadow-lg border border-gray-200 relative">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowInviteModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-left">
              Invite {worker.firstName || worker.fullName?.split(" ")?.[0] || "worker"}
            </h3>
            {/* Tabs: Existing job vs New job */}
            <div className="mb-4 flex rounded-lg overflow-hidden border border-gray-200 w-full">
              <button
                type="button"
                onClick={() => setUseExistingJob(true)}
                className={`flex-1 py-2 text-sm font-medium cursor-pointer ${useExistingJob ? "bg-[#55b3f3] text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              >
                Use existing job post
              </button>
              <button
                type="button"
                onClick={() => setUseExistingJob(false)}
                className={`flex-1 py-2 text-sm font-medium cursor-pointer ${!useExistingJob ? "bg-[#55b3f3] text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              >
                Create a new job post
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isBusy) {
                  setInviteFeedback({ show: true, message: "Worker is busy." });
                  return;
                }
                // Validation conditional on tab
                if (useExistingJob) {
                  if (!selectedJobId) {
                    setInviteFeedback({ show: true, message: "Please select one of your job posts." });
                    return;
                  }
                } else {
                  if (!jobDescription.trim() || !jobLocation.trim() || !jobCategory || !jobPrice) {
                    setInviteFeedback({ show: true, message: "Please complete the job details." });
                    return;
                  }
                }
                if (!inviteMessage.trim() || inviteMessage.trim().length < 20) {
                  setInviteFeedback({ show: true, message: "Please add a message (≥ 20 chars)." });
                  return;
                }
                setSendingInvite(true);
                try {
                  let finalJobId = selectedJobId;
                  let proposedRate = 0;
                  if (useExistingJob) {
                    const jobObj = userJobs.find((j) => (j._id || j.id) === selectedJobId);
                    if (!jobObj) throw new Error("Selected job is no longer eligible. Please select another open job.");
                    // Extra safety: validate status again
                    const statusRaw = jobObj?.status || jobObj?.currentStatus || "";
                    const s = String(statusRaw).toLowerCase().replace(/\s+/g, "_");
                    if (["completed", "working", "in_progress", "in-progress"].includes(s)) {
                      throw new Error("This job can't be used for new invitations.");
                    }
                    finalJobId = jobObj._id || jobObj.id;
                    proposedRate = Number(jobObj.price || 0);
                    if (!finalJobId) throw new Error("No job selected");
                  } else {
                    const createPayload = {
                      description: jobDescription.trim(),
                      location: jobLocation.trim(),
                      price: parseFloat(jobPrice),
                      category: jobCategory,
                    };
                    const jobRes = await createJob(createPayload);
                    const created = jobRes?.data?.data?.job || jobRes?.data?.job || jobRes?.data?.data || jobRes?.data;
                    const createdJobId = created?._id || created?.id;
                    if (!createdJobId) throw new Error("Couldn't get created job id");
                    finalJobId = createdJobId;
                    proposedRate = Number(jobPrice);
                  }

                  await inviteWorker(worker._id || worker.id, {
                    jobId: finalJobId,
                    description: inviteMessage.trim(),
                    proposedRate,
                  });

                  // reset & close
                  setShowInviteModal(false);
                  setJobDescription("");
                  setJobLocation("");
                  setJobCategory("");
                  setJobPrice("");
                  setSelectedJobId("");
                  setUseExistingJob(false);
                  setInviteMessage("");
                  setInviteFeedback({ show: true, message: "Invitation sent successfully!" });
                } catch (err) {
                  console.error("[WorkerPortfolio] Invite flow failed", err);

                  // Parse backend error structure (see backend/controllers/job.controller.js)
                  // - Validation errors: { success:false, message:"Validation error", code: "VALIDATION_ERROR", errors: [{ field, message, value }] }
                  // - Duplicate / other errors: { success:false, message, code: "DUPLICATE_ERROR" }
                  // - Generic server error: { success:false, message, code: "JOB_ERROR" }
                  let userMessage = "Something went wrong.";

                  if (err?.response && err.response.data) {
                    const data = err.response.data;

                    // Validation error -> show field messages if available
                    if (data.code === "VALIDATION_ERROR" && Array.isArray(data.errors) && data.errors.length > 0) {
                      const fieldMsgs = data.errors.map((e) => {
                        if (e && e.field && e.message) return `${e.field}: ${e.message}`;
                        if (e && e.message) return e.message;
                        return JSON.stringify(e);
                      });
                      userMessage = fieldMsgs.join("; ") || data.message || "Validation error";
                    } else if (data.message && data.code) {
                      // Known error with a code (e.g., duplicate)
                      userMessage = data.message;
                      // Show code in dev to aid debugging
                      if (process.env.NODE_ENV !== "production") userMessage += ` (${data.code})`;
                    } else if (data.message) {
                      userMessage = data.message;
                    }
                  } else if (err.request) {
                    // Request sent but no response (network/server unreachable)
                    userMessage = "Network error: failed to reach server. Please check your connection and try again.";
                  } else if (err.message) {
                    // Other errors
                    userMessage = err.message;
                  }

                  setInviteFeedback({ show: true, message: userMessage });
                } finally {
                  setSendingInvite(false);
                }
              }}
              className="space-y-4 text-left"
            >
              {/* Job fields or Existing job selector */}
              {useExistingJob ? (
                <div className="space-y-3">
                  {userJobsLoading ? (
                    <div className="space-y-2">
                      <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                      <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    </div>
                  ) : userJobs.length === 0 ? (
                    <div className="p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
                      You have no available job posts. Switch to "Create a new job post".
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-auto custom-scrollbar space-y-3">
                      {userJobs.map((job) => {
                        const jid = job._id || job.id;
                        const isSelected = selectedJobId === jid;
                        const clientName = (job.client?.name || `${job.client?.firstName || ""} ${job.client?.lastName || ""}`.trim()) || currentUser?.name || "You";
                        return (
                          <div
                            key={jid}
                            className={`rounded-[16px] p-4 bg-white border transition-all cursor-pointer ${isSelected ? "border-[#252525] shadow-md " : "border-gray-200 hover:shadow"}`}
                            onClick={() => setSelectedJobId(jid)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <img
                                  src={job.client?.profilePicture?.url || PLACEHOLDER}
                                  alt="Client Avatar"
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                                />
                                <span className="text-md font-semibold text-[#252525]">{clientName}</span>
                              </div>
                              <span className="text-xs text-gray-500">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ""}</span>
                            </div>
                            <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5">
                                <Briefcase size={20} className="text-[#55B2F3]" />
                              </span>
                              <span className="line-clamp-1 md:text-base">{job.description || job.title || "Job post"}</span>
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {(job.category?.name || job.category?.categoryName || (typeof job.category === "string" && job.category)) && (
                                <span className="bg-[#55B2F3]/90 text-white font-medium backdrop-blur-sm px-2.5 py-1 rounded-md text-sm">
                                  {job.category?.name || job.category?.categoryName || (typeof job.category === "string" ? job.category : "")}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <MapPin size={16} />
                                <span className="truncate overflow-hidden max-w-45 md:max-w-full text-sm text-gray-500">{job.location || ""}</span>
                              </span>
                              <span className="font-bold text-green-500">{(typeof job.price === "number" || typeof job.price === "string") ? `₱${Number(job.price).toLocaleString()}` : ""}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job description</label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe the job..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#55b3f3]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <AddressInput
                      value={jobLocation}
                      onChange={(address) => setJobLocation(address)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      {catsLoading ? (
                        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                      ) : (
                        <select
                          value={jobCategory}
                          onChange={(e) => setJobCategory(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#55b3f3]"
                        >
                          <option value="">Select a category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.categoryName}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price offer (₱)</label>
                      <input
                        type="number"
                        min="1"
                        value={jobPrice}
                        onChange={(e) => setJobPrice(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#55b3f3]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Invite fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invitation message</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell the worker about your project..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#55b3f3]"
                />
              </div>
              {/* Proposed rate removed: we use Price offer as the proposed rate */}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  disabled={sendingInvite}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="flex-1 bg-[#55b3f3] text-white py-2 px-4 rounded-lg hover:bg-sky-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sendingInvite ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      {/* <CheckCircle className="w-4 h-4" /> */}
                      Invite Worker
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback overlay */}
      {inviteFeedback.show && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200 max-w-sm w-full text-center">
            <div className="flex flex-col items-center gap-3">
              {/* <CheckCircle className="w-10 h-10 text-[#55b3f3]" /> */}
              <p className="text-gray-700 text-base font-medium">{inviteFeedback.message}</p>
              <button
                onClick={() => setInviteFeedback({ show: false, message: "" })}
                className="mt-3 px-5 py-2 bg-[#55b3f3] text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerPortfolio;
