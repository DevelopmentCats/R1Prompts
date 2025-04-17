import axios from 'axios';
import * as CryptoJS from 'crypto-js';

// Determine the base URL based on the environment
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  }
  
  // Development fallback - use IP address directly
  if (import.meta.env.DEV) {
    return 'http://192.168.1.214:5000';
  }
  
  // Production fallback
  return 'https://r1prompts.com';
};

export const axiosInstance = axios.create({
  baseURL: `${getBaseUrl()}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 10000, // 10 seconds timeout
});

// Initialize auth token from localStorage
const token = localStorage.getItem('token');
if (token) {
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Update auth token when it changes
export const updateAuthToken = (token: string | null) => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Function to generate request signature using crypto-js
async function generateSignature(method: string, url: string, body: any = null, timestamp: number, apiKey: string) {
  try {
    const payload = `${method.toUpperCase()}${url}${JSON.stringify(body)}${timestamp}`;
    const hash = CryptoJS.SHA256(payload + apiKey);
    return hash.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('Error generating signature:', error);
    return null;
  }
}

// Add request interceptor for signature generation
axiosInstance.interceptors.request.use(async (config) => {
  try {
    const timestamp = Date.now();
    const apiKey = localStorage.getItem('apiKey');

    if (apiKey && config.url && config.method) {
      const signature = await generateSignature(
        config.method,
        config.url,
        config.data,
        timestamp,
        apiKey
      );

      if (signature) {
        config.headers['x-request-signature'] = signature;
        config.headers['x-timestamp'] = timestamp.toString();
        config.headers['x-api-key'] = apiKey;
      }
    }

    // Log request details in development
    if (import.meta.env.DEV) {
      console.log('Request Config:', {
        method: config.method,
        url: config.url,
        headers: config.headers,
      });
    }

    return config;
  } catch (error) {
    console.error('Request interceptor error:', error);
    return config;
  }
}, (error) => {
  if (import.meta.env.DEV) {
    console.error('Request Setup Error:', error);
  }
  return Promise.reject(error);
});

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('Response Error:', error.response?.data || error.message);
    }

    // Handle 401 Unauthorized responses
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('apiKey');
      
      // Redirect to login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
