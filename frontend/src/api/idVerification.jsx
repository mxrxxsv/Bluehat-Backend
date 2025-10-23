import axios from "axios";

const API = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/id-verification",
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ======================
// Upload ID picture
// ======================
export const uploadIDPicture = async (userId, file) => {
  const formData = new FormData();
  formData.append("image", file);      
  formData.append("userId", userId);

  const { data } = await API.post("/upload-id-picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
};

// ======================
// Upload Selfie
// ======================
export const uploadSelfie = async (userId, file) => {
  const formData = new FormData();
  formData.append("image", file);      
  formData.append("userId", userId);

  const { data } = await API.post("/upload-selfie", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
};

// ======================
// Check verification status
// ======================
export const getVerificationStatus = async () => {
  const { data } = await API.get("/status");
  return data;
};
