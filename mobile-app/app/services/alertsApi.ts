import apiClient from './apiClient';
import { Alert } from '../types';

export interface CreateAlertParams {
  symbol: string;
  type: string;
  value?: number;
  name?: string;
  notifyEmail?: boolean;
  notifyInApp?: boolean;
}

export const alertsApi = {
  getAll: async (): Promise<Alert[]> => {
    const response = await apiClient.get('/alerts');
    return response.data;
  },

  create: async (params: CreateAlertParams): Promise<Alert> => {
    const response = await apiClient.post('/alerts', params);
    return response.data;
  },

  update: async (id: string, params: Partial<CreateAlertParams>): Promise<Alert> => {
    const response = await apiClient.patch(`/alerts/${id}`, params);
    return response.data;
  },

  delete: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/alerts/${id}`);
    return response.data;
  },

  getRecentEvents: async (limit = 50): Promise<any[]> => {
    const response = await apiClient.get(`/alerts/events?limit=${limit}`);
    return response.data;
  },
};
export default alertsApi;
