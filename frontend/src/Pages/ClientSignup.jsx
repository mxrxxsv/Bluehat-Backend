import { Link, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";

const ClientSignup = () => {
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    // Updated initial state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirm_password: '',
        contactNumber: '',
        sex: '',
        dateOfBirth: '',
        maritalStatus: '',
        address: {
            region: '',
            city: '',
            district: '',
            street: '',
            unit: '',
        },
        agree: false,
    });

    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [timer, setTimer] = useState(60);
    const [errors, setErrors] = useState({});
    const [showPasswordStrength, setShowPasswordStrength] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        let countdown;
        if (showOTPModal && timer > 0) {
            countdown = setTimeout(() => setTimer(timer - 1), 1000);
        }
        return () => clearTimeout(countdown);
    }, [timer, showOTPModal]);

    const handleChange = (e) => {
        const { id, value, type, checked, dataset } = e.target;
        if (dataset.address) {
            const field = dataset.address;
            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    [field]: value,
                },
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [id]: type === 'checkbox' ? checked : value,
            }));
        }
    };


    const validate = () => {
        const newErrors = {};
        const { first_name, last_name, email, password, confirm_password, agree } = formData;

        if (!first_name.trim()) newErrors.first_name = "First name is required.";
        if (!last_name.trim()) newErrors.last_name = "Last name is required.";
        if (!email.trim()) {
            newErrors.email = "Email is required.";
        } else if (!/^\S+@\S+\.\S+$/.test(email)) {
            newErrors.email = "Enter a valid email address.";
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSymbol = /[^A-Za-z0-9]/.test(password);
        const isLongEnough = password.length >= 8;

        if (!password) {
            newErrors.password = "Password is required.";
        } else if (!(hasUpperCase && hasLowerCase && hasNumber && hasSymbol && isLongEnough)) {
            newErrors.password = "Password must meet all strength requirements.";
        }

        if (!confirm_password) {
            newErrors.confirm_password = "Please confirm your password.";
        } else if (password !== confirm_password) {
            newErrors.confirm_password = "Passwords do not match.";
        }

        if (!agree) {
            newErrors.agree = "You must agree to the Terms of Service.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateAccount = (e) => {
        e.preventDefault();
        setShowPasswordStrength(true);
        if (validate()) {
            setShowOTPModal(true);
            setTimer(60);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^[0-9]?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const verifyOtp = () => {
        const enteredOtp = otp.join('');
        if (enteredOtp.length === 6) {
            setShowOTPModal(false);
            setShowVerifyModal(true);
        }
    };

    const resendOtp = () => {
        setOtp(["", "", "", "", "", ""]);
        setTimer(60);
        // You can trigger resend OTP API here if needed
    };

    const closeVerifyModal = () => {
        setShowVerifyModal(false);
    };

    return (
        <>
            <form onSubmit={handleCreateAccount} className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mt-30 p-6 bg-white shadow-md rounded-lg">
                <p className="text-center text-xl md:text-2xl font-medium mb-6 opacity-80">Sign up to find workers</p>

                <div className="grid gap-6 mb-6 md:grid-cols-2">
                    <div>
                        <label htmlFor="first_name" className="block mb-2 text-sm font-medium text-gray-900 text-left">First name</label>
                        <input
                            type="text"
                            id="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            placeholder="John"
                        />
                        {errors.first_name && <p className="text-red-500 text-sm mt-1 text-left">{errors.first_name}</p>}
                    </div>
                    <div>
                        <label htmlFor="last_name" className="block mb-2 text-sm font-medium text-gray-900 text-left">Last name</label>
                        <input
                            type="text"
                            id="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            placeholder="Doe"
                        />
                        {errors.last_name && <p className="text-red-500 text-sm mt-1 text-left">{errors.last_name}</p>}
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 text-left">Email address</label>
                    <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="john.doe@company.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1 text-left">{errors.email}</p>}
                </div>

                <div className="mb-6">
                    <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 text-left">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="•••••••••"
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1 text-left">{errors.password}</p>}

                    {showPasswordStrength && (
                        <ul className="text-sm mt-2 space-y-1 text-left">
                            <li className={/[A-Z]/.test(formData.password) ? "text-green-600" : "text-red-500"}>• At least one uppercase letter</li>
                            <li className={/[a-z]/.test(formData.password) ? "text-green-600" : "text-red-500"}>• At least one lowercase letter</li>
                            <li className={/[0-9]/.test(formData.password) ? "text-green-600" : "text-red-500"}>• At least one number</li>
                            <li className={/[^A-Za-z0-9]/.test(formData.password) ? "text-green-600" : "text-red-500"}>• At least one special character</li>
                            <li className={formData.password.length >= 8 ? "text-green-600" : "text-red-500"}>• Minimum 8 characters</li>
                        </ul>
                    )}
                </div>

                <div className="mb-6">
                    <label htmlFor="confirm_password" className="block mb-2 text-sm font-medium text-gray-900 text-left">Confirm password</label>
                    <input
                        type="password"
                        id="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        placeholder="•••••••••"
                    />
                    {errors.confirm_password && <p className="text-red-500 text-sm mt-1 text-left">{errors.confirm_password}</p>}
                </div>

                <div className="grid gap-6 mb-6 md:grid-cols-2">
                    {/* Contact Number */}
                    <div>
                        <label htmlFor="contactNumber" className="block mb-2 text-sm font-medium text-gray-900 text-left">Contact Number</label>
                        <input
                            type="tel"
                            id="contactNumber"
                            value={formData.contactNumber}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                            placeholder="+1234567890"
                        />
                    </div>

                    {/* Sex */}
                    <div>
                        <label htmlFor="sex" className="block mb-2 text-sm font-medium text-gray-900 text-left">Sex</label>
                        <select
                            id="sex"
                            value={formData.sex}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                        >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    {/* Date of Birth */}
                    <div>
                        <label htmlFor="dateOfBirth" className="block mb-2 text-sm font-medium text-gray-900 text-left">Date of Birth</label>
                        <input
                            type="date"
                            id="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                        />
                    </div>

                    {/* Marital Status */}
                    <div>
                        <label htmlFor="maritalStatus" className="block mb-2 text-sm font-medium text-gray-900 text-left">Marital Status</label>
                        <select
                            id="maritalStatus"
                            value={formData.maritalStatus}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                        >
                            <option value="">Select</option>
                            <option value="single">Single</option>
                            <option value="married">Married</option>
                            <option value="divorced">Divorced</option>
                            <option value="widowed">Widowed</option>
                            <option value="prefer not to say">prefer not to say</option>
                        </select>
                    </div>
                </div>

                {/* Address Fields */}
                <div className="grid gap-6 mb-6 md:grid-cols-2">
                    {["region", "city", "district", "street", "unit"].map((field) => (
                        <div key={field}>
                            <label htmlFor={field} className="block mb-2 text-sm font-medium text-gray-900 text-left">
                                {field.charAt(0).toUpperCase() + field.slice(1)}
                            </label>
                            <input
                                type="text"
                                id={field}
                                data-address={field}
                                value={formData.address[field]}
                                onChange={handleChange}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                placeholder={`Enter ${field}`}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex items-center mb-6">
                    <input
                        id="agree"
                        type="checkbox"
                        checked={formData.agree}
                        onChange={handleChange}
                        className="w-4 h-4 mb-5 md:mb-0 text-sky-600 bg-gray-100 border-gray-300 rounded focus:ring-sky-500"
                    />
                    <label htmlFor="agree" className="ml-2 text-sm font-medium text-gray-900 text-left">
                        Yes, I understand and agree to the <a href="#" className="text-blue-600 hover:underline">BlueHat Terms of Service</a>.
                    </label>
                </div>
                {errors.agree && <p className="text-red-500 text-sm mb-4 text-left">{errors.agree}</p>}


                <button
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg text-sm px-5 py-2.5 focus:ring-4 focus:outline-none focus:ring-blue-300 cursor-pointer"
                >
                    Create Account
                </button>
            </form>

            {/* OTP Modal */}
            {showOTPModal && (
                <div className="fixed inset-0 z-50 bg-white bg-opacity-90 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
                        <h2 className="text-lg font-semibold mb-2">Enter OTP</h2>
                        <p className="mb-4 text-gray-600">Please enter the 6-digit code sent to your email.</p>

                        <div className="flex justify-center gap-2 mb-4">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    className="w-10 h-10 text-center border border-gray-300 rounded-md text-xl"
                                />
                            ))}
                        </div>

                        {timer > 0 ? (
                            <p className="text-sm text-gray-600 mb-2">Resend OTP in {timer}s</p>
                        ) : (
                            <button onClick={resendOtp} className="text-blue-500 text-sm underline mb-2">Resend OTP</button>
                        )}

                        <div className="flex justify-center mt-4">
                            <button
                                onClick={verifyOtp}
                                className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg shadow-sm"
                            >
                                Verify OTP
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post-OTP Verification Modal */}
            {showVerifyModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-80">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-11/12 max-w-md text-left">
                        <h2 className="text-xl font-semibold mb-4 text-center">Verify Account</h2>
                        <p className="mb-6 text-gray-600 text-center">Do you want to verify your profile now?</p>
                        <div className="flex justify-center gap-4">
                            <Link to="/bluehat/workerquestion">
                                <button className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg shadow-sm">
                                    Yes
                                </button>
                            </Link>
                            <Link to="/find-workers">
                                <button
                                    onClick={closeVerifyModal}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg shadow-sm cursor-pointer"
                                >
                                    Later
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ClientSignup;
