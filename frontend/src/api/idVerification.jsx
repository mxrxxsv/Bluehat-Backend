import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/id-verification",
  withCredentials: true,
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
