// src/components/AddEducation.jsx
import React, { useState } from "react";
import { X } from "lucide-react";
import { addEducation } from "../api/education";

const AddEducation = ({ onClose, onAdd, onRefresh }) => {
  const [education, setEducation] = useState({
    schoolName: "",
    educationLevel: "",
    degree: "",
    startDate: "",
    endDate: "",
    educationStatus: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const educationLevels = [
    "Elementary",
    "Junior High",
    "Senior High",
    "Vocational",
    "College",
    "Master's",
    "Doctorate",
  ];

  const educationStatuses = [
    "Graduated",
    "Undergraduate",
    "Currently Studying",
  ];

  const handleSubmit = async () => {
    if (
      !education.schoolName ||
      !education.educationLevel ||
      !education.startDate ||
      !education.educationStatus
    ) {
      setErrorModal(
        "School name, education level, start date, and status are required."
      );
      return;
    }

    try {
      setLoading(true);

      // Prepare data with proper formatting - ensure strings are sent
      const educationData = {
        schoolName: String(education.schoolName || ""),
        educationLevel: String(education.educationLevel || ""),
        degree: String(education.degree || ""),
        startDate: education.startDate ? String(education.startDate) : "",
        endDate: education.endDate ? String(education.endDate) : "",
        educationStatus: String(education.educationStatus || ""),
      };

  // Debug log removed

      const res = await addEducation(educationData);

      if (onAdd) onAdd(res.data);
      if (onRefresh) await onRefresh();

      // reset & close
      setEducation({
        schoolName: "",
        educationLevel: "",
        degree: "",
        startDate: "",
        endDate: "",
        educationStatus: "",
      });
      onClose();
    } catch (err) {
      console.error("Failed to add education:", err);

      // Better error message handling
      let errorMessage = "Error adding education. Please try again.";

      if (err.errors && Array.isArray(err.errors)) {
        errorMessage = err.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join("\n");
      } else if (err.message) {
        errorMessage = err.message;
      }

      setErrorModal(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal */}
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
        <div className="bg-white rounded-2xl p-6 w-[28rem] relative shadow-lg max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Add Education
          </h2>

          {/* School Name */}
          <input
            type="text"
            placeholder="School Name"
            value={education.schoolName}
            onChange={(e) =>
              setEducation({ ...education, schoolName: e.target.value })
            }
            className="w-full border rounded-lg p-2 border-gray-300 mb-2"
          />

          {/* Education Level */}
          <select
            value={education.educationLevel}
            onChange={(e) =>
              setEducation({ ...education, educationLevel: e.target.value })
            }
            className="w-full text-gray-700 border rounded-lg p-2 border-gray-300 mb-2"
          >
            <option value="">Select Education Level</option>
            {educationLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          {/* Degree */}
          <input
            type="text"
            placeholder="Degree (optional)"
            value={education.degree}
            onChange={(e) =>
              setEducation({ ...education, degree: e.target.value })
            }
            className="w-full border rounded-lg p-2 border-gray-300 mb-2"
          />

          {/* Start Date */}
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={education.startDate}
              onChange={(e) =>
                setEducation({ ...education, startDate: e.target.value })
              }
              className="w-full border rounded-lg p-2 border-gray-300"
            />
          </div>

          {/* End Date */}
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">
              End Date (optional)
            </label>
            <input
              type="date"
              value={education.endDate}
              onChange={(e) =>
                setEducation({ ...education, endDate: e.target.value })
              }
              className="w-full border rounded-lg p-2 border-gray-300"
            />
          </div>

          {/* Education Status */}
          <select
            value={education.educationStatus}
            onChange={(e) =>
              setEducation({ ...education, educationStatus: e.target.value })
            }
            className="w-full text-gray-700 border rounded-lg p-2 border-gray-300 mb-2"
          >
            <option value="">Select Status</option>
            {educationStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#00a6f4] text-white py-2 rounded-lg hover:bg-blue-400 mt-4 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Education"}
          </button>
        </div>
      </div>

      {/* Error Modal */}
      {errorModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-lg relative text-center">
            <h3 className="text-lg font-semibold text-red-500 mb-3">Error</h3>
            <p className="text-gray-600 whitespace-pre-line">{errorModal}</p>
            <button
              onClick={() => setErrorModal(null)}
              className="mt-4 bg-[#00a6f4] text-white px-4 py-2 rounded-lg hover:bg-blue-400 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AddEducation;
