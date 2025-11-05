import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import {
  uploadIDPicture,
  uploadSelfie,
  getVerificationStatus,
} from "../api/idVerification";
import { getProfile } from "../api/profile";

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

  // Camera state for selfie capture
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const selfieInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    getProfile()
      .then((res) => {
        setCurrentUser(res.data.data);
      })
      .catch(() => setCurrentUser(null));
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

  const startCamera = async () => {
    try {
      setCameraError("");

      // Secure context is required except on localhost
      if (!window.isSecureContext) {
        setCameraError(
          "Camera requires a secure context. Open the app on https:// or use http://localhost during development."
        );
        setCameraActive(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Your browser doesn't support camera access. Try the latest Chrome/Edge/Safari or upload a photo instead."
        );
        setCameraActive(false);
        return;
      }

      const constraints = {
        video: { facingMode: { ideal: "user" } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Unable to access camera:", err);
      const name = err?.name || "";
      let msg = "Unable to access camera. Please allow camera permission.";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        msg =
          "Camera permission was blocked. Click the lock icon in your browser's address bar and allow Camera access for this site, then retry.";
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        msg = "No camera device found. Connect a camera or upload a selfie instead.";
      } else if (name === "NotReadableError") {
        msg = "Camera is in use by another app. Close other apps using the camera and try again.";
      } else if (name === "OverconstrainedError") {
        msg = "This device can't satisfy the requested camera settings. Try again or upload a selfie.";
      } else if (name === "SecurityError") {
        msg = "Camera access is blocked by your browser or OS security settings. Allow access and retry.";
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        // Store as File so backend receives filename/type
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        setSelfieFile(file);
        // Revoke previous preview if any
        if (selfiePreview) URL.revokeObjectURL(selfiePreview);
        setSelfiePreview(url);
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleSelfieFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    } catch {}
    const url = URL.createObjectURL(file);
    setSelfieFile(file);
    setSelfiePreview(url);
    setCameraError("");
    setCameraActive(false);
  };

  // Cleanup object URLs and stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      if (idPreview) URL.revokeObjectURL(idPreview);
    };
  }, [selfiePreview, idPreview]);

  const handleUpload = async (type) => {
    const userId = currentUser?.id;
    if (!userId) {
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
    } finally {
      setIdLoading(false);
      setSelfieLoading(false);
    }
  };


  return createPortal(
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-[2000]" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg relative max-h-[90vh] overflow-y-auto p-6 mx-4">

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

        {/* Selfie Capture (Camera only, no file upload) */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Step 2: Take or Upload Selfie
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-full w-40 h-40 mx-auto flex items-center justify-center bg-gray-50 overflow-hidden relative">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="object-cover w-full h-full"
              />
            ) : selfiePreview ? (
              <img src={selfiePreview} alt="Selfie Preview" className="object-cover w-full h-full" />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="w-6 h-6 text-gray-500 mb-2" />
                <p className="text-xs text-gray-500">Take a selfie or for testing (upload from device)</p>
              </div>
            )}
          </div>
          {cameraError && (
            <p className="text-red-500 text-xs text-center mt-2">{cameraError}</p>
          )}
          <div className="mt-3 flex items-center justify-center gap-2">
            {!cameraActive && !selfiePreview && (
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-[#55b3f3] text-white text-sm rounded-md hover:bg-sky-600 cursor-pointer"
              >
                Open Camera
              </button>
            )}
            {cameraActive && (
              <>
                <button
                  type="button"
                  onClick={captureSelfie}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 cursor-pointer"
                >
                  Take Selfie
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
            {!cameraActive && selfiePreview && (
              <button
                type="button"
                onClick={() => {
                  if (selfiePreview) URL.revokeObjectURL(selfiePreview);
                  setSelfiePreview(null);
                  setSelfieFile(null);
                  startCamera();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 cursor-pointer"
              >
                Retake
              </button>
            )}
            {!cameraActive && (
              <button
                type="button"
                onClick={() => selfieInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Upload from device
              </button>
            )}
          </div>
          {/* Hidden file input for selfie fallback */}
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleSelfieFilePick}
            className="hidden"
          />
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
    </div>,
    document.body
  );
};

export default IDSetup;
