import React, { useState } from "react";
import {
  User,
  Star,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle,
} from "lucide-react";
import { inviteWorker } from "../api/applications.jsx";

const WorkerInvitationCard = ({ worker, jobId, onInviteSent }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteMessage.trim() || !proposedRate) {
      alert("Please fill in all fields");
      return;
    }

    if (inviteMessage.trim().length < 20) {
      alert("Description must be at least 20 characters long");
      return;
    }

    setSending(true);
    try {
      await inviteWorker({
        workerId: worker._id,
        jobId,
        description: inviteMessage,
        proposedRate: Number(proposedRate),
      });

      setShowInviteModal(false);
      setInviteMessage("");
      setProposedRate("");
      onInviteSent?.();
      alert("Invitation sent successfully! The worker will be notified.");
    } catch (error) {
      console.error("Failed to send invitation:", error);
      alert(error.message || "Failed to send invitation. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        {/* Worker Header */}
        <div className="flex items-center gap-4 mb-4">
          <img
            src={
              worker.profilePicture?.url ||
              "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
            }
            alt={worker.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              {worker.firstName} {worker.lastName}
            </h3>
            {worker.rating && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600">
                  {worker.rating.toFixed(1)} ({worker.reviewCount || 0} reviews)
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
        {worker.skills && worker.skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Skills:</h4>
            <div className="flex flex-wrap gap-1">
              {worker.skills.slice(0, 4).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {skill}
                </span>
              ))}
              {worker.skills.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{worker.skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {worker.bio && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 line-clamp-3">{worker.bio}</p>
          </div>
        )}

        {/* Experience & Availability */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
          {worker.experienceLevel && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {worker.experienceLevel}
            </span>
          )}
          {worker.availability && (
            <span className="text-green-600 font-medium">
              {worker.availability}
            </span>
          )}
        </div>

        {/* Invite Button */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Invite to Job
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
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
                  placeholder="Tell the worker about your project and why you'd like to work with them..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed Rate (₱)
                </label>
                <input
                  type="number"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  placeholder="Enter your proposed rate"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkerInvitationCard;
