import React, { useState, useEffect } from "react";
import { Clock, MapPin, Briefcase, X } from "lucide-react";
import jobPosts from "../Objects/jobPosts";
import { checkAuth } from "../api/auth";
import {
  uploadProfilePicture,
  removeProfilePicture,
} from "../api/profile"; 

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

  useEffect(() => {
    checkAuth()
      .then((res) => {
        setCurrentUser(res.data.data); // 👈 this already contains id, userType, fullName, address, image
        setLoading(false);
      })
      .catch(() => {
        setCurrentUser(null);
        setLoading(false);
      });
  }, []);


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

  const userPosts =
    userType === "client"
      ? jobPosts.filter((post) => post.clientId === currentUser.id)
      : currentUser.portfolio || [];

  return (
    <div className="max-w-6xl mx-auto p-6 mt-[100px]">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-white shadow rounded-[20px] p-6 mb-10">
        {/* 👇 Profile picture clickable */}
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
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 mt-2 inline-block">
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
          {userPosts.length > 0 ? (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <div key={post.id} className="p-4 bg-white rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                      <Briefcase size={18} className="text-blue-400" /> {post.title}
                    </h4>
                    <span className="text-sm text-green-500 font-bold">
                      ₱{post.priceOffer.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600">{post.description}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      {post.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {post.datePosted}
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
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            Your Portfolio
          </h3>
          {userPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPosts.map((item, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-4">
                  <h4 className="text-md font-bold text-gray-800">
                    {item.projectTitle || "Untitled Project"}
                  </h4>
                  <p className="text-gray-600 mt-1">
                    {item.description || "No description provided."}
                  </p>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.projectTitle}
                      className="mt-3 w-full h-40 object-cover rounded-md"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              You have not added any portfolio projects yet.
            </p>
          )}
        </>
      )}

      {/* 👇 Modal for profile picture upload/remove */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 relative shadow-lg">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>

            {/* <h3 className="text-lg font-bold mb-4">Edit Profile Picture</h3> */}

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

              {/* Hidden file input */}
              <input
                type="file"
                id="fileInput"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Styled label as button */}
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
