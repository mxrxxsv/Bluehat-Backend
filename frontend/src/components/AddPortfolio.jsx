// src/components/AddPortfolio.jsx
import React, { useState } from "react";
import { X } from "lucide-react";
import { createPortfolio } from "../api/profile";
import DropzoneFileInput from "./DropzoneFileInput";

const AddPortfolio = ({ onClose, onAdd, onRefresh }) => {
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(null); // modal error message

  const handleSubmit = async () => {
    if (!selectedFile || !projectTitle) {
      setErrorModal("Please provide a title and select a file.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("projectTitle", projectTitle);
      formData.append("description", projectDescription);

      const res = await createPortfolio(formData);

      // Update UI instantly
      if (onAdd) {
        onAdd(res.data.data);
      }

      // Refresh from backend (if parent provides function)
      if (typeof onRefresh === "function") {
        await onRefresh();
      }

      // Reset form
      setProjectTitle("");
      setProjectDescription("");
      setSelectedFile(null);
      setPreview(null);

      onClose();
    } catch (err) {
      console.error("Failed to add portfolio:", err);
      setErrorModal("Error adding portfolio. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Main Add Portfolio Modal */}
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
        <div className="bg-white rounded-2xl p-6 w-96 relative shadow-lg">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-semibold mb-4">Add Portfolio</h2>

          {/* Project Title */}
          <input
            type="text"
            placeholder="Project Title"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="w-full border p-2 rounded-lg mb-3 border-gray-300"
          />

          {/* Project Description */}
          <textarea
            placeholder="Project Description"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            className="w-full border p-2 rounded-lg mb-3 border-gray-300"
            rows={3}
          />

          {/* File Upload */}
          <DropzoneFileInput
            onFileSelect={(file) => {
              setSelectedFile(file);
              setPreview(URL.createObjectURL(file));
            }}
            accept="image/*"
            label="portfolio-upload"
          />

          {/* Preview */}
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-32 object-cover rounded-md mt-3"
            />
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#55b3f3] text-white py-2 rounded-lg hover:bg-blue-400 mt-4 cursor-pointer"
          >
            {loading ? "Adding..." : "Add Portfolio"}
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
              className="mt-4 bg-[#55b3f3] text-white px-4 py-2 rounded-lg hover:bg-blue-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AddPortfolio;
