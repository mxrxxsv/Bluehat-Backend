import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getAllJobs = (options = {}) => {
  const {
    page = 1,
    limit = 10,
    category,
    location,
    search,
    status,
    clientId, 
    _t,
  } = options;

  const params = { page, limit };
  if (category) params.category = category;
  if (location) params.location = location;
  if (search) params.search = search;
  if (status) params.status = status;
  if (clientId) params.clientId = clientId; 
  if (_t) params._t = _t;

  return API.get("/jobs", {
    params,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
};


export const getJobById = (id) => API.get(`/jobs/${id}`);

export const postJob = (jobData) => API.post("/jobs", jobData);

export const updateJob = (id, jobData) => API.put(`/jobs/${id}`, jobData);

export const deleteJob = (id) => API.delete(`/jobs/${id}`);

export const getJobApplications = (jobId) =>
  API.get(`/jobs/${jobId}/applications`);

export const respondToApplication = (applicationId, action, message) =>
  API.patch(`/applications/${applicationId}/respond`, { action, message });
