import axios from "axios";
import API_CONFIG from "../config/api";

const API = axios.create({
  baseURL: API_CONFIG.current.baseURL,
  ...API_CONFIG.axiosConfig,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getMonthlyReport = async (month) => {
  if (!month) throw new Error("Month is required (YYYY-MM)");
  const res = await API.get(`/reports/summary?month=${month}`);
  return res.data;
};

export const getReportByRange = async ({ start, end }) => {
  if (!start || !end) throw new Error("Start and end are required (YYYY-MM-DD)");
  const params = new URLSearchParams({ start, end }).toString();
  const res = await API.get(`/reports/summary?${params}`);
  return res.data;
};

export default API;
