import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Briefcase } from "lucide-react";

const PLACEHOLDER =
  "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
import { getWorkerById } from "../api/worker";
import { getWorkerReviewsById } from "../api/feedback";
import { getJobById } from "../api/jobs";
import { checkAuth } from "../api/auth";

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
  const [jobMap, setJobMap] = useState({}); // cache for enriched job details

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
    if (fetchIds.length) {
      console.log("[WorkerPortfolio] Enriching job details for reviews", {
        fetchIds,
      });
    }
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
            console.log("[WorkerPortfolio] Job fetched for review", {
              jobId: jid,
              job: jobData,
            });
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
        const userData = await checkAuth();
        setCurrentUser(userData.data.data);
      } catch {
        setCurrentUser(null);
      }
    };

    fetchUser();
  }, []);
  const { province, city, barangay } = worker?.address || {};

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
              <button className="p-2 bg-[#55b3f3] text-white shadow-md rounded-[14px] hover:bg-blue-400 hover:shadow-lg cursor-pointer">
                Message
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
          {(worker.skills || []).slice(0, 3).map((skill, index) => (
            <span
              key={skill.skillCategoryId || index}
              className="text-[#f4f6f6] text-[12.5px] font-light px-3 py-1 rounded-full text-xs bg-[#55b3f3] shadow-md"
            >
              {skill.categoryName || "Unnamed Skill"}
            </span>
          ))}

          {worker.skillsByCategory && worker.skillsByCategory.length > 3 && (
            <span className="text-[#252525] text-[12.5px] font-medium px-3 py-1 rounded-full text-xs bg-gray-200 shadow-sm">
              +{worker.skillsByCategory.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Portfolio Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-left">Portfolio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {worker.portfolio.map((item) => (
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
              `${job?.client?.firstName || ""} ${
                job?.client?.lastName || ""
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
                      className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block cursor-pointer"
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

                            <span className="text-sm font-medium text-[#252525] opacity-75">
                              {clientName}
                            </span>
                          </div>

                          <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
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
                            <Briefcase size={20} className="text-blue-400" />
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
                            <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-sm">
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
    </div>
  );
};

export default WorkerPortfolio;
