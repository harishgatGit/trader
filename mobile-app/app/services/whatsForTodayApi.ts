import apiClient from './apiClient';

export interface IndexMovement {
  price: number;
  changePercent: number;
}

export interface TopStock {
  symbol: string;
  companyName: string;
  price: number;
  changePercent: number;
  catalyst: string;
  watchReason: string;
  explanation: string;
  riskLevel: string;
  technicalSetup: string;
  liquidityScore: string;
  heatmap: {
    priceMomentum: string;
    volumeStrength: string;
    newsSentiment: string;
    sectorStrength: string;
    technicalTrend: string;
    volatilityRisk: string;
    liquidity: string;
    catalystImpact: string;
    accDistSignal: string;
    overallWatchScore: number;
  };
}

export interface SectorWatchItem {
  id: string;
  sectorName: string;
  trend: string;
  reasoning: string;
  catalyst: string;
  volumeStrength: string;
  riskLevel: string;
  topStocks: TopStock[];
}

export interface DailyReport {
  id: string;
  date: string;
  runNumber: number;
  runTime: string;
  title: string;
  marketStorySummary: string;
  mood: string;
  indexMovements: Record<string, IndexMovement>;
  catalystSummary: string;
  economicEvents: string[];
  newsSentiment: string;
  volumeBehavior: string;
  volatilityLevel: string;
  riskLevel: string;
  beginnerExplanation: string;
  sectors: SectorWatchItem[];
}

export interface PennyStockItem {
  id: string;
  symbol: string;
  companyName: string;
  price: number;
  changePercent: number;
  volumeSpike: number;
  catalyst: string;
  riskLevel: string;
  liquidityScore: string;
  watchReason: string;
  explanation: string;
}

export interface PennyStockResponse {
  pennyStocks: PennyStockItem[];
  generatedAt: string;
  nextRefreshAt: string;
}

export interface FeedbackLog {
  id: string;
  date: string;
  expectedSectors: string[];
  actualSectors: string[];
  expectedStocks: string[];
  actualStocks: string[];
  failedInsights: string[];
  explanationOfFails: string;
  missingDataNotes: string;
  misleadingSignals: string;
  promptImprovementNotes: string;
  createdAt: string;
}

export const whatsForTodayApi = {
  getLatest: async (): Promise<DailyReport | null> => {
    const res = await apiClient.get<DailyReport>('/whats-for-today/latest');
    return res.data;
  },
  getReportDetail: async (id: string): Promise<DailyReport | null> => {
    const res = await apiClient.get<DailyReport>(`/whats-for-today/report/${id}`);
    return res.data;
  },
  getByPhase: async (run: number, date?: string): Promise<DailyReport | null> => {
    const res = await apiClient.get<DailyReport>(`/whats-for-today/phase/${run}`, {
      params: { date },
    });
    return res.data;
  },
  getPennyStocks: async (search?: string): Promise<PennyStockResponse> => {
    const res = await apiClient.get<PennyStockResponse>('/whats-for-today/penny-stocks', {
      params: { search },
    });
    return res.data;
  },
  triggerPennyStockScan: async (): Promise<PennyStockResponse> => {
    const res = await apiClient.post<PennyStockResponse>('/whats-for-today/penny-stocks/scan');
    return res.data;
  },
  trackInteraction: async (symbol: string, action: string): Promise<any> => {
    const res = await apiClient.post('/whats-for-today/interact', { symbol, action });
    return res.data;
  },
  getFeedbackLogs: async (): Promise<FeedbackLog[]> => {
    const res = await apiClient.get<FeedbackLog[]>('/whats-for-today/feedback');
    return res.data;
  },
  manualTrigger: async (run: number, date?: string): Promise<DailyReport | null> => {
    const res = await apiClient.post<DailyReport>(`/whats-for-today/trigger/${run}`, null, {
      params: { date },
    });
    return res.data;
  },
};

export default whatsForTodayApi;
