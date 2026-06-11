import apiClient from './apiClient';

export interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  assetClass?: string;
}

export const analysisApi = {
  search: async (query: string): Promise<SearchResult[]> => {
    if (!query) return [];
    const response = await apiClient.get(`/stocks/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  analyze: async (symbol: string, bypassCache = false): Promise<any> => {
    const response = await apiClient.post('/analyze', {
      symbol,
      bypassCache,
    });
    return response.data;
  },

  getLatestReport: async (symbol: string): Promise<any> => {
    const response = await apiClient.get(`/stocks/${symbol}/report/latest`);
    return response.data;
  },

  getMarketData: async (symbol: string): Promise<any> => {
    const response = await apiClient.get(`/stocks/${symbol}/market-data`);
    return response.data;
  },

  getTechnicals: async (symbol: string): Promise<any> => {
    const response = await apiClient.get(`/stocks/${symbol}/technicals`);
    return response.data;
  },
};
export default analysisApi;
