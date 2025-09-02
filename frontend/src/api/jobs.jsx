import axios from "axios";

// ✅ FIXED: Correct baseURL without /jobs
const API = axios.create({
  baseURL: "http://localhost:5000", // ✅ Removed /jobs
  withCredentials: true,
});

// ✅ Add authorization header for authenticated requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ ENHANCED: Get all jobs with cache busting option
export const getAllJobs = (options = {}) => {
  const {
    page = 1,
    limit = 10,
    category,
    location,
    search,
    status,
    _t,
  } = options;
  const params = { page, limit };
  if (category) params.category = category;
  if (location) params.location = location;
  if (search) params.search = search;
  if (status) params.status = status;
  if (_t) params._t = _t; // ✅ Cache buster timestamp

  return API.get("/jobs", {
    params,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
};

// ✅ FIXED: Get single job by ID
export const getJobById = (id) => API.get(`/jobs/${id}`);

// ✅ FIXED: Post a new job
export const postJob = (jobData) => API.post("/jobs", jobData);

// ✅ FIXED: Update job
export const updateJob = (id, jobData) => API.put(`/jobs/${id}`, jobData);

// ✅ FIXED: Delete job
export const deleteJob = (id) => API.delete(`/jobs/${id}`);

// ✅ FIXED: Get applications for a job
export const getJobApplications = (jobId) =>
  API.get(`/jobs/${jobId}/applications`);

// ✅ FIXED: Respond to application
export const respondToApplication = (applicationId, action, message) =>
  API.patch(`/applications/${applicationId}/respond`, { action, message });
