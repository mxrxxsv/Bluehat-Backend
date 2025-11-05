import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState("");
  const [modal, setModal] = useState({ show: false, message: "", type: "success" });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract token from URL
    const queryParams = new URLSearchParams(location.search);
    const t = queryParams.get("token");
    setToken(t || "");
  }, [location]);

  const handleReset = async (e) => {
    e.preventDefault();

    if (!token) {
      setModal({ show: true, message: "Invalid or missing token.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setModal({ show: true, message: "Passwords do not match!", type: "error" });
      return;
    }

    try {
      const response = await resetPassword({ token, password: newPassword });
      setModal({
        show: true,
        message: response.data.message || "Password successfully reset!",
        type: "success",
      });

      // Optional: auto-redirect after a few seconds
      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      setModal({
        show: true,
        message: error.response?.data?.message || "Failed to reset password.",
        type: "error",
      });
      console.error(error);
    }
  };

  return (
   <div className="flex justify-center mt-40 mx-10 md:mx-0">
      <div className="w-full max-w-md p-6 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-700">
          Reset Password
        </h2>

        <form onSubmit={handleReset} className="space-y-4">
          {/* ✅ NEW PASSWORD FIELD WITH EYE ICON */}
          <div>
            <label
              htmlFor="newPassword"
              className="text-left block mb-2 text-sm font-medium text-gray-900"
            >
              New Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {newPassword && (
              <ul className="text-sm mt-2 space-y-1 text-left">
                <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : "text-red-500"}>
                  • At least one uppercase letter
                </li>
                <li className={/[a-z]/.test(newPassword) ? "text-green-600" : "text-red-500"}>
                  • At least one lowercase letter
                </li>
                <li className={/[0-9]/.test(newPassword) ? "text-green-600" : "text-red-500"}>
                  • At least one number
                </li>
                <li className={/[^A-Za-z0-9]/.test(newPassword) ? "text-green-600" : "text-red-500"}>
                  • At least one special character
                </li>
                <li className={newPassword.length >= 8 ? "text-green-600" : "text-red-500"}>
                  • Minimum 8 characters
                </li>
              </ul>
            )}
          </div>

          {/* CONFIRM PASSWORD FIELD (NO EYE) */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="text-left block mb-2 text-sm font-medium text-gray-900"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
              focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-3 py-2 text-white bg-[#55b3f3] rounded-lg hover:bg-blue-400 cursor-pointer"
          >
            Reset Password
          </button>
        </form>
      </div>

      {/* ✅ Modal Popup */}
      {modal.show && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#f4f6f6] bg-opacity-40 z-[2000]">
          <div className="bg-white rounded-md shadow-md p-6 w-80 text-center">
            <h3
              className={`text-lg font-semibold mb-2 ${
                modal.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {modal.type === "success" ? "Success!" : "Error"}
            </h3>
            <p className="text-gray-700 mb-4">{modal.message}</p>
            <button
              onClick={() => setModal({ ...modal, show: false })}
              className="px-4 py-2 bg-[#55b3f3] text-white rounded-lg hover:bg-blue-400 cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;
