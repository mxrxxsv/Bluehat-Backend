import React, { useState, useEffect } from "react";
import { Clock, MapPin, Briefcase, X, Tag } from "lucide-react";
import { checkAuth } from "../api/auth";
import { uploadProfilePicture, removeProfilePicture, deletePortfolio, deleteCertificate, deleteExperience, removeSkillCategory, updateWorkerBiography } from "../api/profile";
import { getAllJobs } from "../api/jobs";
import AddPortfolio from "../components/AddPortfolio";
import AddSkill from "../components/AddSkill";
import AddCertificate from "../components/AddCertificate";
import AddExperience from "../components/AddExperience";
import BiographyModal from "../components/BiographyModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";


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
  const [isAddCertificateOpen, setIsAddCertificateOpen] = useState(false);
  const [isAddExperienceOpen, setIsAddExperienceOpen] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);

  const [isBioModalOpen, setIsBioModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [deleteItemName, setDeleteItemName] = useState("");


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

  const fetchCertificates = async () => {
    try {
      const res = await checkAuth();
      setCurrentUser(res.data.data);
    } catch (err) {
      console.error("Failed to refresh certificates:", err);
    }
  };

  const fetchExperiences = async () => {
    try {
      const res = await checkAuth();
      setCurrentUser(res.data.data);
    } catch (err) {
      console.error("Failed to refresh experiences:", err);
    }
  };

  const handleSaveBiography = async (newBio) => {
    try {
      await updateWorkerBiography({ biography: newBio });
      const res = await checkAuth();
      setCurrentUser(res.data.data); // refresh state from server
      setIsBioModalOpen(false);
    } catch (err) {
      console.error("Failed to update biography:", err);
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

  const handleDeletePortfolio = async (id) => {
    console.log("Deleting portfolio ID:", id);
    try {
      await deletePortfolio(id);
      setCurrentUser((prev) => ({
        ...prev,
        portfolio: prev.portfolio.filter((p) => p._id !== id),
      }));
    } catch (err) {
      console.error("Failed to delete portfolio:", err.response?.data || err.message);
    }
  };

  const handleDeleteCertificate = async (id) => {
    console.log("Deleting certificate ID:", id);
    try {
      await deleteCertificate(id);
      setCurrentUser((prev) => ({
        ...prev,
        certificates: prev.certificates.filter((c) => c._id !== id),
      }));
    } catch (err) {
      console.error("Failed to delete certificate:", err.response?.data || err.message);
    }
  };

  const handleDeleteExperience = async (id) => {
    console.log("Deleting experience ID:", id);
    try {
      await deleteExperience(id);
      setCurrentUser((prev) => ({
        ...prev,
        experience: prev.experience.filter((e) => e._id !== id),
      }));
    } catch (err) {
      console.error("Failed to delete experience:", err.response?.data || err.message);
    }
  };

  const handleDeleteSkillCategory = async (id) => {
    console.log("Deleting skill category ID:", id);
    try {
      await removeSkillCategory(id);
      setCurrentUser((prev) => ({
        ...prev,
        skillsByCategory: prev.skillsByCategory.filter(
          (s) => s.skillCategoryId._id !== id
        ),
      }));
    } catch (err) {
      console.error(
        "Failed to delete skill category:",
        err.response?.data || err.message
      );
    }
  };

  const confirmDelete = (action, name = "this") => {
    setDeleteAction(() => action);
    setDeleteItemName(name);
    setIsDeleteModalOpen(true);
  };




  if (loading) {
    return <p className="text-center mt-40 text-gray-500">Loading user profile...</p>;
  }

  if (!currentUser) {
    return <p className="text-center mt-40 text-red-500">User not authenticated.</p>;
  }

  const { userType, fullName, image, address, biography } = currentUser;

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

          <p className="text-gray-700 text-sm mt-4 leading-relaxed cursor-pointer" onClick={() => setIsBioModalOpen(true)} >
            {biography || "No biography provided."}
          </p>


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
          {/* Credential Section */}

          <div className="bg-white shadow-md rounded-[20px] p-8 mb-8">

            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsEditMode((prev) => !prev)}
                className="px-3 py-0.5 bg-[#55b3f3] text-white text-sm rounded-lg hover:bg-blue-400 cursor-pointer"
              >
                {isEditMode ? "Done" : "Edit"}
              </button>
            </div>

             {/* ================= EXPERIENCE ================= */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 text-left flex justify-between items-center">
                Work Experience
                {isEditMode && (
                  <button
                    onClick={() => setIsAddExperienceOpen(true)}
                    className="px-3 py-1 bg-[#55b3f3] text-white text-sm rounded-lg hover:bg-blue-400 cursor-pointer"
                  >
                    + Add
                  </button>
                )}
              </h3>
              {currentUser.experience && currentUser.experience.length > 0 ? (
                <div className="space-y-4">
                  {currentUser.experience.map((exp) => (
                    <div
                      key={exp._id}
                      className="shadow-sm p-4 rounded-md text-left bg-white flex flex-col justify-between"
                    >
                      <div>
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

                      {/* ✅ Delete button at bottom */}
                      {isEditMode && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => confirmDelete(() => handleDeleteExperience(exp._id), exp.position)}
                            className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No work experience added yet.</p>
              )}
            </div>

          

          {isAddExperienceOpen && (
            <AddExperience
              onClose={() => setIsAddExperienceOpen(false)}
              onAdd={(newExperience) =>
                setCurrentUser((prev) => ({
                  ...prev,
                  experiences: [...(prev.experiences || []), newExperience],
                }))
              }
              onRefresh={fetchExperiences}
            />
          )}

            {/* ================= SKILLS ================= */}

            <h3 className="text-xl font-semibold mb-3 text-gray-700 text-left flex justify-between items-center">
              Skills
              {isEditMode && (
                <button
                  onClick={() => setIsAddSkillOpen(true)}
                  className="px-3 py-1 bg-[#55b3f3] text-white text-sm rounded-lg hover:bg-blue-400 cursor-pointer"
                >
                  + Add
                </button>
              )}
            </h3>
            {currentUser.skillsByCategory && currentUser.skillsByCategory.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentUser.skillsByCategory.map((skill, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-[#55b3f3] text-white text-sm rounded-full shadow-sm px-3 py-1"
                  >
                    <span>{skill.skillCategoryId?.categoryName || "Unnamed Skill Category"}</span>
                    {isEditMode && (
                      <button
                        onClick={() => confirmDelete(() => handleDeleteSkillCategory(skill.skillCategoryId._id))}
                        className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded hover:bg-red-200 hover:text-red-800 transition cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
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
            <div className="mb-8 mt-4">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 text-left flex justify-between items-center">
                Portfolio
                {isEditMode && (
                  <button
                    onClick={() => setIsAddPortfolioOpen(true)}
                    className="px-3 py-1 bg-[#55b3f3] text-white text-sm rounded-lg hover:bg-blue-400 cursor-pointer"
                  >
                    + Add
                  </button>
                )}
              </h3>

              {currentUser.portfolio && currentUser.portfolio.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {currentUser.portfolio.map((item) => (
                    <div
                      key={item._id}
                      className="shadow p-4 rounded-xl text-left bg-white hover:shadow-lg transition flex flex-col justify-between"
                    >
                      {/* Image Section */}
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

                      {/* Content Section */}
                      <div className="mt-3 flex-1">
                        <h4 className="text-lg font-semibold text-gray-800">
                          {item.projectTitle || "Untitled Project"}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description || "No description provided."}
                        </p>
                      </div>

                      {/* Delete Button at Bottom */}
                      {isEditMode && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => confirmDelete(() => handleDeletePortfolio(item._id), item.projectTitle)}
                            className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                </div>

              ) : (
                <p className="text-gray-500">You have not added any portfolio projects yet.</p>

              )}
            </div>

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
            <div className="mb-8 mt-4">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 text-left flex justify-between items-center">
                Certificates
                {isEditMode && (
                  <button
                    onClick={() => setIsAddCertificateOpen(true)}
                    className="px-3 py-1 bg-[#55b3f3] text-white text-sm rounded-lg hover:bg-blue-400 cursor-pointer"
                  >
                    + Add
                  </button>
                )}

              </h3>
              {currentUser.certificates && currentUser.certificates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {currentUser.certificates.map((cert, index) => (
                    <div
                      key={index}
                      className="shadow-sm p-3 rounded-md bg-white text-left flex flex-col justify-between"
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

                      {/* Delete Button */}
                      {isEditMode && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => confirmDelete(() => handleDeleteCertificate(cert._id), cert.title)}
                            className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No certificates uploaded yet.</p>
              )}

            </div>

            {isAddCertificateOpen && (
              <AddCertificate
                onClose={() => setIsAddCertificateOpen(false)}
                onAdd={(newCertificate) =>
                  setCurrentUser((prev) => ({
                    ...prev,
                    certificates: [...(prev.certificates || []), newCertificate],
                  }))
                }
                onRefresh={fetchCertificates}
              />
            )}

          </div>

        </>
      )}

      {/* Modal for editing biography */}
      {isBioModalOpen && (
        <BiographyModal
          biography={biography}
          onClose={() => setIsBioModalOpen(false)}
          onSave={handleSaveBiography}
        />

      )}


      {/* Modal for confirming deletions */}
      {isDeleteModalOpen && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => {
            if (deleteAction) deleteAction();
            setIsDeleteModalOpen(false);
          }}
          itemName={deleteItemName}
        />
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
