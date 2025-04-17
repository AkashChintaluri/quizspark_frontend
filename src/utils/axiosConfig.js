import axios from 'axios';

// Create axios instance with default config
const axiosInstance = axios.create({
    // Set default timeout
    timeout: 10000,
    // Set default headers
    headers: {
        'Content-Type': 'application/json'
    },
    // Enable credentials
    withCredentials: true
});

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            console.error('Network error:', error);
            // Check if it's a certificate error
            if (error.message.includes('certificate') || error.message.includes('ERR_CERT_AUTHORITY_INVALID')) {
                return Promise.reject(new Error('SSL Certificate Error: The server\'s certificate is not trusted. Please ensure you\'re accessing the correct URL.'));
            }
            return Promise.reject(new Error('Unable to connect to the server. Please check your internet connection.'));
        }
        return Promise.reject(error);
    }
);

// Set the base URL from Vite environment variable
const apiUrl = import.meta.env.VITE_API_URL || 'https://ec2-13-127-72-180.ap-south-1.compute.amazonaws.com:3000';
axiosInstance.defaults.baseURL = apiUrl;

export default axiosInstance; 