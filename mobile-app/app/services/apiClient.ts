import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Dynamically resolve local development server IP address from Expo's host URI
const getDevServerUrl = () => {
  // hostUri holds the IP:port of the packager server (e.g., "192.168.1.15:8081")
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    // Check if the extracted host is a local IP address (e.g. 192.168.x.x, 10.x.x.x, 172.x.x.x)
    const isLocalIp = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip);
    if (isLocalIp) {
      return `http://${ip}:3000`;
    }
  }
  // Fallback to the host computer's exact local network IP (determined via ipconfig)
  return 'http://192.168.1.123:3000';
};

export const API_BASE_URL = __DEV__ ? getDevServerUrl() : 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to automatically attach authorization header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('user_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to retrieve token from SecureStore', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export default apiClient;
