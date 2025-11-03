import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const mode = import.meta.env.VITE_APP_MODE;

const baseURL =
    mode === "production"
      ? import.meta.env.VITE_API_PROD_URL
      : import.meta.env.VITE_API_DEV_URL;

const Setup2FA = () => {
  const [searchParams] = useSearchParams();
  const [qrCode, setQrCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [notification, setNotification] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const verified = searchParams.get("verified");

    if (!emailParam || verified !== "true") {
      navigate("/login");
      return;
    }

    setEmail(decodeURIComponent(emailParam));
    fetchQRCode(decodeURIComponent(emailParam));
  }, [searchParams, navigate]);

  const fetchQRCode = async (email) => {
    try {
      // ✅ FIXED: Use the correct endpoint
      const response = await fetch(
        `${baseURL}/ver/get-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setQrCode(data.qrCodeURL);
        setTotpSecret(data.manualEntryKey);
        setError(""); // Clear any previous errors
      } else {
        setError(data.message || "Failed to load QR code");
      }
    } catch (error) {
      console.error("Failed to fetch QR code:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyTotp = async (e) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setError("Code must contain only numbers");
      return;
    }

    try {
      setVerifying(true);
      setError("");

      const response = await fetch(
        `${baseURL}/ver/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: otpCode }),
        }
      );

      const result = await response.json();

      if (result.success) {
        showNotification("✅ Account verified successfully!", "success");
        setTimeout(() => {
          navigate("/login", {
            state: {
              message: "Account verified successfully! You can now log in.",
              type: "success",
            },
          });
        }, 1500);
      } else {
        setError(result.message || "Verification failed");
        setAttemptsLeft(result.attemptsLeft || attemptsLeft - 1);
        setOtpCode("");

        if (attemptsLeft <= 1) {
          setError(
            "Too many failed attempts. Please request a new verification email."
          );
        }
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(totpSecret);
      showNotification("✅ Secret key copied to clipboard!", "success");
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = totpSecret;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        showNotification("✅ Secret key copied!", "success");
      } catch (copyErr) {
        showNotification("❌ Failed to copy. Please copy manually.", "error");
      }

      document.body.removeChild(textArea);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  const resendQR = () => {
    setLoading(true);
    setError("");
    setQrCode("");
    setTotpSecret("");
    fetchQRCode(email);
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpCode(value);

    // Clear error when user starts typing
    if (error && value.length > 0) {
      setError("");
    }

    // Auto-submit when 6 digits entered
    if (value.length === 6 && !verifying) {
      setTimeout(() => {
        const form = document.getElementById("verify-form");
        if (form) {
          form.dispatchEvent(
            new Event("submit", { cancelable: true, bubbles: true })
          );
        }
      }, 300);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading 2FA setup...</p>
          <p className="mt-2 text-sm text-gray-400">
            Please wait while we prepare your security setup
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f6] flex items-center justify-center p-4">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

  <div className="max-w-md w-full mt-30 bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        {/* <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Setup Two-Factor Authentication
          </h1>
          <p className="opacity-90 text-sm">
            Secure your FixIt account with an authenticator app
          </p>
        </div> */}

        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-red-700 font-medium">{error}</p>
                  {attemptsLeft > 0 && attemptsLeft < 5 && (
                    <p className="text-red-600 text-sm mt-1">
                      Attempts remaining: {attemptsLeft}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Quick Setup */}
          <div className="bg-white border border-[#89A8B2]/30 p-5 rounded-xl shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#89A8B2] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                1
              </div>
              <h3 className="font-semibold text-lg text-[#252525]">For Mobile Users</h3>
            </div>
            <p className="text-sm text-[#252525]/80 mb-4 leading-relaxed">
              Tap the button below to automatically open your authenticator app:
            </p>
            <a
              href={`otpauth://totp/FixIt%20(${encodeURIComponent(
                email
              )})?secret=${totpSecret}&issuer=FixIt`}
              className="block w-full text-[#252525] text-center py-3 rounded-lg font-semibold border-2 border-[#89A8B2] hover:bg-[#f4f6f6] transition-all duration-200"
            >
              Open in Authenticator App
            </a>
            <p className="text-xs text-[#252525]/70 text-center mt-3 leading-relaxed">
              Compatible with Google Authenticator, Microsoft Authenticator,
              Authy, 1Password, and more!
            </p>
          </div>

          {/* QR Code */}
          <div className="border-2 border-gray-100 p-5 rounded-xl hover:border-[#89A8B2]/40 transition-colors">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#89A8B2] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                2
              </div>
              <h3 className="font-semibold text-lg text-[#252525]">
                For Desktop Users
              </h3>
            </div>
            <p className="text-sm text-[#252525]/80 mb-4 leading-relaxed">
              Scan this QR code with your phone's authenticator app:
            </p>
            {qrCode ? (
              <div className="text-center bg-gray-50 p-4 rounded-lg">
                <img
                  src={qrCode}
                  alt="QR Code for 2FA Setup"
                  className="mx-auto border-2 border-gray-200 rounded-xl shadow-sm max-w-[220px] bg-white p-3"
                />
              </div>
            ) : (
              <div className="text-center bg-gray-50 p-8 rounded-lg">
                <div className="animate-pulse bg-gray-200 w-48 h-48 mx-auto rounded-lg"></div>
                <p className="text-gray-500 mt-2">Loading QR code...</p>
              </div>
            )}
          </div>

          {/* Manual Setup */}
          <div className="bg-[#f4f6f6] border-2 border-[#cfe8f7] p-5 rounded-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#89A8B2] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                3
              </div>
              <h3 className="font-semibold text-lg text-[#252525]">
                Manual Setup
              </h3>
            </div>
            <p className="text-sm mb-3 text-[#252525]/80 leading-relaxed">
              If the above methods don't work, manually enter this secret key:
            </p>
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-[#cfe8f7]">
              <p className="text-xs text-[#252525]/70 mb-1">
                Account: FixIt ({email})
              </p>
              <div className="font-mono text-sm break-all bg-gray-50 p-3 rounded border text-center tracking-wider">
                {totpSecret || "Loading..."}
              </div>
            </div>
            <button
              onClick={copySecret}
              disabled={!totpSecret}
              className="mt-3 text-[#252525] text-sm hover:text-black hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Copy Secret Key
            </button>
          </div>

          {/* Verification Form */}
          <div className="bg-gradient-to-r from-white to-[#eaf5fb] p-5 rounded-xl text-[#252525] shadow-md border border-[#89A8B2]/30">
            <h3 className="font-semibold mb-4 text-center text-lg text-[#252525]">
              Complete Account Setup
            </h3>
            <p className="text-sm text-[#252525]/80 text-center mb-4 leading-relaxed">
              Enter the 6-digit code from your authenticator app:
            </p>
            <form id="verify-form" onSubmit={verifyTotp} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder=""
                  value={otpCode}
                  onChange={handleInputChange}
                  className="w-full p-4 rounded-lg text-center text-[#252525] text-xl font-mono tracking-[0.5em] border-2 border-[#cfe8f7] focus:outline-none focus:ring-2 focus:ring-[#89A8B2] focus:border-[#89A8B2] bg-white transition-all duration-200"
                  maxLength="6"
                  disabled={verifying}
                  autoComplete="off"
                  inputMode="numeric"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="flex space-x-2">
                    {/* {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i < otpCode.length ? "bg-bu-400" : "bg-gray-300"
                        }`}
                      />
                    ))} */}
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={otpCode.length !== 6 || verifying}
                className="w-full bg-[#252525] text-white p-4 rounded-lg font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {verifying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span></span>
                    <span>Complete Setup</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tips */}
          <div className="bg-[#f4f6f6] border-2 border-[#cfe8f7] p-5 rounded-xl">
            <h4 className="font-semibold text-[#252525] mb-3 flex items-center">
              <span className="mr-2">💡</span>
              Quick Setup Tips
            </h4>
            <ul className="text-sm text-[#252525]/80 space-y-2 leading-relaxed">
              <li className="flex items-start text-left">
                <span className="mr-2 mt-0.5">•</span>
                 Download Google Authenticator from your app store
              </li>
              <li className="flex items-start text-left">
                <span className="mr-2 mt-0.5">•</span>
                The 6-digit code changes every 30 seconds for security
              </li>
              <li className="flex items-start text-left">
                <span className="mr-2 mt-0.5">•</span>
                Save your secret key in a safe place as backup
              </li>
              <li className="flex items-start text-left">
                <span className="mr-2 mt-0.5">•</span>
                You'll need this code every time you log in to FixIt
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-4 pt-2">
            <button
              onClick={resendQR}
              disabled={loading}
              className="text-[#89A8B2] text-sm hover:text-[#5d7a83] hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Refresh QR Code
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-[#252525] text-sm hover:text-black hover:underline font-medium transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
             Your security is our priority. This two-factor authentication
            helps protect your account from unauthorized access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Setup2FA;
