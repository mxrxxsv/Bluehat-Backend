import React, { useState, useEffect } from "react";
import { Clock, MapPin, Briefcase, X, Tag } from "lucide-react";
import { checkAuth } from "../api/auth";
import { uploadProfilePicture, removeProfilePicture } from "../api/profile";
import { getAllJobs } from "../api/jobs";
import AddPortfolio from "../components/AddPortfolio";
import AddSkill from "../components/AddSkill";


const formatAddress = (address) => {
  if (!address || typeof address !== "object") return "Unknown";
  const parts = [address.barangay, address.city, address.province].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown";
};

const ProfilePage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // User posts state
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false);
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);


  // ✅ Load user
  useEffect(() => {
    checkAuth()
      .then((res) => {
        setCurrentUser(res.data.data);
        console.log(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        setCurrentUser(null);
        setLoading(false);
      });
  }, []);

  // ✅ Load jobs (if client) or portfolio (if freelancer)
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.userType === "client") {
      setPostsLoading(true);
      getAllJobs({ clientId: currentUser.profileId })
        .then((res) => {
          const jobs = res.data?.data?.jobs || [];

          setUserPosts(jobs);
        })
        .catch((err) => {

          setUserPosts([]);
        })
        .finally(() => setPostsLoading(false));
    } else {
      setUserPosts(currentUser.portfolio || []);
    }
  }, [currentUser]);


  const fetchPortfolios = async () => {
    try {
      const res = await checkAuth();
      setCurrentUser(res.data.data);
    } catch (err) {
      console.error("Failed to refresh portfolios:", err);
    }
  };

  const fetchSkills = async () => {
  try {
    const res = await checkAuth(); 
    setCurrentUser(res.data.data);
  } catch (err) {
    console.error("Failed to refresh skills:", err);
  }
};



  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", selectedFile);
      const res = await uploadProfilePicture(formData);
      setCurrentUser((prev) => ({
        ...prev,
        image: res.data.data.image,
      }));
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setUploading(true);
      await removeProfilePicture();
      setCurrentUser((prev) => ({
        ...prev,
        image: null,
      }));
      setIsModalOpen(false);
    } catch (err) {
      console.error("Remove failed:", err);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <p className="text-center mt-40 text-gray-500">Loading user profile...</p>;
  }

  if (!currentUser) {
    return <p className="text-center mt-40 text-red-500">User not authenticated.</p>;
  }

  const { userType, fullName, image, address } = currentUser;

  return (
    <div className="max-w-6xl mx-auto p-6 mt-[100px]">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-white shadow rounded-[20px] p-6 mb-10">
        <img
          src={
            image ||
            "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
          }
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
          onClick={() => setIsModalOpen(true)}
        />
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold text-gray-800">{fullName}</h2>
          <p className="text-sm text-gray-500 flex items-center justify-center md:justify-start gap-1">
            <MapPin size={16} /> {formatAddress(address)}
          </p>
          <span className="text-xs px-2 py-1 rounded-full bg-[#5eb6f3] text-white mt-2 inline-block">
            {userType === "client" ? "Client" : "Freelancer"}
          </span>
        </div>
      </div>

      {/* Content Based on Role */}
      {userType === "client" ? (
        <>
          <h3 className="text-xl font-semibold mb-4 text-gray-700 text-center">
            Your Job Posts
          </h3>
          {postsLoading ? (
            <p className="text-gray-500 text-center">Loading jobs...</p>
          ) : userPosts.length > 0 ? (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <div key={post.id} className="rounded-[20px] p-4 bg-white shadow-sm hover:shadow-lg transition-all block">
                  <div className="rounded-xl p-4 bg-white transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-[#252525] opacity-75">
                        {post.client?.name || "Client Name"}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-[#252525] opacity-80">
                        {/* <Clock size={16} /> */}
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>

                    </div>
                    <p className="text-gray-700 mt-1 text-left flex items-center gap-2">
                      <Briefcase size={20} className="text-blue-400" />
                      {post.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="bg-[#55b3f3] shadow-md text-white px-3 py-1 rounded-full text-xs">
                        {post.category?.name || "Uncategorized"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin size={16} /> {post.location}
                      </span>
                      <span className="font-bold text-green-400">
                        ₱{post.price?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">
              You have not posted any jobs yet.
            </p>
          )}
        </>
      ) : (
        <>
          {/* Portfolio Section */}

          <div className="bg-white shadow-md rounded-lg p-4 mb-8">

            {/* ================= SKILLS ================= */}
            {/* <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3 text-gray-700 text-left">Skills</h3>
              {currentUser.skillsByCategory && currentUser.skillsByCategory.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentUser.skillsByCategory.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-[#55b3f3] text-white text-sm rounded-full shadow-sm"
                    >
                      {skill.skillCategoryId?.categoryName || "Unnamed Skill Category"}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No skills added yet.</p>
              )}
            </div> */}

            <h3 className="text-xl font-semibold mb-3 text-gray-700 text-left flex justify-between items-center">
              Skills
              <button
                onClick={() => setIsAddSkillOpen(true)}
                className="px-3 py-1 bg-[#55b3f3] text-white text-sm rounded-lg hover:bg-blue-400 cursor-pointer"
              >
                + Add
              </button>
            </h3>
            {currentUser.skillsByCategory && currentUser.skillsByCategory.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentUser.skillsByCategory.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#55b3f3] text-white text-sm rounded-full shadow-sm"
                  >
                    {skill.skillCategoryId?.categoryName || "Unnamed Skill Category"}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No skills added yet.</p>
            )}

            {/* AddSkill Modal */}
            {isAddSkillOpen && (
              <AddSkill
                onClose={() => setIsAddSkillOpen(false)}
                onAdd={(newSkills) =>
                  setCurrentUser((prev) => ({
                    ...prev,
                    skills: [...(prev.skills || []), ...newSkills],
                  }))
                }
                onRefresh={fetchSkills}
              />
            )}



            {/* ================= PORTFOLIO ================= */}
            <h3 className="text-xl font-semibold mb-4 text-gray-700 text-left flex justify-between items-center">
              Portfolio
              <button
                onClick={() => setIsAddPortfolioOpen(true)}
                className="px-3 py-1 bg-[#55b3f3] text-white text-sm rounded-lg hover:bg-blue-400 cursor-pointer"
              >
                + Add
              </button>
            </h3>

            {currentUser.portfolio && currentUser.portfolio.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {currentUser.portfolio.map((item, index) => (
                  <div
                    key={index}
                    className="shadow p-4 rounded-xl text-left bg-white hover:shadow-lg transition"
                  >
                    <div className="w-full h-40 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                      <img
                        src={
                          item.image?.url
                            ? item.image.url
                            : "https://via.placeholder.com/300x200?text=No+Image"
                        }
                        alt={item.projectTitle || "Portfolio Project"}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mt-3">
                      {item.projectTitle || "Untitled Project"}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.description || "No description provided."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">You have not added any portfolio projects yet.</p>
            )}

            {/* Show AddPortfolio modal */}
            {isAddPortfolioOpen && (
              <AddPortfolio
                onClose={() => setIsAddPortfolioOpen(false)}
                onAdd={(newPortfolio) =>
                  setCurrentUser((prev) => ({
                    ...prev,
                    portfolio: [...(prev.portfolio || []), newPortfolio],
                  }))
                }
                onRefresh={fetchPortfolios}
              />
            )}



            {/* ================= CERTIFICATES ================= */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3 text-gray-700 text-left">Certificates</h3>
              {currentUser.certificates && currentUser.certificates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {currentUser.certificates.map((cert, index) => (
                    <div
                      key={index}
                      className="shadow-sm p-3 rounded-md bg-white text-left"
                    >
                      <img
                        src={
                          cert.url
                            ? cert.url
                            : "https://via.placeholder.com/300x200?text=No+Certificate"
                        }
                        alt="Certificate"
                        className="w-full h-40 object-cover rounded-md"
                      />
                      {/* <h4 className="text-md font-semibold text-gray-800 mt-3">
                        {cert.title || "Untitled Certificate"}
                      </h4>
                      <p className="text-sm text-gray-600">{cert.issuer || "Unknown Issuer"}</p> */}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No certificates uploaded yet.</p>
              )}
            </div>

            {/* ================= EXPERIENCE ================= */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3 text-gray-700 text-left">Work Experience</h3>
              {currentUser.experience && currentUser.experience.length > 0 ? (
                <div className="space-y-4">
                  {currentUser.experience.map((exp, index) => (
                    <div
                      key={index}
                      className="shadow-sm p-4 rounded-md text-left bg-white"
                    >
                      <h4 className="text-lg font-semibold text-gray-800">
                        {exp.position || "Unknown Position"}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {exp.companyName || "Unknown Company"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {exp.startYear} – {exp.endYear || "Present"}
                      </p>
                      <p className="text-gray-700 mt-2 text-sm">
                        {exp.responsibilities || "No details provided."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No work experience added yet.</p>
              )}
            </div>

          </div>


        </>
      )}

      {/* Modal for profile picture */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 relative shadow-lg">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center mt-5">
              <img
                src={
                  preview ||
                  image ||
                  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                }
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover mb-4 border"
              />

              <input
                type="file"
                id="fileInput"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <label
                htmlFor="fileInput"
                className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-sm hover:bg-gray-100 transition"
              >
                Choose Picture
              </label>

              {selectedFile && (
                <p className="mt-2 text-xs text-gray-500">
                  Selected: {selectedFile.name}
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="px-4 py-2 bg-[#55b3f3] text-white rounded-lg hover:bg-blue-400 cursor-pointer"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
                <button
                  onClick={handleRemove}
                  disabled={uploading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
