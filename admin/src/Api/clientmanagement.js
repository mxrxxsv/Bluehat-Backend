import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const getClients = async (decrypt = false) => {
  try {
    const response = await API.get("/client-management", {
      params: { decrypt: decrypt ? "true" : "false" },
      headers: { Accept: "application/json" },
    });

    console.log("Raw API response:", response);
    console.log("Response data:", response.data);
    console.log("Response headers:", response.headers);
    console.log("Decrypt parameter:", decrypt);

    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    console.error("Error response:", error.response?.data);
    throw error;
  }
};

export const getClientsWithFetch = async (decrypt = false) => {
  try {
    const url = new URL("/client-management", BASE_URL);
    url.searchParams.append("decrypt", decrypt ? "true" : "false");

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetch response data:", data);
    console.log("Decrypt parameter:", decrypt);

    return data;
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};

export const restrictClient = async (id, data) => {
  const res = await API.post(`/client-management/${id}/restrict`, data);
  return res.data;
};

export const banClient = async (id, data) => {
  const res = await API.post(`/client-management/${id}/ban`, data);
  return res.data;
};

export default API;
