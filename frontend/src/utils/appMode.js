const isProduction = import.meta.env.VITE_APP_MODE === "production";
const baseURL = isProduction
  ? import.meta.env.VITE_API_PROD_URL
  : import.meta.env.VITE_API_DEV_URL;

if (!baseURL) {
  console.error(
    "API base URL is not defined. Please check your environment variables."
  );
}

export { baseURL };
