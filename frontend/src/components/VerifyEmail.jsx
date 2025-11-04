import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const mode = import.meta.env.VITE_APP_MODE;

const baseURL =
    mode === "production"
      ? import.meta.env.VITE_API_PROD_URL
      : import.meta.env.VITE_API_DEV_URL;

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Invalid verification link - no token provided");
      setLoading(false);
      return;
    }

    verifyEmailToken(token);
  }, [searchParams]);

  const verifyEmailToken = async (token) => {
    try {
      const response = await fetch(
        `${baseURL}/ver/verify-email?token=${token}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (result.success) {
        // ✅ Email verified successfully, redirect to 2FA setup
        navigate(
          `/setup-2fa?email=${encodeURIComponent(
            result.data.email
          )}&verified=true`
        );
      } else {
        setError(result.message || "Email verification failed");
      }
    } catch (error) {
      console.error("Email verification error:", error);
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f6] flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#55b3f3] border-t-transparent mx-auto"></div>
          <h2 className="text-2xl font-bold text-[#252525] mt-6">
            Verifying Your Email
          </h2>
          <p className="text-[#252525]/80 mt-2">
            Please wait while we verify your email address...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f6f6] flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-[#252525] mb-4">
            Verification Failed
          </h2>
          <p className="text-red-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/signup")}
              className="w-full bg-[#55b3f3] text-white py-3 px-4 rounded-lg font-semibold hover:bg-sky-600 transition-colors cursor-pointer"
            >
              Sign Up Again
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-white text-[#252525] border border-gray-300 py-3 px-4 rounded-lg font-semibold hover:bg-[#f4f6f6] transition-colors cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // This shouldn't render if verification is successful
};

export default VerifyEmail;
