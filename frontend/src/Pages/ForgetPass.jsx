import { useState } from "react";
import { forgotPassword } from "../api/auth";

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [modal, setModal] = useState({ show: false, message: "", type: "success" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await forgotPassword({ email });
      setModal({
        show: true,
        message: "Password reset link sent to your email!",
        type: "success",
      });
      setEmail("");
      setTimeout(() => setModal({ ...modal, show: false }), 3000);
    } catch (error) {
      setModal({
        show: true,
        message: error.response?.data?.message || "Failed to send reset link.",
        type: "error",
      });
      console.error(error);
    }
  };

  return (
    <div className="flex justify-center mt-40 mx-10 md:mx-0">
      <div className="w-full max-w-md p-6 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-700">
          Forgot Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="text-left block mb-2 text-sm font-medium text-gray-900"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
              focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
              placeholder="name@gmail.com"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-3 py-2 text-white bg-[#55b3f3] rounded-lg hover:bg-blue-400 cursor-pointer"
          >
            Send Reset Link
          </button>
        </form>
      </div>

      {/* ✅ Modal Popup */}
      {modal.show && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#f4f6f6] bg-opacity-40 z-[2000]">
          <div className="bg-white rounded-lg shadow-md p-6 w-80 text-center">
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

export default ForgetPassword;
