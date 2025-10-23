import axios from "axios";
import API_CONFIG from "../config/api.js";

// Axios instance for skills with environment-aware URL
const skillApi = axios.create({
  baseURL: API_CONFIG.getApiUrl("skills"),
  ...API_CONFIG.axiosConfig,
});

// ===== Skill API FUNCTIONS =====

// Public
export const getAllSkills = () => skillApi.get("/");
export const getSkillByID = (id) => skillApi.get(`/${id}`);

// Admin-only
export const addSkill = (data) => skillApi.post("/", data);
export const updateSkill = (id, data) => skillApi.put(`/${id}`, data);
export const deleteSkill = (id) => skillApi.delete(`/${id}`);

export default skillApi;
