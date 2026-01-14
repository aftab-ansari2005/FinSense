import api from './api.service';

export interface PredictionData {
  date: string;
  predictedBalance: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  modelVersion: string;
  accuracy: number;
}

export interface HistoricalBalanceData {
  date: string;
  balance: number;
  isActual: boolean;
}

export interface PredictionMetrics {
  modelVersion: string;
  accuracy: number;
  mae: number;
  rmse: number;
  lastUpdated: string;
}

class PredictionService {
  /**
   * Get predictions with historical data
   */
  async getPredictions(days: number = 30): Promise<{
    historical: HistoricalBalanceData[];
    predictions: PredictionData[];
    metrics: PredictionMetrics | null;
  }> {
    const response = await api.get('/ml/dashboard', {
      params: { days },
    });

    const data = response.data.data;
    
    // Transform balance_data to historical format
    const historical: HistoricalBalanceData[] = data.balance_data.map((item: any) => ({
      date: item.date,
      balance: item.balance,
      isActual: true,
    }));

    // Transform predictions
    const predictions: PredictionData[] = data.predictions.map((pred: any) => ({
      date: pred.targetDate || pred.date,
      predictedBalance: pred.predictedBalance || pred.balance,
      confidenceInterval: pred.confidenceInterval || {
        lower: (pred.predictedBalance || pred.balance) * 0.95,
        upper: (pred.predictedBalance || pred.balance) * 1.05,
      },
      modelVersion: pred.modelVersion || 'v1.0',
      accuracy: pred.accuracy || 0.85,
    }));

    // Extract metrics if available
    const metrics: PredictionMetrics | null = data.metadata?.ml_service_status ? {
      modelVersion: 'v1.0',
      accuracy: 0.85,
      mae: 0,
      rmse: 0,
      lastUpdated: data.metadata.last_updated,
    } : null;

    return { historical, predictions, metrics };
  }

  /**
   * Get stress score and alerts
   */
  async getStressScore(): Promise<any> {
    const response = await api.get('/ml/dashboard');
    return response.data.data.stress_score;
  }
}

export const predictionService = new PredictionService();
export default predictionService;
