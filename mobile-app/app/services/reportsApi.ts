import apiClient from './apiClient';
import { AgentReport } from '../types';

export const reportsApi = {
  getAll: async (params?: { symbol?: string; rating?: string; limit?: number }): Promise<AgentReport[]> => {
    const response = await apiClient.get('/reports', { params });
    return response.data;
  },

  getById: async (id: string): Promise<AgentReport> => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },
};
export default reportsApi;
