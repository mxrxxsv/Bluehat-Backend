import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/dashboard";

export const fetchDashboardData = async (userType = "all") => {
  try {
    // ✅ Add ?userType only if not "all"
    const query = userType !== "all" ? `?userType=${userType}` : "";
    const response = await axios.get(`${API_BASE_URL}${query}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error.response?.data || { message: "Network error" };
  }
};
