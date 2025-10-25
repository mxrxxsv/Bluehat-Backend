import React, { useState, useEffect } from "react";
import {
  createPortfolio,
  uploadCertificate,
  addExperience,
  addSkillCategory,
  updateWorkerBiography,
} from "../api/profile";
import DropzoneFileInput from "./DropzoneFileInput";
import { checkAuth } from "../api/auth";
import { baseURL } from "../utils/appMode";
import { addEducation } from "../api/education";

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

  // Education state
  const [educations, setEducations] = useState([]);
  const [education, setEducation] = useState({
    schoolName: "",
    educationLevel: "",
    degree: "",
    startDate: "",
    endDate: "",
    educationStatus: "",
  });
  const [educationLoading, setEducationLoading] = useState(false);
  const [educationError, setEducationError] = useState("");

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
        const res = await fetch(`${baseURL}/skills`);
        const data = await res.json();
        setAvailableSkills(
          Array.isArray(data?.data?.categories) ? data.data.categories : []
        );
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
          Step {step} of 6
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
            <h3 className="text-lg font-semibold text-gray-700">
              Add Your Biography
            </h3>
            <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
              Write a short, engaging biography this helps clients learn about
              your personality and expertise.
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
                  handleUpload(
                    updateWorkerBiography,
                    { biography },
                    () => {
                      setStep(2);
                    },
                    2000
                  );
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
            <h3 className="text-lg font-semibold text-gray-700">
              Add Portfolio
            </h3>
            <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
              Highlight your best work! Upload projects that showcase your
              skills and creativity.
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
            <h3 className="text-lg font-semibold text-gray-700">
              Upload Certificates
            </h3>
            <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
              Upload any relevant certificates or training documents to boost
              your credibility.
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
            <h3 className="text-lg font-semibold text-gray-700">
              Add Experience
            </h3>
            <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
              Share your work experience so clients can see your background and
              roles.
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
                setExperience({
                  ...experience,
                  responsibilities: e.target.value,
                })
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

        {/* STEP 5: Education */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Add Education</h3>
            <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
              List your education history so clients can see your academic background.
            </div>
            {educationError && (
              <p className="text-red-500 text-sm">{educationError}</p>
            )}

            {/* Inline Education Form */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="School Name"
                value={education.schoolName}
                onChange={(e) =>
                  setEducation({ ...education, schoolName: e.target.value })
                }
                className="w-full border rounded-lg p-2 border-gray-300"
              />

              <select
                value={education.educationLevel}
                onChange={(e) =>
                  setEducation({ ...education, educationLevel: e.target.value })
                }
                className="w-full text-gray-700 border rounded-lg p-2 border-gray-300"
              >
                <option value="">Select Education Level</option>
                {[
                  "Elementary",
                  "Junior High",
                  "Senior High",
                  "Vocational",
                  "College",
                  "Master's",
                  "Doctorate",
                ].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Degree (optional)"
                value={education.degree}
                onChange={(e) =>
                  setEducation({ ...education, degree: e.target.value })
                }
                className="w-full border rounded-lg p-2 border-gray-300"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={education.startDate}
                    onChange={(e) =>
                      setEducation({ ...education, startDate: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End Date (optional)</label>
                  <input
                    type="date"
                    value={education.endDate}
                    onChange={(e) =>
                      setEducation({ ...education, endDate: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 border-gray-300"
                  />
                </div>
              </div>

              <select
                value={education.educationStatus}
                onChange={(e) =>
                  setEducation({ ...education, educationStatus: e.target.value })
                }
                className="w-full text-gray-700 border rounded-lg p-2 border-gray-300"
              >
                <option value="">Select Status</option>
                {["Graduated", "Undergraduate", "Currently Studying"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  )
                )}
              </select>

              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    // basic validation like in AddEducation
                    if (
                      !education.schoolName ||
                      !education.educationLevel ||
                      !education.startDate ||
                      !education.educationStatus
                    ) {
                      setEducationError(
                        "School name, education level, start date, and status are required."
                      );
                      return;
                    }
                    try {
                      setEducationLoading(true);
                      setEducationError("");
                      const payload = {
                        schoolName: String(education.schoolName || ""),
                        educationLevel: String(education.educationLevel || ""),
                        degree: String(education.degree || ""),
                        startDate: education.startDate
                          ? String(education.startDate)
                          : "",
                        endDate: education.endDate
                          ? String(education.endDate)
                          : "",
                        educationStatus: String(
                          education.educationStatus || ""
                        ),
                      };
                      const res = await addEducation(payload);
                      const saved = res?.data || res?.education || res || payload;
                      setEducations((prev) => [...prev, saved]);
                      // reset form
                      setEducation({
                        schoolName: "",
                        educationLevel: "",
                        degree: "",
                        startDate: "",
                        endDate: "",
                        educationStatus: "",
                      });
                    } catch (err) {
                      let msg = "Error adding education. Please try again.";
                      if (err?.errors && Array.isArray(err.errors)) {
                        msg = err.errors
                          .map((e) => `${e.field}: ${e.message}`)
                          .join("\n");
                      } else if (err?.message) {
                        msg = err.message;
                      }
                      setEducationError(msg);
                    } finally {
                      setEducationLoading(false);
                    }
                  }}
                  disabled={educationLoading}
                  className="px-4 py-2 bg-[#00a6f4] text-white rounded-lg hover:bg-blue-400 cursor-pointer disabled:opacity-50"
                >
                  {educationLoading ? "Adding..." : "Add Education"}
                </button>
              </div>
            </div>

            <ul className="mt-3 text-sm text-gray-700 space-y-2">
              {educations.map((edu, i) => (
                <li key={i} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-800">{edu.schoolName}</div>
                  <div className="text-gray-600">
                    {(edu.degree ? `${edu.degree} • ` : "")}
                    {edu.educationLevel || ""}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {edu.startDate || ""}
                    {edu.endDate ? ` - ${edu.endDate}` : ""}
                    {edu.educationStatus ? ` • ${edu.educationStatus}` : ""}
                  </div>
                </li>
              ))}
            </ul>
            
          </div>
        )}

        {/* STEP 6: Skills */}
        {step === 6 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Add Skills</h3>
            <div className="bg-blue-50 border-l-4 border-[#55b3f3] text-[#252525] p-3 rounded-md text-sm shadow-sm text-left">
              Select your key skills these help clients match you to the right
              projects.
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSkills.map((skill) => (
                <button
                  key={skill._id}
                  onClick={() => {
                    if (skillCategory.includes(skill._id)) {
                      setSkillCategory(
                        skillCategory.filter((id) => id !== skill._id)
                      );
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

          {step < 6 ? (
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
