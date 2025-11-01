import axios from "axios";
import { baseURL } from "../utils/appMode.js";
import { respondToApplication as respondToApplicationCanonical } from "./jobApplication.jsx";
const API = axios.create({
  baseURL: baseURL + "/jobs",
  withCredentials: true, // Cookies are sent automatically
});

// ✅ Get all jobs with optional category and location filters
export const getAllJobs = (options = {}) => {
  const {
    page = 1,
    limit = 10,
    category,
    location,
    clientId,
    status,
    sortBy = "createdAt",
    order = "desc",
    _t,
  } = options;

  const params = { page, limit, sortBy, order };
  if (category) params.category = category;
  if (location) params.location = location;
  if (clientId) params.clientId = clientId;
  if (status) params.status = status;
  if (_t) params._t = _t;

  return API.get("/", {
    params,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
};

export const getJobById = (id) => API.get(`/${id}`);

export const postJob = (jobData) => API.post("/", jobData);

export const updateJob = (id, jobData) => API.put(`/${id}`, jobData);

export const deleteJob = (id) => API.delete(`/${id}`);

export const getJobApplications = (jobId) => API.get(`/${jobId}/applications`);
// Delegate to canonical application API to avoid duplicate endpoint logic
export const respondToApplication = (applicationId, action, message) =>
  respondToApplicationCanonical(applicationId, { action, message });
