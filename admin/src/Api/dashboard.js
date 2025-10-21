import axios from "axios";

// ✅ Set your backend API base URL
const API_BASE_URL = "http://localhost:5000/api/dashboard";
// ⚠️ Change to your deployed backend URL if needed

// ===== GET DASHBOARD DATA =====
export const fetchDashboardData = async (userType = "all") => {
  try {
    // Append userType as query param only if it's not "all"
    const query = userType !== "all" ? `?userType=${userType}` : "";
    const response = await axios.get(`${API_BASE_URL}${query}`);

    // The backend now returns contracts instead of applications
    return {
      users: response.data.data.users,
      locations: response.data.data.locations,
      contracts: response.data.data.contracts, // ✅ changed from applications
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error.response?.data || { message: "Network error" };
  }
};
