import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AgentReport } from '../types';

interface LocalCacheState {
  recentSearches: string[];
  readHistory: string[];
  bookmarks: AgentReport[];
  isLoading: boolean;
  loadCache: () => Promise<void>;
  addSearch: (query: string) => Promise<void>;
  clearSearches: () => Promise<void>;
  addReadHistory: (symbol: string) => Promise<void>;
  clearReadHistory: () => Promise<void>;
  toggleBookmark: (report: AgentReport) => Promise<void>;
  isBookmarked: (reportId: string) => boolean;
}

export const useLocalCacheStore = create<LocalCacheState>((set, get) => ({
  recentSearches: [],
  readHistory: [],
  bookmarks: [],
  isLoading: false,

  loadCache: async () => {
    set({ isLoading: true });
    try {
      const searches = await SecureStore.getItemAsync('recent_searches');
      const history = await SecureStore.getItemAsync('read_history');
      const savedBookmarks = await SecureStore.getItemAsync('report_bookmarks');

      set({
        recentSearches: searches ? JSON.parse(searches) : [],
        readHistory: history ? JSON.parse(history) : [],
        bookmarks: savedBookmarks ? JSON.parse(savedBookmarks) : [],
      });
    } catch (error) {
      console.error('Failed to load local cache', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addSearch: async (query) => {
    if (!query || query.trim() === '') return;
    const sanitizedQuery = query.trim().toUpperCase();
    const { recentSearches } = get();

    // Move to front, filter duplicate
    const updated = [
      sanitizedQuery,
      ...recentSearches.filter((s) => s !== sanitizedQuery),
    ].slice(0, 10); // Cap at 10

    set({ recentSearches: updated });
    try {
      await SecureStore.setItemAsync('recent_searches', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save search history', error);
    }
  },

  clearSearches: async () => {
    set({ recentSearches: [] });
    try {
      await SecureStore.deleteItemAsync('recent_searches');
    } catch (error) {
      console.warn('Failed to clear search history', error);
    }
  },

  addReadHistory: async (symbol) => {
    const sanitizedSymbol = symbol.trim().toUpperCase();
    const { readHistory } = get();

    const updated = [
      sanitizedSymbol,
      ...readHistory.filter((s) => s !== sanitizedSymbol),
    ].slice(0, 5); // Cap at 5

    set({ readHistory: updated });
    try {
      await SecureStore.setItemAsync('read_history', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save read history', error);
    }
  },

  clearReadHistory: async () => {
    set({ readHistory: [] });
    try {
      await SecureStore.deleteItemAsync('read_history');
    } catch (error) {
      console.warn('Failed to clear read history', error);
    }
  },

  toggleBookmark: async (report) => {
    const { bookmarks } = get();
    const exists = bookmarks.some((b) => b.id === report.id);
    let updated: AgentReport[];

    if (exists) {
      updated = bookmarks.filter((b) => b.id !== report.id);
    } else {
      updated = [report, ...bookmarks];
    }

    set({ bookmarks: updated });
    try {
      await SecureStore.setItemAsync('report_bookmarks', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save bookmarks', error);
    }
  },

  isBookmarked: (reportId) => {
    const { bookmarks } = get();
    return bookmarks.some((b) => b.id === reportId);
  },
}));
export default useLocalCacheStore;
