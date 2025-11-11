import axios from "axios";
import { baseURL } from "../utils/appMode.js";
const API = axios.create({
  baseURL: baseURL + "/profile",
  withCredentials: true,
});

export const uploadProfilePicture = (formData) =>
  API.post("/upload-picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const removeProfilePicture = () => API.delete("/remove-picture");

export const getProfile = () => API.get("/");

export const updateBasicProfile = (data) => API.put("/basic", data);

export const updateWorkerBiography = (data) => API.put("/biography", data);

export const createPortfolio = (formData) =>
  API.post("/portfolio", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updatePortfolio = (formData) =>
  API.put("/portfolio", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deletePortfolio = (id) => API.delete(`/portfolio/${id}`);

export const uploadCertificate = (formData) =>
  API.post("/certificate", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteCertificate = (id) => API.delete(`/certificate/${id}`);

export const addExperience = (data) => API.post("/experience", data);

export const deleteExperience = (id) => API.delete(`/experience/${id}`);

export const addSkillCategory = (data) => API.post("/skill-category", data);

export const removeSkillCategory = (id) => API.delete(`/skill-category/${id}`);
