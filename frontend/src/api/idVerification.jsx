import axios from "axios";

// Adjust base URL depending on your setup
const API = axios.create({
  baseURL: "http://localhost:5000/id-verification",
  withCredentials: true, 
});

// ======================
// Upload ID picture
// ======================
export const uploadIDPicture = async (userId, file) => {
  const formData = new FormData();
  formData.append("idPicture", file);
  formData.append("userId", userId);

  const { data } = await API.post("/upload-id-picture", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

// ======================
// Upload Selfie
// ======================
export const uploadSelfie = async (userId, file) => {
  const formData = new FormData();
  formData.append("selfie", file);   
  formData.append("userId", userId);  

  const { data } = await API.post("/upload-selfie", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
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

// ======================
// Delete document (idPicture | selfie)
// ======================
// export const deleteDocument = async (documentType) => {
//   const { data } = await API.delete(`/delete/${documentType}`);
//   return data;
// };
