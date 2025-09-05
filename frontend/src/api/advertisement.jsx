import axios from "axios";

const advertisementApi = axios.create({
  baseURL: "http://localhost:5000/advertisement",
  withCredentials: true,
});

export const getAdvertisements = () => advertisementApi.get("/");

export default advertisementApi;
