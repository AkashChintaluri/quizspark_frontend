import axios from 'axios';

// Create axios instance with default config
const axiosInstance = axios.create({
    // Don't reject self-signed certificates
    httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
    }),
    // Set default timeout
    timeout: 10000,
    // Set default headers
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK') {
            console.error('Network error:', error);
            return Promise.reject(new Error('Unable to connect to the server. Please check your internet connection.'));
        }
        return Promise.reject(error);
    }
);

// Set the base URL from Vite environment variable
const apiUrl = import.meta.env.VITE_API_URL || 'https://ec2-13-127-72-180.ap-south-1.compute.amazonaws.com:3000';
axiosInstance.defaults.baseURL = apiUrl;

export default axiosInstance; 