const isProduction = import.meta.env.VITE_APP_MODE === "production";
const baseURL = isProduction
  ? import.meta.env.VITE_API_PROD_URL
  : import.meta.env.VITE_API_DEV_URL;

if (!baseURL) {
  console.error(
    "API base URL is not defined. Please check your environment variables."
  );
} else if (isProduction) {
  console.log("Running in production mode. API base URL:", baseURL);
} else {
  console.log("Running in development mode. API base URL:", baseURL);
}

export { baseURL };
