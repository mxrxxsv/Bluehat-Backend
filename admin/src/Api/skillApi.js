import axios from "axios";

// Axios instance for skills
const skillApi = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/skills",
  withCredentials: true, 
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
