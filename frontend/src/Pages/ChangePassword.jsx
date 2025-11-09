import React, { useState } from "react";
import { changePassword } from "../api/auth";
import { useNavigate } from "react-router-dom";

const passwordTips = [
  "At least 12 characters",
  "Upper & lower case letters",
  "At least one number",
  "At least one special character",
];

const ChangePassword = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [modal, setModal] = useState({ show: false, message: "", type: "success" });
  const navigate = useNavigate();

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const evaluateStrength = (pwd) => {
    const tips = [];
    if (pwd.length < 12) tips.push("Use at least 12 characters");
    if (!/[a-z]/.test(pwd)) tips.push("Add lowercase letters");
    if (!/[A-Z]/.test(pwd)) tips.push("Add uppercase letters");
    if (!/\d/.test(pwd)) tips.push("Add numbers");
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pwd)) tips.push("Add special characters");
    setFeedback(tips);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmNewPassword) {
      setModal({ show: true, message: "Passwords do not match", type: "error" });
      return;
    }
    try {
      setSubmitting(true);
      const res = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmNewPassword,
      });
      setModal({ show: true, message: res.data?.message || "Password changed", type: "success" });
      setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setFeedback([]);
      setTimeout(() => setModal((m) => ({ ...m, show: false })), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update password";
      setModal({ show: true, message: msg, type: "error" });
      setTimeout(() => setModal((m) => ({ ...m, show: false })), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center mt-40 mx-4 md:mx-0">
      <div className="w-full max-w-md p-6 space-y-6 bg-white rounded-lg shadow-md relative">
        <h2 className="text-2xl font-bold text-center text-gray-700">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900" htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={form.currentPassword}
              onChange={onChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900" htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={form.newPassword}
              onChange={(e) => { onChange(e); evaluateStrength(e.target.value); }}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
              placeholder="Enter new password"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900" htmlFor="confirmNewPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmNewPassword"
              name="confirmNewPassword"
              value={form.confirmNewPassword}
              onChange={onChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
              placeholder="Re-enter new password"
              required
            />
          </div>

          {/* Strength Feedback */}
          {form.newPassword && (
            <div className="text-xs bg-gray-50 border rounded-md p-2">
              <p className="font-semibold mb-1 text-gray-700">Strength tips:</p>
              {feedback.length === 0 ? (
                <p className="text-green-600">Strong password ✅</p>
              ) : (
                <ul className="list-disc list-inside text-red-600 space-y-0.5">
                  {feedback.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-3 py-2 text-white bg-[#55b3f3] rounded-lg hover:bg-blue-400 cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Back
        </button>
      </div>

      {/* Modal */}
      {modal.show && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#f4f6f6] bg-opacity-40 z-[2000]">
          <div className="bg-white rounded-lg shadow-md p-6 w-80 text-center">
            <h3 className={`text-lg font-semibold mb-2 ${modal.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {modal.type === "success" ? "Success" : "Error"}
            </h3>
            <p className="text-gray-700 mb-4">{modal.message}</p>
            <button
              onClick={() => setModal((m) => ({ ...m, show: false }))}
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

export default ChangePassword;
