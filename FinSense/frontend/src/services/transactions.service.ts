import api from './api.service';

export interface Transaction {
  _id: string;
  userId: string;
  date: string;
  amount: number;
  description: string;
  category?: {
    name: string;
    confidence: number;
    isUserVerified: boolean;
  };
  rawData?: {
    originalDescription: string;
    source: string;
  };
  createdAt: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class TransactionsService {
  async getTransactions(
    page: number = 1,
    limit: number = 20,
    filters?: TransactionFilters
  ): Promise<PaginatedTransactions> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.category) params.append('category', filters.category);
      if (filters.minAmount !== undefined) params.append('minAmount', filters.minAmount.toString());
      if (filters.maxAmount !== undefined) params.append('maxAmount', filters.maxAmount.toString());
      if (filters.search) params.append('search', filters.search);
    }

    const response = await api.get(`/transactions?${params.toString()}`);
    
    // Transform backend response to match frontend interface
    return {
      transactions: response.data.data.transactions,
      total: response.data.data.pagination.totalCount,
      page: response.data.data.pagination.currentPage,
      limit: limit,
      totalPages: response.data.data.pagination.totalPages,
    };
  }

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get(`/transactions/${id}`);
    return response.data.transaction;
  }

  async updateTransactionCategory(
    id: string,
    category: string
  ): Promise<Transaction> {
    const response = await api.patch(`/transactions/${id}/category`, { category });
    return response.data.transaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  }

  async uploadCSV(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/transactions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  }

  async getCategories(): Promise<string[]> {
    const response = await api.get('/transactions/categories');
    return response.data.data.categories;
  }
}

export const transactionsService = new TransactionsService();
export default transactionsService;
