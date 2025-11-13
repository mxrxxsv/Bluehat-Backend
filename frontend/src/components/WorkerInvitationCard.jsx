import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Star,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { inviteWorker } from "../api/workerInvitation.jsx";
const WorkerInvitationCard = ({ worker, jobId, onInviteSent, jobPrice }) => {
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ show: false, message: "" });

  // Derive busy/availability state from worker shape we receive
  const isBusy =
    String(worker?.status || "").toLowerCase() === "working" ||
    String(worker?.status || "").toLowerCase() === "not available" ||
    String(worker?.availability || "").toLowerCase() === "busy";

  // Auto-close feedback modal after 2.5 seconds
  useEffect(() => {
    if (feedback.show) {
      const timer = setTimeout(() => {
        setFeedback({ show: false, message: "" });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [feedback.show]);

  const handleSendInvite = async (e) => {
    e.preventDefault();

    if (isBusy) {
      setFeedback({
        show: true,
        message:
          "This worker is currently busy. Please choose another worker or try again later.",
      });
      return;
    }

    const hasAutoRate = jobPrice !== undefined && jobPrice !== null && jobPrice !== "";
    if (!inviteMessage.trim() || (!hasAutoRate && !proposedRate)) {
      setFeedback({
        show: true,
        message: hasAutoRate
          ? "Please add a message before sending."
          : "Please fill in all fields before sending.",
      });
      return;
    }

    if (inviteMessage.trim().length < 20) {
      setFeedback({
        show: true,
        message: "Message must be at least 20 characters long.",
      });
      return;
    }

    setSending(true);
    try {
      const rateToSend = hasAutoRate ? Number(jobPrice) : Number(proposedRate);
      await inviteWorker(worker._id, {
        jobId,
        description: inviteMessage,
        proposedRate: rateToSend,
      });

      setShowInviteModal(false);
      setInviteMessage("");
      setProposedRate("");
      onInviteSent?.();

      setFeedback({
        show: true,
        message: "Invitation sent successfully! The worker will be notified.",
      });
    } catch (error) {
      console.error("Failed to send invitation:", error);
      const serverMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again.";
      setFeedback({
        show: true,
        message: serverMsg,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        {/* Worker Header */}
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => (worker?._id || worker?.id) && navigate(`/worker/${worker._id || worker.id}`)}
            className="shrink-0 focus:outline-none"
            aria-label={`View ${worker.firstName || "Worker"} ${worker.lastName || ""} profile`}
            title="View profile"
          >
            <img
              src={
                worker.profilePicture?.url ||
                "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
              }
              alt={`${worker.firstName || "Worker"} ${worker.lastName || ""}`}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
            />
          </button>
          <div className="flex-1 text-left">
            <button
              type="button"
              onClick={() => (worker?._id || worker?.id) && navigate(`/worker/${worker._id || worker.id}`)}
              className="text-left"
              title="View profile"
            >
              <h3 className="text-lg font-semibold text-[#545454] flex items-center gap-2 hover:underline cursor-pointer">
                <User className="w-5 h-5 text-blue-500" />
                {worker.firstName} {worker.lastName}
              </h3>
            </button>

            {worker.rating !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600">
                  {Number(worker.rating || 0).toFixed(1)} ({Number(worker.totalRatings || worker.reviewCount || 0)} reviews)
                </span>
              </div>
            )}

            {worker.location && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{worker.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        {worker.skills?.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {worker.skills.slice(0, 4).map((skill, index) => {
                const label =
                  typeof skill === "string"
                    ? skill
                    : skill?.name || skill?.categoryName || skill?.title || "";
                const key =
                  (typeof skill === "object" && (skill._id || skill.id || skill.skillCategoryId)) ||
                  `${label}-${index}`;
                return (
                  <span
                    key={key}
                    className="bg-[#55B2F3]/90 text-white font-medium backdrop-blur-sm px-2 py-1 rounded-md text-xs"
                  >
                    {label}
                  </span>
                );
              })}
              {worker.skills.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  +{worker.skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {worker.bio && (
          <p className="text-sm text-gray-600 line-clamp-3 mb-4">
            {worker.bio}
          </p>
        )}

        {/* Experience & Availability */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
          {worker.experienceLevel && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {worker.experienceLevel}
            </span>
          )}
          {(worker.availability || worker.status) && (
            <span
              className={
                "font-medium px-2 py-1 rounded-full text-xs " +
                (isBusy
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-green-100 text-green-600")
              }
              title={isBusy ? "This worker is currently busy" : undefined}
            >
              {worker.availability || worker.status}
            </span>
          )}
        </div>

        {/* Invite Button */}
        <button
          onClick={() => {
            if (isBusy) {
              setFeedback({
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
            "w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 " +
            (isBusy
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-[#55b3f3] text-white hover:bg-sky-500 cursor-pointer")
          }
          title={isBusy ? "Worker is busy" : "Invite to Job"}
        >
          <Send className="w-4 h-4" />
          {isBusy ? "Worker Busy" : "Invite to Job"}
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Invite {worker.firstName} {worker.lastName}
            </h3>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Message
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Tell the worker about your project..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#55b3f3]"
                  rows={4}
                  required
                />
              </div>
              {!(jobPrice !== undefined && jobPrice !== null && jobPrice !== "") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposed Rate (₱)
                  </label>
                  <input
                    type="number"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(e.target.value)}
                    placeholder="Enter your proposed rate"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#55b3f3]"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: When a job price is set, it will be used automatically.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 bg-[#55b3f3] text-white py-2 px-4 rounded-lg hover:bg-sky-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      {/* <CheckCircle className="w-4 h-4" /> */}
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedback.show && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-[2000] transition-opacity duration-300 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200 max-w-sm w-full text-center transform transition-transform duration-300 scale-100 animate-scaleIn">
            <div className="flex flex-col items-center gap-3">
              {/* <CheckCircle className="w-10 h-10 text-[#55b3f3]" /> */}
              <p className="text-gray-700 text-base font-medium">
                {feedback.message}
              </p>
              <button
                onClick={() => setFeedback({ show: false, message: "" })}
                className="mt-3 px-5 py-2 bg-[#55b3f3] text-white rounded-lg hover:bg-sky-600 transition-colors cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
};

export default WorkerInvitationCard;
