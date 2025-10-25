import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAllJobs } from "../api/jobs";
import { getClientReviewsById } from "../api/feedback";
import { MapPin, Star, Briefcase } from "lucide-react";

const Avatar = ({ url, size = 64, alt = "Client" }) => (
  <img
    src={url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
    alt={alt}
    className="rounded-full object-cover"
    style={{ width: size, height: size }}
  />
);

const Stars = ({ value = 0 }) => {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            size={16}
            className={filled ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
          />
        );
      })}
      <span className="ml-1 text-sm text-gray-600">{value ? value.toFixed(1) : "0.0"}</span>
    </div>
  );
};

export default function ClientProfile() {
  const { id } = useParams(); // clientId (Client model _id)
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [page, setPage] = useState(1);

  // Status color mapping similar to profile job post styling
  const getStatusStyle = (status) => {
    const s = String(status || "").toLowerCase();
    const map = {
      open: "bg-green-100 text-green-600",
      active: "bg-blue-100 text-blue-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-gray-200 text-gray-600",
      cancelled: "bg-red-100 text-red-600",
      disputed: "bg-purple-100 text-purple-700",
    };
    return map[s] || "bg-gray-100 text-gray-700";
  };

  const hasMore = useMemo(() => {
    return !!stats && !!stats.pagination && page < stats.pagination.totalPages;
  }, [stats, page]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Fetch client's jobs (first page is enough for identity info & list)
  const jobsRes = await getAllJobs({ page: 1, limit: 10, clientId: id, _t: Date.now() });
        let jobsArr = jobsRes?.data?.data?.jobs || [];
        setJobs(jobsArr);

        // Fetch client reviews with stats (1st page)
        const reviewsRes = await getClientReviewsById(id, { page: 1, limit: 10 });
        const d = reviewsRes?.data || {};
        setReviews(Array.isArray(d.reviews) ? d.reviews : []);
        setStats({
          statistics: d.statistics,
          pagination: d.pagination,
          client: d.client,
        });

        // If there are no open jobs, try fetching any job by this client to get identity
        if ((!jobsArr || jobsArr.length === 0)) {
          try {
            const anyJobsRes = await getAllJobs({ page: 1, limit: 1, clientId: id, _t: Date.now() });
            const anyJobs = anyJobsRes?.data?.data?.jobs || [];
            if (anyJobs.length > 0) {
              jobsArr = anyJobs; // do not override jobs list (we show open jobs), only use for identity if needed
            }
          } catch (e) {
            // non-blocking
          }
        }

  // Build client info strictly from job payload
  const firstJob = jobsArr && jobsArr[0];
  const rawPic = firstJob?.client?.profilePicture;
  const clientPic = rawPic?.url || (typeof rawPic === "string" ? rawPic : null);
  const clientName = firstJob?.client?.name || "Client";
  setClientInfo({ name: clientName, avatar: clientPic });
      } catch (e) {
        console.error("Failed to load client profile:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const loadMoreReviews = async () => {
    try {
      const next = page + 1;
      const res = await getClientReviewsById(id, { page: next, limit: 10 });
      const d = res?.data || {};
      setReviews((prev) => [...prev, ...(Array.isArray(d.reviews) ? d.reviews : [])]);
      setStats((prev) => ({
        ...(prev || {}),
        statistics: d.statistics,
        pagination: d.pagination,
        client: d.client,
      }));
      setPage(next);
    } catch (e) {
      console.error("Load more reviews failed:", e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-0 mt-20">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const avg = stats?.statistics?.averageRating || 0;
  const total = stats?.statistics?.totalReviews || 0;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-0 mt-35">
      {/* Header */}
      <div className="bg-white shadow rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar url={clientInfo?.avatar} size={72} alt={clientInfo?.name} />
          <div>
            <div className="text-xl font-semibold">{jobs?.[0]?.client?.name || "Client"}</div>
            <div className="flex items-center gap-3 mt-1">
              <Stars value={avg} />
              <span className="text-sm text-gray-600">{total} review{total === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs by this client */}
      <div className="bg-white shadow rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Jobs by this client</h2>
          <span className="text-sm text-gray-500">{jobs.length} result{jobs.length === 1 ? "" : "s"}</span>
        </div>
        <div className="space-y-4">
          {jobs.length === 0 && (
            <div className="text-sm text-gray-500">No recent jobs posted.</div>
          )}
          {jobs.map((job) => (
            <div
              key={job.id || job._id}
              className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block cursor-pointer"
              onClick={() => navigate(`/job/${job.id || job._id}`)}
            >
              <div className="rounded-xl p-4 bg-white transition-all">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={clientInfo?.avatar || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
                      alt="Client Avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#252525] opacity-75">
                        {job.client?.name || "Client Name"}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                    {new Date(job.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5">
                    <Briefcase size={20} className="text-blue-400" />
                  </span>
                  <span className="line-clamp-1 md:text-base">{job.description}</span>
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-sm">
                    {job.category?.name || "Uncategorized"}
                  </span>
                  {job.status && (
                    <span className={`${getStatusStyle(job.status)} px-3 py-1 rounded-full text-sm capitalize`}>
                      {job.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-4 text-sm text-gray-600 ">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span className="truncate overflow-hidden max-w-45 md:max-w-full md:text-base text-gray-500">{job.location}</span>
                  </span>
                  <span className="font-bold text-green-400">
                    ₱{(job.price || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white shadow rounded-2xl p-4 mb-4">
        <h2 className="text-lg font-semibold mb-3">Client reviews</h2>
        <div className="space-y-3">
          {reviews.length === 0 && (
            <div className="text-sm text-gray-500">No reviews yet.</div>
          )}
          {reviews.map((rev) => {
            const reviewer = rev.reviewerId || {};
            const reviewerName = `${reviewer.firstName || ""} ${reviewer.lastName || ""}`.trim() || "Reviewer";
            const reviewerPic = reviewer.profilePicture?.url || reviewer.profilePicture || null;
            return (
              <div key={rev._id} className="p-3 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        reviewerPic ||
                        "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                      }
                      alt={reviewerName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">{reviewerName}</span>
                      <span className="text-xs text-gray-500">Rated {rev.rating}/5</span>
                    </div>
                  </div>
                  {rev.reviewDate && (
                    <div className="text-xs text-gray-400">
                      {new Date(rev.reviewDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>
                {rev.feedback && (
                  <div className="text-sm text-gray-700 mt-2">{rev.feedback}</div>
                )}
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={loadMoreReviews}
              className="px-4 py-2 bg-[#55b3f3] text-white rounded-md hover:bg-blue-400 cursor-pointer"
            >
              Load more reviews
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
