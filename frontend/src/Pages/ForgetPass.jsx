import { useState, useRef, useEffect } from "react";

const ForgetPass = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(Array(6).fill(""));
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otpError, setOtpError] = useState("");
    const otpRefs = useRef([]);
    const VALID_OTP = "123456";

    const [resendTimer, setResendTimer] = useState(60);
    const timerRef = useRef(null);

    useEffect(() => {
        if (step === 2 && resendTimer > 0) {
            timerRef.current = setTimeout(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }

        return () => clearTimeout(timerRef.current);
    }, [resendTimer, step]);

    const handleSendOTP = (e) => {
        e.preventDefault();
        if (email) {
            console.log(`OTP sent to ${email}`);
            setStep(2);
            setResendTimer(60);
        }
    };

    const handleResendOTP = () => {
        console.log(`Resent OTP to ${email}`);
        setOtp(Array(6).fill(""));
        setOtpError("");
        setResendTimer(60);
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setOtpError("");

        if (value && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    };

    const handleResetPassword = (e) => {
        e.preventDefault();
        const enteredOtp = otp.join("");

        if (enteredOtp !== VALID_OTP) {
            setOtpError("The OTP you entered is incorrect.");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setOtpError("");
        console.log(`Password reset for ${email} with OTP: ${enteredOtp}`);
        alert("Password changed successfully!");
        setStep(1);
        setEmail("");
        setOtp(Array(6).fill(""));
        setNewPassword("");
        setConfirmPassword("");
    };

    return (
        <div className="flex justify-center mt-40 mx-10 md:mx-0">
            <div className="w-full max-w-md p-6 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-700">
                    {step === 1 ? "Forgot Password" : "Reset Password"}
                </h2>

                {step === 1 ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="text-left block mb-2 text-sm font-medium text-gray-900">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
                                placeholder="name@gmail.com"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full px-3 py-2 text-white bg-[#55b3f3] rounded-lg hover:bg-blue-400">Send OTP</button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="text-left block mb-2 text-sm font-medium text-gray-900">Enter 6-digit OTP</label>
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        ref={el => otpRefs.current[i] = el}
                                        className="w-10 h-10 md:w-13 md:h-13 text-center text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        maxLength={1}
                                    />
                                ))}
                            </div>
                            {otpError && (
                                <p className="text-sm text-red-500 mt-2 text-center">{otpError}</p>
                            )}
                            <div className="text-center mt-2">
                                {resendTimer > 0 ? (
                                    <p className="text-sm text-gray-500">Resend OTP in {resendTimer} sec</p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        className="text-sm text-blue-500 hover:underline"
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="text-left block mb-2 text-sm font-medium text-gray-900">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
                                placeholder="••••••••"
                                required
                            />
                            {newPassword && (
                                <ul className="text-sm mt-2 space-y-1 text-left">
                                    <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : "text-red-500"}>• At least one uppercase letter</li>
                                    <li className={/[a-z]/.test(newPassword) ? "text-green-600" : "text-red-500"}>• At least one lowercase letter</li>
                                    <li className={/[0-9]/.test(newPassword) ? "text-green-600" : "text-red-500"}>• At least one number</li>
                                    <li className={/[^A-Za-z0-9]/.test(newPassword) ? "text-green-600" : "text-red-500"}>• At least one special character</li>
                                    <li className={newPassword.length >= 8 ? "text-green-600" : "text-red-500"}>• Minimum 8 characters</li>
                                </ul>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="text-left block mb-2 text-sm font-medium text-gray-900">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button type="submit" className="w-full px-3 py-2 text-white bg-[#55b3f3] rounded-lg hover:bg-blue-400">Reset Password</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgetPass;
