import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/jobs",
  withCredentials: true, // important so cookies (JWT) are sent
});

// Get all jobs (with optional pagination/filter)
export const getAllJobs = (page = 1, limit = 10, category, tag) => {
  const params = { page, limit };
  if (category) params.category = category;
  if (tag) params.tag = tag;
  return API.get("/", { params }).then(res => res.data);
};

// Get single job by ID
export const getJobById = (id) =>
  API.get(`/${id}`).then(res => res.data);

// Post a new job (auth required — token comes from cookie automatically)
export const postJob = (jobData) =>
  API.post("/", jobData).then(res => res.data);

// Update job
export const updateJob = (id, jobData) =>
  API.put(`/${id}`, jobData).then(res => res.data);

// Delete job
export const deleteJob = (id) =>
  API.delete(`/${id}`).then(res => res.data);

// Get applications for a job
export const getJobApplications = (jobId) =>
  API.get(`/${jobId}/applications`).then(res => res.data);

// Respond to application (accept/reject)
export const respondToApplication = (applicationId, action, message) =>
  API.patch(`/applications/${applicationId}/respond`, { action, message }).then(res => res.data);