// src/components/AddCertificate.jsx
import React, { useState } from "react";
import { X } from "lucide-react";
import { uploadCertificate } from "../api/profile"; 
import DropzoneFileInput from "./DropzoneFileInput";

const AddCertificate = ({ onClose, onAdd, userId }) => {
  const [certificateFile, setCertificateFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const handleSubmit = async () => {
    if (!certificateFile) {
      setErrorModal("Please select a certificate file.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("image", certificateFile); // ✅ consistent with PortfolioSetup
      if (userId) {
        formData.append("userId", userId);
      }

      const res = await uploadCertificate(formData);

      // Pass the uploaded certificate back to parent
      onAdd(res.data.data);

      // Reset
      setCertificateFile(null);
      setPreview(null);
      onClose();
    } catch (err) {
      console.error("Failed to upload certificate:", err);
      setErrorModal("Error uploading certificate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Main Certificate Modal */}
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
        <div className="bg-white rounded-2xl p-6 w-96 relative shadow-lg">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-semibold mb-4">Upload Certificate</h2>

          {/* File Upload */}
          <DropzoneFileInput
            onFileSelect={(file) => {
              setCertificateFile(file);
              if (file.type.startsWith("image/")) {
                setPreview(URL.createObjectURL(file));
              } else {
                setPreview(null); // no preview for PDFs
              }
            }}
            accept="image/*,application/pdf"
            label="certificate-upload"
          />

          {/* Preview */}
          {preview && (
            <img
              src={preview}
              alt="Certificate Preview"
              className="w-full h-32 object-cover rounded-md mt-3"
            />
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#00a6f4] text-white py-2 rounded-lg hover:bg-blue-400 mt-4 cursor-pointer"
          >
            {loading ? "Adding..." : "Add Certificate"}
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

export default AddCertificate;
