import { useState, useEffect } from "react";
import { X, Upload, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import {
  uploadIDPicture,
  uploadSelfie,
  getVerificationStatus,
} from "../api/idVerification";
import { checkAuth } from "../api/auth";

const IDSetup = ({ onClose }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [idLoading, setIdLoading] = useState(false);
  const [selfieLoading, setSelfieLoading] = useState(false);


  const [idUploaded, setIdUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);

  useEffect(() => {
    checkAuth()
      .then((res) => {
        setCurrentUser(res.data.data);
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!currentUser?._id) return;
      try {
        const res = await getVerificationStatus(currentUser.id);
        setStatus(res.data || res);
      } catch (err) {
        console.error("Failed to fetch verification status:", err);
      }
    };
    fetchStatus();
  }, [currentUser]);

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (type === "id") {
        setIdFile(file);
        setIdPreview(reader.result);
      } else {
        setSelfieFile(file);
        setSelfiePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (type) => {
    const userId = currentUser?.id;
    if (!userId) {
      // alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      if (type === "id" && idFile) {
        setIdLoading(true);
        const res = await uploadIDPicture(userId, idFile);
        if (res?.success) setIdUploaded(true);
      } else if (type === "selfie" && selfieFile) {
        setSelfieLoading(true);
        const res = await uploadSelfie(userId, selfieFile);
        if (res?.success) setSelfieUploaded(true);
      }

      const statusRes = await getVerificationStatus(userId);
      setStatus(statusRes.data || statusRes);
    } catch (err) {
      console.error("Upload failed:", err.response?.data || err.message);
      // alert(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setIdLoading(false);
      setSelfieLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg relative max-h-[90vh] overflow-y-auto p-6">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Verify Your Identity
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          To secure your account and unlock all features, please upload a valid ID and a selfie.
        </p>

        {/* Status */}
        {status?.verificationStatus && (
          <div className="mb-6 text-center">
            {status.verificationStatus === "verified" ? (
              <p className="text-green-600 flex items-center justify-center gap-2">
                <CheckCircle size={20} /> Verified
              </p>
            ) : (
              <p className="text-yellow-600 flex items-center justify-center gap-2">
                <AlertCircle size={20} /> {status.verificationStatus}
              </p>
            )}
          </div>
        )}

        {/* ID Upload */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Step 1: Government-issued ID
          </label>
          <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
            {idPreview ? (
              <img src={idPreview} alt="ID Preview" className="h-40 object-contain rounded-lg" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-500 mb-2" />
                <p className="text-sm text-gray-500">Click to upload ID</p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, "id")}
              className="hidden"
            />
          </label>
          <button
            onClick={() => handleUpload("id")}
            disabled={!idFile || idLoading || idUploaded}
            className="mt-3 w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {idLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={16} />}
            {idUploaded ? "ID Uploaded" : "Upload ID"}
          </button>

        </div>

        {/* Selfie Upload */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Step 2: Upload Selfie
          </label>
          <label className="border-2 border-dashed border-gray-300 rounded-full w-40 h-40 mx-auto flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer overflow-hidden">
            {selfiePreview ? (
              <img src={selfiePreview} alt="Selfie Preview" className="object-cover w-full h-full" />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="w-6 h-6 text-gray-500 mb-2" />
                <p className="text-xs text-gray-500">Upload or take a selfie</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => handleFileSelect(e, "selfie")}
              className="hidden"
            />
          </label>
          <button
            onClick={() => handleUpload("selfie")}
            disabled={!selfieFile || selfieLoading || selfieUploaded}
            className="mt-3 w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {selfieLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={16} />}
            {selfieUploaded ? "Selfie Uploaded" : "Upload Selfie"}
          </button>
        </div>

        {/* Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 flex gap-2">
          <Info className="text-blue-500 w-5 h-5 mt-0.5" />
          <ul className="list-disc pl-4 space-y-1 mt-4 text-left">
            <li>Use a valid government-issued ID (e.g., Passport, Driver’s License, UMID).</li>
            <li>Ensure the details are clear and not blurry.</li>
            <li>Selfie must clearly show your face with good lighting.</li>
            <li>Verification usually takes 24–48 hours.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default IDSetup;
