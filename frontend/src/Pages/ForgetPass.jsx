import { useState } from "react";
import { forgotPassword } from "../api/auth";

const ForgetPassword = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await forgotPassword({ email });
      alert(response.data.message || "Password reset link sent to your email!");
      setEmail("");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send reset link.");
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
    </div>
  );
};

export default ForgetPassword;
