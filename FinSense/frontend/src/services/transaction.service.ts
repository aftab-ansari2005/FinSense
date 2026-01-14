import api from './api.service';
import { UploadResponse, UploadValidationResult, UploadProgress } from '@/types/transaction.types';

class TransactionService {
  /**
   * Upload and process CSV file
   */
  async uploadCSV(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/transactions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
    });

    return response.data;
  }

  /**
   * Validate CSV file without processing
   */
  async validateCSV(file: File): Promise<UploadValidationResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/transactions/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Get user transactions with filtering
   */
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    category?: string;
    search?: string;
  }) {
    const response = await api.get('/transactions', { params });
    return response.data;
  }

  /**
   * Get transaction statistics
   */
  async getStats(startDate?: string, endDate?: string) {
    const response = await api.get('/transactions/stats/summary', {
      params: { startDate, endDate },
    });
    return response.data;
  }
}

export const transactionService = new TransactionService();
export default transactionService;
