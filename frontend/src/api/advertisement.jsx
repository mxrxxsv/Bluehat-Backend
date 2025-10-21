import axios from "axios";

const advertisementApi = axios.create({
  baseURL: "https://fixit-capstone.onrender.com/advertisement",
  withCredentials: true,
});

export const getAdvertisements = () => advertisementApi.get("/");

export default advertisementApi;
