import axios from "axios";

// Axios instance for advertisements
const advertisementApi = axios.create({
  baseURL: "http://localhost:5000/advertisement",
  withCredentials: true, // ✅ cookies carry adminToken automatically
});

// ===== Advertisement API FUNCTIONS =====

// Public endpoints
export const getAdvertisements = () => advertisementApi.get("/");
export const getAdvertisementById = (id) => advertisementApi.get(`/${id}`);
export const healthCheck = () => advertisementApi.get("/health");

// Admin-only endpoints
export const addAdvertisement = (data) =>
  advertisementApi.post("/", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateAdvertisement = (id, data) =>
  advertisementApi.put(`/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteAdvertisement = (id) => advertisementApi.delete(`/${id}`);

export default advertisementApi;
