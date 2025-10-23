// API Configuration for Environment Switching
const API_CONFIG = {
  // Environment detection
  isDevelopment: import.meta.env.DEV || import.meta.env.MODE === "development",
  isProduction: import.meta.env.PROD || import.meta.env.MODE === "production",

  // Base URLs - now supports environment variable override
  development: {
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
    websocketURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  },
  production: {
    baseURL:
      import.meta.env.VITE_API_BASE_URL ||
      "https://fixit-capstone.onrender.com",
    websocketURL:
      import.meta.env.VITE_API_BASE_URL ||
      "https://fixit-capstone.onrender.com",
  },

  // Get current environment URLs
  get current() {
    return this.isDevelopment ? this.development : this.production;
  },

  // API endpoints
  endpoints: {
    admin: "/admin",
    advertisement: "/advertisement",
    dashboard: "/api/dashboard",
    clientManagement: "/client-management",
    workerManagement: "/worker-management",
    verification: "/id-verification",
    skills: "/skills",
    jobs: "/jobs",
  },

  // Get full API URL for specific service
  getApiUrl: (service) => {
    const endpoint = API_CONFIG.endpoints[service];
    if (!endpoint) {
      throw new Error(`Unknown service: ${service}`);
    }
    return `${API_CONFIG.current.baseURL}${endpoint}`;
  },

  // Common axios configuration
  axiosConfig: {
    withCredentials: true,
    timeout: 10000, // 10 seconds timeout
    headers: {
      "Content-Type": "application/json",
    },
  },
};

// Log current environment for debugging
console.log(
  `🌍 Admin Environment: ${
    API_CONFIG.isDevelopment ? "Development" : "Production"
  }`
);
console.log(`🔗 API Base URL: ${API_CONFIG.current.baseURL}`);

export default API_CONFIG;
