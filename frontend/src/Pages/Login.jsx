import { useState, useEffect } from "react";
import cute from "../assets/logi.png";
import { login } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
    const [form, setForm] = useState({ email: "", password: "" });
    const [step, setStep] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [resendTimer, setResendTimer] = useState(60);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const trimmedForm = {
                email: form.email.trim(),
                password: form.password.trim(),
            };
            await login(trimmedForm); // Use lowercase 'login'
            setStep("otp"); // Move inside try after successful API call
            setResendTimer(60);
        } catch (err) {
            alert(err.response?.data?.message || "Login Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = (e) => {
        e.preventDefault();
        if (otp === "123456") {
            navigate("/find-work");
        } else {
            alert("Invalid OTP");
        }
    };

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleResend = () => {
        setResendTimer(60);
        alert("OTP resent to your email.");
    };

    const handleBackToLogin = () => {
        setStep("login");
        setForm({ email: "", password: "" }); // Reset form state
        setOtp("");
        setResendTimer(60);
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

    return (
        <div className="mt-35 mx-full md:bg-white h-130 w-full">
            <div className="md:grid md:grid-cols-[750px_750px] h-80 md:w-full gap-2">
                <div className="mx-20 mt-5 hidden md:block">
                    <img src={cute} className="h-125 w-125" alt="Cute" />
                </div>

                <div className="ml-7 md:mx-20 md:mt-10 md:ml-65">
                    <div className="w-90 lg:max-w-xl p-6 space-y-8 sm:p-8 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {step === "login" ? "Login to" : "Enter OTP for"}{" "}
                            <span className="text-[#55b3f3]">FixIT</span>
                        </h2>

                        {step === "login" ? (
                            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                                <div>
                                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-left text-gray-900">Email</label>
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
                                <div>
                                    <label htmlFor="password" className="block mb-2 text-sm font-medium text-left text-gray-900">Password</label>
                                    <input
                                        name="password"
                                        type="password"
                                        id="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 shadow-sm"
                                        required
                                    />
                                </div>
                                <div className="flex items-start">
                                    <Link to="/forgetpass" className="ms-auto text-sm font-medium text-[#55b3f3] hover:underline">Lost Password?</Link>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full px-3 py-2 text-base font-medium text-white bg-[#55b3f3] rounded-lg hover:bg-blue-300 focus:ring-4 focus:ring-blue-300"
                                >
                                    Login
                                </button>
                                <div className="text-sm font-medium text-gray-900">
                                    Not registered yet? <Link to="/signup" className="text-[#55b3f3] hover:underline">Create account</Link>
                                </div>
                            </form>
                        ) : (
                            <form className="space-y-6" onSubmit={handleOtpSubmit}>
                                <div>
                                    <label htmlFor="otp" className="block mb-2 text-sm font-medium text-gray-900">
                                        Enter the 6-digit OTP sent to your email
                                    </label>
                                    <input
                                        type="text"
                                        id="otp"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        maxLength="6"
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 shadow-sm text-center tracking-widest"
                                        placeholder="------"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-sm text-gray-700">
                                    {resendTimer > 0 ? (
                                        <span>Resend available in {resendTimer}s</span>
                                    ) : (
                                        <button type="button" onClick={handleResend} className="text-[#55b3f3] hover:underline">
                                            Resend OTP
                                        </button>
                                    )}
                                </div>

                                <button type="submit" className="w-full px-3 py-2 text-base font-medium text-white bg-[#55b3f3] rounded-lg hover:bg-blue-300 focus:ring-4 focus:ring-blue-300">
                                    Verify OTP
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBackToLogin}
                                    className="w-full text-sm text-center text-gray-500 underline"
                                >
                                    Back to Login
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
