import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, UserRole } from '../types';
import apiClient from '../services/apiClient';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, password: string, role?: UserRole) => Promise<User>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('user_token');
      if (token) {
        // Configure auth token first
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          const res = await apiClient.get('/auth/me');
          set({ token, user: res.data, error: null });
        } catch (err: any) {
          // Token expired or invalid
          console.warn('Stored token is invalid, clearing session', err.message);
          await SecureStore.deleteItemAsync('user_token');
          delete apiClient.defaults.headers.common['Authorization'];
          set({ token: null, user: null });
        }
      }
    } catch (error) {
      console.error('Failed to load session', error);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      const { token, user } = res.data;
      
      await SecureStore.setItemAsync('user_token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ token, user, error: null });
      return user;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Login failed. Please try again.';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (username, password, role) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/auth/register', { username, password, role });
      
      // Automatically log in after registration
      const loginRes = await apiClient.post('/auth/login', { username, password });
      const { token, user } = loginRes.data;
      
      await SecureStore.setItemAsync('user_token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ token, user, error: null });
      return user;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Registration failed. Please try again.';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const { token } = get();
      if (token) {
        await apiClient.post('/auth/logout').catch(() => {});
      }
    } catch (error) {
      console.warn('Logout api request failed', error);
    } finally {
      await SecureStore.deleteItemAsync('user_token');
      delete apiClient.defaults.headers.common['Authorization'];
      set({ token: null, user: null, isLoading: false, error: null });
    }
  },
}));
export default useAuthStore;
