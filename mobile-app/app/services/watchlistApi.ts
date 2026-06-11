import apiClient from './apiClient';
import { WatchlistItem } from '../types';

export const watchlistApi = {
  getAll: async (): Promise<WatchlistItem[]> => {
    const response = await apiClient.get('/watchlist');
    return response.data;
  },

  add: async (symbol: string): Promise<WatchlistItem> => {
    const response = await apiClient.post('/watchlist', { symbol });
    return response.data;
  },

  remove: async (symbol: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/watchlist/${symbol}`);
    return response.data;
  },
};
export default watchlistApi;
