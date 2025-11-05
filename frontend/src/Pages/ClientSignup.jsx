import { useNavigate } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import { signup, verify, resendEmailVerification } from "../api/auth";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";

const PHIL_API = "https://psgc.gitlab.io/api";

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-[#f4f6f6] bg-opacity-80 flex justify-center items-center z-[2000] shadow-ml">
    <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
      <button
        className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
        onClick={onClose}
        aria-label="Close modal"
      >
        &times;
      </button>
      {children}
    </div>
  </div>
);

const ClientSignup = () => {
  const topRef = useRef(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    userType: "client",
    firstName: "",
    lastName: "",
    middleName: "",
    suffixName: "",
    email: "",
    password: "",
    confirm_password: "",
    contactNumber: "",
    sex: "",
    dateOfBirth: "",
    maritalStatus: "",
    address: {
      region: "",
      province: "",
      city: "",
      barangay: "",
      street: "",
    },
    agree: false,
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [errors, setErrors] = useState({});
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Ensure we can absolutely jump to the very top across browsers and nested scrollers
  const forceScrollToTop = () => {
    try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch {}
    try { if (document?.documentElement) document.documentElement.scrollTop = 0; } catch {}
    try { if (document?.body) document.body.scrollTop = 0; } catch {}
    try { topRef.current?.scrollIntoView({ behavior: "auto", block: "start" }); } catch {}
    try {
      requestAnimationFrame(() => {
        try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch {}
        try { if (document?.documentElement) document.documentElement.scrollTop = 0; } catch {}
        try { if (document?.body) document.body.scrollTop = 0; } catch {}
      });
    } catch {}
  };

  useEffect(() => {
    let countdown;
    if (showOTPModal && timer > 0) {
      countdown = setTimeout(() => setTimer(timer - 1), 1000);
    }
    return () => clearTimeout(countdown);
  }, [timer, showOTPModal]);

  // When loading starts, jump to the very top so the user sees the loading indicator immediately
  useEffect(() => {
    if (isLoading) forceScrollToTop();
  }, [isLoading]);

  const handleChange = (e) => {
    const { id, value, type, checked, dataset } = e.target;
    if (dataset.address) {
      const field = dataset.address;
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`address.${field}`];
        return copy;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: type === "checkbox" ? checked : value,
      }));
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  // Helper function for age validation
  const validateAge = (dob) => {
    if (!dob) return { isValid: false, error: "Date of birth is required.", code: "DOB_REQUIRED" };

    const birthDate = new Date(dob);
    if (isNaN(birthDate)) {
      return { isValid: false, error: "Invalid date format.", code: "INVALID_DOB" };
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      return {
        isValid: false,
        error: "You must be at least 18 years old to sign up.",
        code: "UNDERAGE",
        currentAge: age
      };
    }

    if (age > 100) {
      return {
        isValid: false,
        error: "Age must be less than or equal to 100.",
        code: "OVERAGE",
        currentAge: age
      };
    }

    return { isValid: true, currentAge: age };
  };

  const validate = () => {
    const newErrors = {};
    const {
      firstName,
      lastName,
      email,
      password,
      confirm_password,
      agree,
      contactNumber,
      sex,
      dateOfBirth,
      maritalStatus,
      address: { region, province, city, barangay, street },
    } = formData;

    // Names
    if (!firstName.trim()) newErrors.firstName = "First name is required.";
    if (!lastName.trim()) newErrors.lastName = "Last name is required.";

    // Email
    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Enter a valid email address.";
    }

    // Password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const isLongEnough = password.length >= 12;

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (!(hasUpperCase && hasLowerCase && hasNumber && hasSymbol && isLongEnough)) {
      newErrors.password = "Password must meet all strength requirements.";
    }

    // Confirm
    if (!confirm_password) {
      newErrors.confirm_password = "Please confirm your password.";
    } else if (password !== confirm_password) {
      newErrors.confirm_password = "Passwords do not match.";
    }

    // Contact number (PH: 09xxxxxxxxx or +639xxxxxxxxx)
    if (!contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required.";
    } else if (!/^(09\d{9}|(\+63)9\d{9})$/.test(contactNumber.trim())) {
      newErrors.contactNumber = "Enter a valid PH mobile number (09xxxxxxxxx or +639xxxxxxxxx).";
    }

    // Other required fields
    if (!sex) newErrors.sex = "Gender is required.";
    if (!dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required.";
    } else {
      const ageValidation = validateAge(dateOfBirth);
      if (!ageValidation.isValid) {
        newErrors.dateOfBirth = ageValidation.error; // ✅ same as backend logic
      }
    }
    if (!maritalStatus) newErrors.maritalStatus = "Marital status is required.";

    // Address required fields
    if (!region) newErrors["address.region"] = "Region is required.";
    if (!province) newErrors["address.province"] = "Province is required.";
    if (!city) newErrors["address.city"] = "City / Municipality is required.";
    if (!barangay) newErrors["address.barangay"] = "Barangay is required.";
    if (!street.trim()) newErrors["address.street"] = "Street is required.";

    // Terms
    if (!agree) newErrors.agree = "You must agree to the Terms of Service.";

    setErrors(newErrors);

    // Scroll to the first error in the same order as the form
    const order = [
      "firstName",
      "lastName",
      "middleName",
      "suffixName",
      "email",
      "password",
      "confirm_password",
      "contactNumber",
      "sex",
      "dateOfBirth",
      "maritalStatus",
      "address.region",
      "address.province",
      "address.city",
      "address.barangay",
      "address.street",
      "agree",
    ];

    const firstKey = order.find((k) => newErrors[k]);
    if (firstKey) {
      scrollToError(firstKey);
      return false;
    }
    return true;
  };


  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setShowPasswordStrength(true);
    if (validate()) {
      // Turn on loading and immediately jump to the absolute top (no smooth)
      setIsLoading(true);
      forceScrollToTop();
      try {
        await signup(formData);
        setShowOTPModal(true);
        setTimer(60);
        setSuccessMessage("");
        setErrors({});
      } catch (err) {
        console.error(err);
        setErrors({ submit: "Failed to create account. Please try again." });
      } finally {
        setIsLoading(false);
      }
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

  const verifyOtp = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      setErrors({ otp: "Please enter the full 6-digit code." });
      return;
    }
    setIsLoading(true);
    try {
      // Fixed: Changed to match the second code format - only send token
      await verify({ token: enteredOtp });
      setShowOTPModal(false);
      setShowVerifyModal(true);
      setSuccessMessage("Account verified successfully! Redirecting...");
      setErrors({});
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setErrors({ otp: "Invalid or expired code. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    try {
      // Fixed: Added userType to match the second code format
      await resendEmailVerification({ email: formData.email, userType: formData.userType });
      setOtp(["", "", "", "", "", ""]);
      setTimer(60);
      setSuccessMessage("A new code has been sent to your email.");
      setErrors({});
    } catch (err) {
      setErrors({ resend: "Failed to resend code. Please try again later." });
    } finally {
      setIsLoading(false);
    }
  };

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  useEffect(() => {
    axios.get(`${PHIL_API}/regions/`).then((res) => setRegions(res.data));
  }, []);

  const handleRegionChange = async (e) => {
    const selectedName = e.target.value;

    // find region object (has both name + code)
    const selectedRegion = regions.find((r) => r.name === selectedName);

    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        region: selectedName,
        province: "",
        city: "",
        barangay: "",
      },
    }));

    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (selectedRegion) {
      const res = await axios.get(
        `${PHIL_API}/regions/${selectedRegion.code}/provinces/`
      );
      setProvinces(res.data);
    }
  };

  const handleProvinceChange = async (e) => {
    const selectedName = e.target.value;
    const selectedProv = provinces.find((p) => p.name === selectedName);

    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        province: selectedName,
        city: "",
        barangay: "",
      },
    }));

    setCities([]);
    setBarangays([]);

    if (selectedProv) {
      const res = await axios.get(
        `${PHIL_API}/provinces/${selectedProv.code}/cities-municipalities/`
      );
      setCities(res.data);
    }
  };

  const handleCityChange = async (e) => {
    const selectedName = e.target.value;
    const selectedCity = cities.find((c) => c.name === selectedName);

    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        city: selectedName,
        barangay: "",
      },
    }));

    setBarangays([]);

    if (selectedCity) {
      const res = await axios.get(
        `${PHIL_API}/cities-municipalities/${selectedCity.code}/barangays/`
      );
      setBarangays(res.data);
    }
  };

  const handleBarangayChange = (e) => {
    const selectedName = e.target.value;

    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        barangay: selectedName,
      },
    }));
  };

  const handleStreetChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, street: e.target.value },
    }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy["address.street"];
      return copy;
    });
  };

  // --- add below your useState hooks ---

  // Hold DOM refs for fields so we can scroll/focus the first one with an error
  const fieldRefs = useRef({});
  const setFieldRef = (key) => (el) => {
    if (el) fieldRefs.current[key] = el;
  };

  const hasError = (key) => Boolean(errors[key]);

  // Reusable input class with red highlight if there's an error
  const inputClass = (key, extra = "") =>
    `bg-gray-50 border ${hasError(key)
      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
    } text-gray-900 text-sm rounded-lg block w-full p-2.5 ${extra}`;

  // Smoothly scroll to a field by its key (matches what you pass to setFieldRef)
  const scrollToError = (key) => {
    const el = fieldRefs.current[key];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // focus after scroll to improve accessibility
      setTimeout(() => el.focus?.({ preventScroll: true }), 250);
    }
  };


  return (
    <>
      <div ref={topRef} />
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-3 py-1 flex items-center justify-center gap-2 shadow-sm">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-sky-500 border-t-transparent" />
            <span className="text-xs text-gray-700">Creating your account…</span>
          </div>
        </div>
      )}
      <form
        onSubmit={handleCreateAccount}
        className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mt-30 p-6 bg-white shadow-md rounded-lg"
      >
        <p className="text-center text-xl md:text-2xl font-medium mb-6 opacity-80">
          Sign up to find workers
        </p>

        {successMessage && !showOTPModal && !showVerifyModal && (
          <div className="bg-green-100 text-green-700 p-3 mb-4 rounded">
            {successMessage}
          </div>
        )}

        {errors.submit && (
          <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">
            {errors.submit}
          </div>
        )}

        {/* Top-level fixed banner already shows loading; remove in-form spinner to avoid duplication */}

        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              First name
            </label>
            <input
              type="text"
              id="firstName"
              ref={setFieldRef("firstName")}
              value={formData.firstName}
              onChange={handleChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              className={inputClass("firstName")}
              placeholder="John"
              required
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1 text-left">
                {errors.firstName}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Last name
            </label>
            <input
              ref={setFieldRef("lastName")}
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={handleChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              className={inputClass("lastName")}
              placeholder="Doe"
              required
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1 text-left">
                {errors.lastName}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="middleName"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Middle name <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              id="middleName"
              value={formData.middleName}
              onChange={handleChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Anthony"
            />
          </div>
          {/* <div>
            <label
              htmlFor="suffixName"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Suffix <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              id="suffixName"
              value={formData.suffixName}
              onChange={handleChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="Jr."
            />
          </div> */}
          <div>
            <label
              htmlFor="suffixName"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Suffix <span className="text-gray-500">(Optional)</span>
            </label>
            <select
              id="suffixName"
              value={formData.suffixName}
              onChange={handleChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"

            >
              <option value="">Select Suffix</option>
              <option value="Jr">Jr</option>
              <option value="Sr">Sr</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Email address
            </label>
            <input
              ref={setFieldRef("email")}
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              className={inputClass("email")}
              placeholder="john.doe@example.com"
              required
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1 text-left">
                {errors.email}
              </p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-sm font-medium text-gray-900 text-left"
              >
                Password
              </label>
              <div className="relative">
                <input
                  ref={setFieldRef("password")}
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setShowPasswordStrength(true)}
                  onBlur={() => setShowPasswordStrength(false)}
                  // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-10"
                  className={inputClass("password", "pr-10")}
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {showPasswordStrength && (
                <ul className="text-xs text-left text-gray-700 mt-1 ml-2 list-disc">
                  <li
                    className={
                      formData.password.length >= 12
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    At least 12 characters
                  </li>
                  <li
                    className={
                      /[A-Z]/.test(formData.password)
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    One uppercase letter
                  </li>
                  <li
                    className={
                      /[a-z]/.test(formData.password)
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    One lowercase letter
                  </li>
                  <li
                    className={
                      /[0-9]/.test(formData.password)
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    One number
                  </li>
                  <li
                    className={
                      /[^A-Za-z0-9]/.test(formData.password)
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    One special character
                  </li>
                </ul>
              )}
              {errors.password && (
                <p className="text-red-500 text-sm mt-1 text-left">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="relative">
              <label
                htmlFor="confirm_password"
                className="block mb-2 text-sm font-medium text-gray-900 text-left"
              >
                Confirm Password
              </label>
              <input
                ref={setFieldRef("confirm_password")}
                type={showConfirmPassword ? "text" : "password"}
                id="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-10"
                className={inputClass("confirm_password", "pr-10")}
                placeholder="********"
                required
              />
              {/* <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 top-6.5 right-3 flex items-center text-gray-500 hover:text-gray-700"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button> */}
              {errors.confirm_password && (
                <p className="text-red-500 text-sm mt-1 text-left">
                  {errors.confirm_password}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="contactNumber"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Contact Number
            </label>
            <input
              ref={setFieldRef("contactNumber")}
              type="tel"
              id="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              className={inputClass("contactNumber")}
              placeholder="09123456789"
              required
            />
            {errors.contactNumber && (
              <p className="mt-1 text-sm text-red-500 text-left">{errors.contactNumber}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="sex"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Gender
            </label>
            <select
              ref={setFieldRef("sex")}
              id="sex"
              value={formData.sex}
              onChange={handleChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              className={inputClass("sex")}
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="dateOfBirth"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Date of Birth
            </label>
            <input
              ref={setFieldRef("dateOfBirth")}
              type="date"
              id="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={inputClass("dateOfBirth")}
              max={new Date().toISOString().split("T")[0]} // ✅ disallow future dates
              required
            />
            {errors.dateOfBirth && (
              <p className="text-red-500 text-sm mt-1 text-left">{errors.dateOfBirth}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="maritalStatus"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Marital Status
            </label>
            <select
              ref={setFieldRef("maritalStatus")}
              id="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              className={inputClass("maritalStatus")}
              required
            >
              <option value="">Select status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="prefer not to say">prefer not to say</option>
            </select>
          </div>
          {/* Address Fields */}

          {/* Region */}
          <div>
            <label
              htmlFor="region"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Region
            </label>
            <select
              id="region"
              ref={setFieldRef("address.region")}
              value={formData.address.region}
              onChange={handleRegionChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
              className={inputClass("address.region", "rounded-xl p-3 transition")}
              required
            >
              <option value="">Select Region</option>
              {regions.map((r) => (
                <option key={r.code} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Province */}
          <div>
            <label
              htmlFor="province"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Province
            </label>
            <select
              id="province"
              ref={setFieldRef("address.province")}
              value={formData.address.province || ""}
              onChange={handleProvinceChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
              className={inputClass("address.province", "rounded-xl p-3 transition")}
              required
            >
              <option value="">Select Province</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label
              htmlFor="city"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              City / Municipality
            </label>
            <select
              id="city"
              ref={setFieldRef("address.city")}
              value={formData.address.city}
              onChange={handleCityChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
              className={inputClass("address.city", "rounded-xl p-3 transition")}
              required
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Barangay */}
          <div>
            <label
              htmlFor="barangay"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Barangay
            </label>
            <select
              id="barangay"
              ref={setFieldRef("address.barangay")}
              value={formData.address.barangay}
              onChange={handleBarangayChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
              className={inputClass("address.barangay", "rounded-xl p-3 transition")}
              required
            >
              <option value="">Select Barangay</option>
              {barangays.map((b) => (
                <option key={b.code} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Street */}
          <div className="md:col-span-2">
            <label
              htmlFor="street"
              className="block mb-2 text-sm font-medium text-gray-900 text-left"
            >
              Street
            </label>
            <input
              type="text"
              id="street"
              ref={setFieldRef("address.street")}
              value={formData.address.street}
              onChange={handleStreetChange}
              // className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
              className={inputClass("address.street", "rounded-xl p-3 transition")}
              placeholder="Street"
              required
            />
          </div>

          {/*  */}

          {/* <div>
                        <label
                            htmlFor="region"
                            className="block mb-2 text-sm font-medium text-gray-900 text-left"
                        >
                            Region
                        </label>
                        <input
                            type="text"
                            id="region"
                            data-address="region"
                            value={formData.address.region}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            placeholder="Region"
                            required
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="city"
                            className="block mb-2 text-sm font-medium text-gray-900 text-left"
                        >
                            City
                        </label>
                        <input
                            type="text"
                            id="city"
                            data-address="city"
                            value={formData.address.city}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            placeholder="City"
                            required
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="district"
                            className="block mb-2 text-sm font-medium text-gray-900 text-left"
                        >
                            District
                        </label>
                        <input
                            type="text"
                            id="district"
                            data-address="district"
                            value={formData.address.district}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            placeholder="District"
                            required
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="street"
                            className="block mb-2 text-sm font-medium text-gray-900 text-left"
                        >
                            Street
                        </label>
                        <input
                            type="text"
                            id="street"
                            data-address="street"
                            value={formData.address.street}
                            onChange={handleChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            placeholder="Street"
                            required
                        />
                    </div> */}
        </div>

        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="agree"
            checked={formData.agree}
            onChange={handleChange}
            className="mr-2"
            required
          />
          <label htmlFor="agree" className="text-sm font-medium text-gray-900">
            Yes, I understand and agree to the{" "}
            <a href="#" className="text-blue-600 hover:underline">
              BlueHat Terms of Service
            </a>
            .
          </label>
        </div>
        {errors.agree && (
          <p className="text-red-500 text-sm mb-4 text-start">{errors.agree}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="text-white bg-[#00a6f4] hover:bg-sky-400 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center cursor-pointer"
          >
            Create Account
          </button>
        </div>
      </form>

      {/* OTP Modal */}
      {showOTPModal && (
        <Modal onClose={() => setShowOTPModal(false)}>
          <h2 className="text-center text-[32px] font-semibold mb-4">
            Enter <span className="text-sky-400">OTP</span>
          </h2>
          <p className="text-center mb-4">
            A verification code was sent to <strong>{formData.email}</strong>.
            Please enter it below.
          </p>
          <div className="flex justify-center space-x-2 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                className="w-12 h-12 text-center border border-gray-300 rounded text-lg"
                autoFocus={index === 0}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ))}
          </div>
          {errors.otp && (
            <p className="text-red-600 text-sm mb-2 text-center">
              {errors.otp}
            </p>
          )}
          {successMessage && (
            <p className="text-green-600 text-sm mb-2 text-center">
              {successMessage}
            </p>
          )}
          <div className="flex justify-between items-center">
            <button
              className={`text-sky-600 hover:underline ${timer === 0 ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              disabled={timer !== 0 || isLoading}
              onClick={resendOtp}
            >
              Resend Code {timer > 0 && `(${timer}s)`}
            </button>
            <button
              onClick={verifyOtp}
              disabled={isLoading}
              className="bg-[#00a6f4] text-white px-4 py-2 rounded hover:bg-sky-400 cursor-pointer"
            >
              Verify
            </button>
          </div>
        </Modal>
      )}

      {/* Success Modal */}
      {showVerifyModal && (
        <Modal onClose={() => setShowVerifyModal(false)}>
          <h2 className="text-center text-lg font-semibold mb-4">
            Verification Successful!
          </h2>
          <p className="text-center mb-4">{successMessage}</p>
        </Modal>
      )}
    </>
  );
};

export default ClientSignup;
