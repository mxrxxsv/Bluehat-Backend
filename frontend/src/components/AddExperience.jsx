// src/components/AddExperience.jsx
import React, { useState } from "react";
import { X } from "lucide-react";
import { addExperience } from "../api/profile";

const AddExperience = ({ onClose, onAdd, onRefresh }) => {
  const [experience, setExperience] = useState({
    companyName: "",
    position: "",
    startYear: "",
    endYear: "",
    responsibilities: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const handleSubmit = async () => {
    if (!experience.companyName || !experience.position || !experience.startYear) {
      setErrorModal("Company name, position, and start year are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await addExperience(experience);

      if (onAdd) onAdd(res.data.data);
      if (onRefresh) await onRefresh();

      // reset & close
      setExperience({
        companyName: "",
        position: "",
        startYear: "",
        endYear: "",
        responsibilities: "",
      });
      onClose();
    } catch (err) {
      console.error("Failed to add experience:", err);
      setErrorModal("Error adding experience. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal */}
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
        <div className="bg-white rounded-2xl p-6 w-[28rem] relative shadow-lg">
          {/* Close button */}
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Add Experience
          </h2>

          {/* Company */}
          <input
            type="text"
            placeholder="Company Name"
            value={experience.companyName}
            onChange={(e) =>
              setExperience({ ...experience, companyName: e.target.value })
            }
            className="w-full border rounded-lg p-2 border-gray-300 mb-2"
          />

          {/* Position */}
          <input
            type="text"
            placeholder="Position"
            value={experience.position}
            onChange={(e) =>
              setExperience({ ...experience, position: e.target.value })
            }
            className="w-full border rounded-lg p-2 border-gray-300 mb-2"
          />

          {/* Years */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select
              value={experience.startYear}
              onChange={(e) =>
                setExperience({ ...experience, startYear: e.target.value })
              }
              className="w-full text-gray-700 border rounded-lg p-2 border-gray-300"
            >
              <option value="">Select Start Year</option>
              {Array.from({ length: 51 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>

            <select
              value={experience.endYear}
              onChange={(e) =>
                setExperience({ ...experience, endYear: e.target.value })
              }
              className="w-full text-gray-700 border rounded-lg p-2 border-gray-300"
            >
              <option value="">Select End Year</option>
              {Array.from({ length: 51 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
              <option value="Present">Present</option>
            </select>
          </div>

          {/* Responsibilities */}
          <textarea
            placeholder="Responsibilities"
            value={experience.responsibilities}
            onChange={(e) =>
              setExperience({ ...experience, responsibilities: e.target.value })
            }
            className="w-full border rounded-lg p-2 border-gray-300 mb-2"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#00a6f4] text-white py-2 rounded-lg hover:bg-blue-400 mt-4 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Experience"}
          </button>
        </div>
      </div>

      {/* Error Modal */}
      {errorModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-lg relative text-center">
            <h3 className="text-lg font-semibold text-red-500 mb-3">Error</h3>
            <p className="text-gray-600">{errorModal}</p>
            <button
              onClick={() => setErrorModal(null)}
              className="mt-4 bg-[#00a6f4] text-white px-4 py-2 rounded-lg hover:bg-blue-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AddExperience;
