import React, { useState } from "react";
import { updateWorkerBiography } from "../api/profile"; 

const BiographyModal = ({ biography, onClose, onSave }) => {
  const [newBio, setNewBio] = useState(biography || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!newBio.trim()) {
      setError("Biography cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await updateWorkerBiography({ biography: newBio });
      onSave(newBio); 
    } catch (err) {
      console.error("Failed to update biography:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f4f6f6] bg-opacity-50 z-[2000]">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Update Biography
        </h2>

        <textarea
          value={newBio}
          onChange={(e) => setNewBio(e.target.value)}
          rows={5}
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Write something about yourself..."
        />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BiographyModal;
