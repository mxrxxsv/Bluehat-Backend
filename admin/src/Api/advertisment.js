import axios from "axios";

// Axios instance for advertisements
const advertisementApi = axios.create({
  baseURL: "http://localhost:5000/advertisement",
  withCredentials: true,
});

// ===== Advertisement API FUNCTIONS =====

// ✅ Fetch all advertisements excluding soft-deleted ones
export const getAdvertisements = async () => {
  try {
    const res = await advertisementApi.get("/");
    if (res.data && res.data.success && Array.isArray(res.data.data)) {
      // Filter out soft-deleted advertisements
      const activeAds = res.data.data.filter((ad) => !ad.isDeleted);
      return { ...res, data: { ...res.data, data: activeAds } };
    }
    return res;
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    throw error;
  }
};

// Fetch a specific advertisement by ID
export const getAdvertisementById = (id) => advertisementApi.get(`/${id}`);

// Health check endpoint
export const healthCheck = () => advertisementApi.get("/health");

// ===== Admin-only endpoints =====

// Add new advertisement (with file upload)
export const addAdvertisement = (data) =>
  advertisementApi.post("/", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Update advertisement by ID (with file upload)
export const updateAdvertisement = (id, data) =>
  advertisementApi.put(`/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Soft delete advertisement by ID
export const deleteAdvertisement = (id) => advertisementApi.delete(`/${id}`);

export default advertisementApi;
