import { useState, useEffect } from "react";
import cute from "../assets/logi.png";
import { login } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [step, setStep] = useState("login");
  const [otp, setOtp] = useState("");
  const [loginData, setLoginData] = useState(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(null);
  const [otpRetryAfter, setOtpRetryAfter] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showOtpToast, setShowOtpToast] = useState(false);

  const navigate = useNavigate();

  // First step: email + password
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedForm = {
        email: form.email.trim(),
        password: form.password.trim(),
      };
      const res = await login(trimmedForm);

      if (res.data.requiresTOTP) {
        setLoginData(trimmedForm);
        setStep("otp");
        setResendTimer(60);
        setOtpAttemptsLeft(null);
        setOtpRetryAfter(0);
      } else if (res.data.success) {
        setShowModal(true);
        setTimeout(() => {
          setShowModal(false);
          navigate("/find-work");
        }, 2000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Invalid username or password");
      setShowErrorModal(true);
      setTimeout(() => setShowErrorModal(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  // Second step: OTP verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!loginData) return;

    setLoading(true);
    try {
      const res = await login({
        ...loginData,
        totpCode: otp.trim(),
      });

      if (res.data.success) {
        setShowModal(true);
        setTimeout(() => {
          setShowModal(false);
          navigate("/find-work");
        }, 2000);
      }
    } catch (err) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message;
      // Track attempts left and rate limit for better UX alignment with backend
      if (code === "INVALID_TOTP") {
        setOtpAttemptsLeft(
          typeof err?.response?.data?.attemptsLeft === "number"
            ? err.response.data.attemptsLeft
            : null
        );
      }
      if (code === "TOTP_RATE_LIMITED") {
        const wait = Number(err?.response?.data?.retryAfter || 0);
        setOtpRetryAfter(wait);
      }
      setErrorMessage(msg || (code === "INVALID_TOTP" ? "Invalid authenticator code" : "Invalid OTP"));
      setShowErrorModal(true);
      setTimeout(() => setShowErrorModal(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleResend = () => {
    setResendTimer(60);
    setShowOtpToast(true);
    setTimeout(() => setShowOtpToast(false), 2000);
  };

  const handleBackToLogin = () => {
    setStep("login");
    setForm({ email: "", password: "" });
    setOtp("");
    setResendTimer(60);
    setLoginData(null);
  };

  useEffect(() => {
    let timer;
    if (step === "otp" && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Countdown for TOTP rate limiting
  useEffect(() => {
    if (otpRetryAfter <= 0) return;
    const t = setInterval(() => {
      setOtpRetryAfter((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [otpRetryAfter]);

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-gray-50 relative">
      {/* Info Toast */}
      {showOtpToast && (
        <div className="fixed bottom-6 right-6 bg-[#55b3f3] text-white px-4 py-2 rounded-lg shadow-lg z-[2000]">
          OTP resent to your email.
        </div>
      )}
      {/* ✅ Success Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-white bg-opacity-40 flex justify-center items-center z-[2000]">
          <div className="bg-white rounded-lg shadow-lg p-8 w-80 text-center relative">
            <div className="checkmark-container mx-auto">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14 27l7 7 16-16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-sky-300 mt-4">Login Successful</h3>
            <p className="text-gray-600 mt-2">Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {/* ❌ Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-white bg-opacity-40 flex justify-center items-center z-[2000]">
          <div className="bg-white rounded-lg shadow-lg p-8 w-80 text-center relative">
            <div className="errormark-container mx-auto">
              <svg className="errormark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="errormark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="errormark-cross" fill="none" d="M16 16 36 36 M36 16 16 36" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-500 mt-4">Login Failed</h3>
            <p className="text-gray-600 mt-2">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ✅ Main Layout */}
      <div className="grid md:grid-cols-2 w-full max-w-7.5xl bg-white rounded-lg shadow-md overflow-hidden m-2 md:m-2 md:mt-15">
        {/* Left Side Image */}
        <div className="hidden md:flex justify-center items-center p-8">
          <img src={cute} className="w-96 h-96 object-contain" alt="Cute" />
        </div>

        {/* Right Side Form */}
        <div className="flex justify-center items-center p-8">
          <div className="w-full max-w-85 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {step === "login" ? "Login to" : "Enter OTP for"}{" "}
              <span className="text-[#55b3f3]">FixIT</span>
            </h2>

            {step === "login" ? (
              <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 text-left">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    id="email"
                    value={form.email}
                    onChange={handleChange}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 shadow-sm"
                    placeholder="name@gmail.com"
                    required
                  />
                </div>
                <div className="relative">
                  <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 text-left">
                    Password
                  </label>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 pr-10 shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
                <div className="flex items-start">
                  <Link to="/forgetpass" className="ms-auto text-sm font-medium text-[#55b3f3] hover:underline cursor-pointer">
                    Lost Password?
                  </Link>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-3 py-2 text-base font-medium text-white rounded-lg focus:ring-4 focus:ring-blue-300 ${
                    loading
                      ? "bg-[#55b3f3]/60 cursor-not-allowed"
                      : "bg-[#55b3f3] hover:bg-blue-300 cursor-pointer"
                  }`}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
                <div className="text-sm font-medium text-gray-900 text-center">
                  Not registered yet?{" "}
                  <Link to="/signup" className="text-[#55b3f3] hover:underline">
                    Create account
                  </Link>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleOtpSubmit}>
                <div>
                  <label htmlFor="otp" className="block mb-2 text-sm font-medium text-gray-900">
                    Enter the 6-digit Authenticator code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength="6"
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 shadow-sm text-center tracking-widest"
                    placeholder="------"
                    required
                  />
                  {(otpAttemptsLeft !== null || otpRetryAfter > 0) && (
                    <div className="mt-2 text-xs text-gray-600 text-center">
                      {otpRetryAfter > 0 ? (
                        <span>Please wait {otpRetryAfter}s before trying again.</span>
                      ) : (
                        otpAttemptsLeft !== null && (
                          <span>Attempts left: {otpAttemptsLeft}</span>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* <div className="flex justify-between items-center text-sm text-gray-700">
                  {resendTimer > 0 ? (
                    <span>Resend available in {resendTimer}s</span>
                  ) : (
                    <button type="button" onClick={handleResend} className="text-[#55b3f3] hover:underline">
                      Resend OTP
                    </button>
                  )}
                </div> */}

                <button
                  type="submit"
                  disabled={otpRetryAfter > 0 || loading}
                  className={`w-full px-3 py-2 text-base font-medium text-white rounded-lg focus:ring-4 focus:ring-blue-300 ${
                    otpRetryAfter > 0 || loading
                      ? "bg-[#55b3f3]/60 cursor-not-allowed"
                      : "bg-[#55b3f3] hover:bg-blue-300 cursor-pointer"
                  }`}
                >
                  {loading
                    ? "Verifying..."
                    : otpRetryAfter > 0
                    ? `Try again in ${otpRetryAfter}s`
                    : "Verify Code"}
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full text-sm text-center text-gray-500 underline cursor-pointer"
                >
                  Back to Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Check Animation Styles */}
      <style>
        {`
          .checkmark-container, .errormark-container {
            width: 72px;
            height: 72px;
          }
          .checkmark, .errormark {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            display: block;
            stroke-width: 2;
            stroke-miterlimit: 10;
            animation: scale .3s ease-in-out .9s both;
          }
          .checkmark {
            stroke: #55b3f3;
            box-shadow: inset 0px 0px 0px #d8e4ddff;
            animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
          }
          .checkmark-circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke: #55b3f3;
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          }
          .checkmark-check {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
          }
          .errormark {
            stroke: #ef4444;
            box-shadow: inset 0px 0px 0px #fce4e4;
            animation: fillError .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
          }
          .errormark-circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke: #fca5a5;
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          }
          .errormark-cross {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
          }
          @keyframes stroke {
            100% { stroke-dashoffset: 0; }
          }
          @keyframes scale {
            0%, 100% { transform: none; }
            50% { transform: scale3d(1.1, 1.1, 1); }
          }
          @keyframes fill {
            100% { box-shadow: inset 0px 0px 0px 30px #d6e6dcf; }
          }
          @keyframes fillError {
            100% { box-shadow: inset 0px 0px 0px 30px #fff; }
          }
        `}
      </style>
    </div>
  );
};

export default Login;
