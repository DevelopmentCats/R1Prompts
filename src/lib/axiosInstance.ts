import axios from 'axios';

// In development, use relative URLs to leverage Vite's proxy
// In production, use the full API URL from env vars
const baseURL = import.meta.env.DEV 
  ? '/api' 
  : `${import.meta.env.VITE_API_URL}/api`;

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

export default axiosInstance;
