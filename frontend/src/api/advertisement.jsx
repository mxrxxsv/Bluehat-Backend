import axios from "axios";
import { baseURL } from "../utils/appMode.js";
const advertisementApi = axios.create({
  baseURL: baseURL + "/advertisement",
  withCredentials: true,
});

export const getAdvertisements = () => advertisementApi.get("/");

export default advertisementApi;
