import React, { useState, useEffect } from "react";
import {
    createPortfolio,
    uploadCertificate,
    addExperience,
    addSkillCategory,
    updateWorkerBiography
} from "../api/profile";
import DropzoneFileInput from "./DropzoneFileInput";
import { checkAuth } from "../api/auth";

const PortfolioSetup = ({ onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [error, setError] = useState("");
    const [availableSkills, setAvailableSkills] = useState([]);


    const [portfolios, setPortfolios] = useState([]);
    const [portfolioFile, setPortfolioFile] = useState(null);
    const [projectTitle, setProjectTitle] = useState("");
    const [projectDescription, setProjectDescription] = useState("");

    const [certificates, setCertificates] = useState([]);
    const [certificateFile, setCertificateFile] = useState(null);

    const [experiences, setExperiences] = useState([]);
    const [experience, setExperience] = useState({
        companyName: "",
        position: "",
        startYear: "",
        endYear: "",
        responsibilities: "",
    });

    const [skills, setSkills] = useState([]);
    const [skillCategory, setSkillCategory] = useState([]);

    const [biography, setBiography] = useState("");

    useEffect(() => {
        checkAuth()
            .then((res) => {
                const user = res.data.data;
                setCurrentUser({
                    credentialId: user.id,
                    profileId: user.profileId,
                });
            })
            .catch(() => setCurrentUser(null));
    }, []);

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const res = await fetch("http://localhost:5000/skills"); // adjust URL
                const data = await res.json();
                setAvailableSkills(Array.isArray(data?.data?.categories) ? data.data.categories : []);
            } catch (err) {
                console.error("Error fetching skills:", err);
            }
        };
        fetchSkills();
    }, []);

    const handleUpload = async (callback, data, onSuccess) => {
        if (!currentUser) {
            setError("User not authenticated.");
            return;
        }
        try {
            setLoading(true);
            setError("");
            await callback(data);
            onSuccess();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // Portfolio upload
    const handlePortfolioUpload = () => {
        if (!portfolioFile || !projectTitle) return;
        const formData = new FormData();
        formData.append("image", portfolioFile);
        formData.append("projectTitle", projectTitle);
        formData.append("description", projectDescription);
        formData.append("userId", currentUser.credentialId);

        handleUpload(createPortfolio, formData, () => {
            setPortfolios([...portfolios, { projectTitle, projectDescription }]);
            setPortfolioFile(null);
            setProjectTitle("");
            setProjectDescription("");
        });
    };

    // Certificate upload
    const handleCertificateUpload = () => {
        if (!certificateFile) return;

        const formData = new FormData();
        formData.append("image", certificateFile);
        formData.append("userId", currentUser.credentialId);

        handleUpload(uploadCertificate, formData, () => {
            setCertificates([
                ...certificates,
                { name: certificateFile.name, url: "#uploaded" },
            ]);
            setCertificateFile(null);
        });
    };

    // Experience upload
    const handleAddExperience = () => {
        if (!experience.companyName || !experience.position) return;
        const data = { ...experience, userId: currentUser.credentialId };

        handleUpload(addExperience, data, () => {
            setExperiences([...experiences, experience]);
            setExperience({
                companyName: "",
                position: "",
                startYear: "",
                endYear: "",
                responsibilities: "",
            });
        });
    };

    // Skill category upload
    const handleAddSkillCategory = () => {
        if (skillCategory.length === 0) return;

        skillCategory.forEach((id) => {
            const data = { skillCategoryId: id, userId: currentUser.credentialId };
            handleUpload(addSkillCategory, data, () => {
                setSkills((prev) => [...prev, id]);
            });
        });

        setSkillCategory([]); // reset selection
    };

    return (
        <div className="fixed inset-0 bg-[#f4f6f6] flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                    Skip
                </button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                    Complete Your Profile
                </h2>
                <p className="text-center text-sm text-gray-500 mb-6">
                    Step {step} of 5
                </p>

                {error && (
                    <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
                )}
                {loading && (
                    <p className="text-blue-500 text-sm mb-4 text-center">Uploading...</p>
                )}

                {/* STEP 1: Biography */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">Add Your Biography</h3>
                        <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
                            Write a short, engaging biography this helps clients learn about your personality and expertise.
                        </div>
                        <textarea
                            placeholder="Tell clients about yourself..."
                            value={biography}
                            onChange={(e) => setBiography(e.target.value)}
                            className="w-full border rounded-lg p-2 border-gray-300 min-h-[120px]"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    if (!biography.trim()) return;
                                    handleUpload(updateWorkerBiography, { biography }, () => {
                                        setStep(2);
                                    }, 2000);
                                }}
                                disabled={loading}
                                className="px-4 py-2 bg-[#00a6f4] text-white rounded-lg hover:bg-blue-400 cursor-pointer disabled:opacity-50"
                            >
                                Save Biography
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Portfolio */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">Add Portfolio</h3>
                        <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
                            Highlight your best work! Upload projects that showcase your skills and creativity.
                        </div>
                        <input
                            type="text"
                            placeholder="Project Title"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            className="w-full border rounded-lg p-2 border-gray-300"
                        />
                        <textarea
                            placeholder="Project Description"
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            className="w-full border rounded-lg p-2 border-gray-300"
                        />
                        <DropzoneFileInput
                            onFileSelect={(file) => setPortfolioFile(file)}
                            accept="image/*"
                            label="portfolio-upload"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handlePortfolioUpload}
                                disabled={loading}
                                className="px-4 py-2 bg-[#00a6f4] text-white rounded-lg hover:bg-blue-400 cursor-pointer disabled:opacity-50"
                            >
                                Add Portfolio
                            </button>
                        </div>
                        <ul className="mt-3 text-sm text-gray-600">
                            {portfolios.map((p, i) => (
                                <li key={i}>✔ {p.projectTitle}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* STEP 3: Certificates */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">Upload Certificates</h3>
                        <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
                            Upload any relevant certificates or training documents to boost your credibility.
                        </div>
                        <DropzoneFileInput
                            onFileSelect={(file) => setCertificateFile(file)}
                            accept="image/*,application/pdf"
                            label="certificate"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleCertificateUpload}
                                disabled={loading}
                                className="px-4 py-2 bg-[#00a6f4] text-white rounded-lg hover:bg-blue-400 cursor-pointer disabled:opacity-50"
                            >
                                Add Certificate
                            </button>
                        </div>
                        <ul className="mt-3 text-sm text-gray-600">
                            {certificates.map((c, i) => (
                                <li key={i}>
                                    ✔{" "}
                                    <a
                                        href={c.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        {c.name || "View Certificate"}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* STEP 4: Experience */}
                {step === 4 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">Add Experience</h3>
                        <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
                            Share your work experience so clients can see your background and roles.
                        </div>
                        <input
                            type="text"
                            placeholder="Company Name"
                            value={experience.companyName}
                            onChange={(e) =>
                                setExperience({ ...experience, companyName: e.target.value })
                            }
                            className="w-full border rounded-lg p-2 border-gray-300"
                        />
                        <input
                            type="text"
                            placeholder="Position"
                            value={experience.position}
                            onChange={(e) =>
                                setExperience({ ...experience, position: e.target.value })
                            }
                            className="w-full border rounded-lg p-2 border-gray-300"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={experience.startYear}
                                onChange={(e) =>
                                    setExperience({ ...experience, startYear: e.target.value })
                                }
                                className="w-full text-gray-700 border rounded-lg p-2 border-gray-300"
                            >
                                <option value="">Select Start Year</option>
                                {Array.from({ length: 51 }, (_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    );
                                })}
                            </select>
                            <select
                                value={experience.endYear}
                                onChange={(e) =>
                                    setExperience({ ...experience, endYear: e.target.value })
                                }
                                className="w-full text-gray-700 border rounded-lg p-2 border-gray-300"
                            >
                                <option value="">Select End Year</option>
                                {Array.from({ length: 51 }, (_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    );
                                })}
                                <option value="Present">Present</option>
                            </select>
                        </div>
                        <textarea
                            placeholder="Responsibilities"
                            value={experience.responsibilities}
                            onChange={(e) =>
                                setExperience({ ...experience, responsibilities: e.target.value })
                            }
                            className="w-full border rounded-lg p-2 border-gray-300"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleAddExperience}
                                disabled={loading}
                                className="px-4 py-2 bg-[#00a6f4] text-white rounded-lg hover:bg-blue-400 cursor-pointer disabled:opacity-50"
                            >
                                Add Experience
                            </button>
                        </div>
                        <ul className="mt-3 text-sm text-gray-600">
                            {experiences.map((exp, i) => (
                                <li key={i}>
                                    ✔ {exp.position} at {exp.companyName}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* STEP 5: Skills */}
                {step === 5 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">Add Skills</h3>
                        <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
                            Select your key skills these help clients match you to the right projects.
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableSkills.map((skill) => (
                                <button
                                    key={skill._id}
                                    onClick={() => {
                                        if (skillCategory.includes(skill._id)) {
                                            setSkillCategory(skillCategory.filter((id) => id !== skill._id));
                                        } else {
                                            setSkillCategory([...skillCategory, skill._id]);
                                        }
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${skillCategory.includes(skill._id)
                                            ? "bg-blue-500 text-white shadow"
                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        }`}
                                >
                                    {skill.name || skill.categoryName}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={handleAddSkillCategory}
                                disabled={loading || skillCategory.length === 0}
                                className="px-4 py-2 bg-[#00a6f4] text-white rounded-lg hover:bg-blue-400 cursor-pointer disabled:opacity-50"
                            >
                                Add Skill
                            </button>
                        </div>
                        <ul className="mt-3 text-sm text-gray-600">
                            {skills.map((s, i) => (
                                <li key={i}>
                                    ✔ {availableSkills.find((sk) => sk._id === s)?.name || s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        disabled={step === 1}
                        onClick={() => setStep(step - 1)}
                        className={`px-4 py-2 rounded-lg ${step === 1
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                            }`}
                    >
                        Previous
                    </button>

                    {step < 5 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-blue-300 cursor-pointer"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-blue-300 cursor-pointer"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>

    );
};

export default PortfolioSetup;
