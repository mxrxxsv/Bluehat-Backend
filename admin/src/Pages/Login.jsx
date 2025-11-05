import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./../assets/image.png";
import { login } from "../Api/auth";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // ✅ Loading state

  const navigate = useNavigate();

  // Step 1: Show code modal after validating username/password
  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    setShowCodeModal(true);
  };

  // Step 2: Send login request with username, password, and code
  const handleVerifyCode = async () => {
    setError("");
    setLoading(true); // ✅ Show loading

    try {
      const res = await login({ userName: username, password, code });

      if (res.data.success) {
        navigate("/dashboard"); // ✅ Redirect after success
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false); // ✅ Hide loading when done
    }
  };

  return (
    <div className="bg-dark-900 h-screen relative overflow-hidden">
      {/* Background circles */}
      <div className="absolute bg-[#b8def79e] rounded-full w-[130vw] h-[130vw] -left-[45vw] -top-[10vw] md:w-[72vw] md:h-[72vw] md:-left-[20vw] md:-top-[27.5vw] z-0"></div>
      <div className="absolute bg-[#81c5f39e] rounded-full w-[80vw] h-[80vw] left-[52vw] -top-[10vw] rotate-[1.14deg] md:w-[83vw] md:h-[83vw] md:left-[23vw] md:-top-[55vw] z-0"></div>

      {/* Login container */}
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0 z-10 relative">
        <div className="w-full bg-[#f4f6f6] rounded-lg shadow md:mt-0 sm:max-w-md xl:p-0">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <div className="flex justify-center mb-4">
              <img src={Logo} alt="Admin Logo" className="w-45 h-45 object-contain" />
            </div>

            <form className="space-y-4 md:space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-900">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button
                type="submit"
                className="w-full text-white bg-blue-300 hover:bg-blue-400 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center block cursor-pointer"
              >
                Log in
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal for code verification */}
      {showCodeModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-50 z-[2000]">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-semibold text-center mb-4">Enter Verification Code</h2>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            />
            {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}

            {/* ✅ Show spinner if loading */}
            {loading ? (
              <div className="flex justify-center mb-2">
                <div className="w-6 h-6 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : null}

            <button
              onClick={handleVerifyCode}
              disabled={loading}
              className="w-full text-white bg-blue-300 hover:bg-blue-400 disabled:opacity-50 font-medium rounded-lg text-sm px-5 py-2.5 text-center cursor-pointer"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              onClick={() => {setShowCodeModal(false); setCode("");}}
              disabled={loading}
              className="w-full mt-2 text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 font-medium rounded-lg text-sm px-5 py-2.5 text-center cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
