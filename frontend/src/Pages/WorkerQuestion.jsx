import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const WorkerQuestion = () => {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [submittedName, setSubmittedName] = useState("Anonymous!");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [workLocation, setWorkLocation] = useState("");
    const [skillCategory, setSkillCategory] = useState("");
    const [skills, setSkills] = useState([]);
    const [experienceLevel, setExperienceLevel] = useState("");
    const [certification, setCertification] = useState("");
    const [license, setLicense] = useState("");
    const [workType, setWorkType] = useState("");
    const [experienceText, setExperienceText] = useState("");
    const [profileImage, setProfileImage] = useState(null);
    const [certifications, setCertifications] = useState(null);
    const [workSample, setWorkSample] = useState(null);
    const navigate = useNavigate();




    const handleSubmit = () => {
        setLoading(true);
        setTimeout(() => {
            console.info("Form Submitted");
            navigate("/find-work");
        }, 2000); // 2 second delay for loading screen
    };

    const skillOptions = {
        "Plumbing": ["Pipe Installation", "Leak Repair", "Drain Cleaning", "Water Heater Installation"],
        "Electrical Work": ["Wiring Installation", "Circuit Breaker Repair", "Electrical Safety Inspection", "Appliance Repair"],
        "Carpentry": ["Cabinet Making", "Furniture Repair", "House Framing", "Wood Carving"],
        "Painting": ["Interior Painting", "Exterior Painting", "Spray Painting", "Wallpaper Installation"],
    };

    const handleNextStep = () => {
        if (step === 1 && name.trim()) setSubmittedName(name);
        setStep((prev) => prev + 1);
    };

    const handlePrevStep = () => setStep((prev) => prev - 1);

    const handleImageUpload = (event, setImage) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md p-6 overflow-hidden">
                <h2 className="text-[24px] text-[#252525] opacity-80 mb-4 text-center"> <span className="font-semibold">Worker Skill </span><br /> Application Questionnaire</h2>

                <div className="w-full overflow-hidden">
                    <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${(step - 1) * 100}%)` }}>
                        {/* STEP 1 */}
                        <div className="w-full flex-shrink-0 space-y-4">
                            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            <input type="text" placeholder="Current Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            <input type="text" placeholder="Preferred Work Location" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg" />

                            <div className="flex justify-end">
                                <button onClick={handleNextStep} className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-md">Next Step</button>
                            </div>

                        </div>

                        {/* STEP 2 */}
                        <div className="w-full flex-shrink-0 space-y-4">
                            <select value={skillCategory} onChange={(e) => setSkillCategory(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer">
                                <option value="">Select Your Primary Skill Category</option>
                                {Object.keys(skillOptions).map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>

                            {skillCategory && (
                                <div className="space-y-2">
                                    {skillOptions[skillCategory].map((skill) => (
                                        <label key={skill} className="flex items-center space-x-2">
                                            <input type="checkbox" value={skill} checked={skills.includes(skill)} onChange={(e) =>
                                                setSkills((prev) => e.target.checked ? [...prev, skill] : prev.filter(s => s !== skill))
                                            } />
                                            <span>{skill}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between">
                                <button onClick={handlePrevStep} className="bg-gray-700 hover:bg-gray-500 text-white px-6 py-2 rounded-md">Previous</button>
                                <button onClick={handleNextStep} className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-md">Next Step</button>
                            </div>
                        </div>

                        {/* STEP 3 */}
                        <div className="w-full flex-shrink-0 space-y-4">
                            <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer">
                                <option value="">Years of Experience</option>
                                <option value="Less than 1 year">Less than 1 year</option>
                                <option value="1-3 years">1-3 years</option>
                                <option value="4-7 years">4-7 years</option>
                                <option value="8+ years">8+ years</option>
                            </select>

                            {/* <input type="text" placeholder="Certification (if any)" value={certification} onChange={(e) => setCertification(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg" /> */}

                            <select value={license} onChange={(e) => setLicense(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer">
                                <option value="">Do you have a license?</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>

                            <input type="text" placeholder="Freelancer / Company / Both" value={workType} onChange={(e) => setWorkType(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg" />

                            <textarea placeholder="Brief description of your work experience" value={experienceText} onChange={(e) => setExperienceText(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg" />

                            <div className="flex justify-between">
                                <button onClick={handlePrevStep} className="bg-gray-700 hover:bg-gray-500 text-white px-6 py-2 rounded-md">Previous</button>
                                <button onClick={handleNextStep} className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-md">Next Step</button>
                            </div>
                        </div>

                        {/* STEP 4 */}
                        <div className="w-full flex-shrink-0 space-y-4 text-left">
                            <div>
                                <label className="block mb-1 font-medium">Profile Picture:</label>
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setProfileImage)} className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" />
                                {profileImage && <img src={profileImage} alt="Preview" className="w-24 h-24 rounded-full mt-2" />}
                            </div>

                            <div>
                                <label className="block mb-1 font-medium">Certifications (PDF):</label>
                                <input type="file" accept="application/pdf" onChange={(e) => handleImageUpload(e, setCertifications)} className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            </div>

                            <div>
                                <label className="block mb-1 font-medium">Work Sample (Image/PDF):</label>
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => handleImageUpload(e, setWorkSample)} className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg" />
                            </div>

                            <div className="flex justify-between">
                                <button onClick={handlePrevStep} className="bg-gray-700 hover:bg-gray-500 text-white px-6 py-2 rounded-md">Previous</button>
                                <button onClick={handleSubmit} className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-md">Submit</button>
                            </div>


                        </div>
                    </div>
                </div>
                {loading && (
                    <div className="fixed inset-0 bg-[#f4f6f6] bg-opacity-50 flex items-center justify-center z-[2000]">
                        <div className="bg-white p-6 rounded-xl shadow-xl text-center">
                            <h3 className="text-xl font-semibold mb-2">Verification Process</h3>
                            <p>Your information is being verified.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>



    );
};

export default WorkerQuestion;
