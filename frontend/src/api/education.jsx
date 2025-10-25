import axios from "axios";
import { baseURL } from "../utils/appMode.js";

const api = axios.create({
  baseURL: baseURL + "/profile",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add education entry
export const addEducation = async (educationData) => {
  try {
    const response = await api.post("/education", educationData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to add education" };
  }
};

// Update education entry
export const updateEducation = async (educationData) => {
  try {
    const response = await api.put("/education", educationData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update education" };
  }
};

// Delete education entry
export const deleteEducation = async (educationId) => {
  try {
    const response = await api.delete(`/education/${educationId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete education" };
  }
};
