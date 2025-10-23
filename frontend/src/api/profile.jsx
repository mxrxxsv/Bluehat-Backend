import axios from "axios";

const API = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/profile", 
  withCredentials: true, 
});

// Attach Authorization header from localStorage token for protected profile routes
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========================
// PROFILE PICTURE
// ========================
export const uploadProfilePicture = (formData) =>
  API.post("/upload-picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const removeProfilePicture = () => API.delete("/remove-picture");

// ========================
// BASIC PROFILE
// ========================
export const getProfile = () => API.get("/");
export const updateBasicProfile = (data) => API.put("/basic", data);

// ========================
// WORKER BIOGRAPHY
// ========================
export const updateWorkerBiography = (data) => API.put("/biography", data);

// ========================
// PORTFOLIO
// ========================
export const createPortfolio = (formData) =>
  API.post("/portfolio", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updatePortfolio = (formData) =>
  API.put("/portfolio", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deletePortfolio = (id) => API.delete(`/portfolio/${id}`);

// ========================
// CERTIFICATES
// ========================
export const uploadCertificate = (formData) =>
  API.post("/certificate", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteCertificate = (id) => API.delete(`/certificate/${id}`);

// ========================
// EXPERIENCE
// ========================
export const addExperience = (data) => API.post("/experience", data);
export const deleteExperience = (id) => API.delete(`/experience/${id}`);

// ========================
// SKILL CATEGORIES
// ========================
export const addSkillCategory = (data) => API.post("/skill-category", data);
export const removeSkillCategory = (id) =>
  API.delete(`/skill-category/${id}`);
