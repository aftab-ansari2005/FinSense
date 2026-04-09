// Transaction types
export interface Transaction {
  _id: string;
  userId: string;
  date: string;
  amount: number;
  description: string;
  category: {
    name: string | null;
    confidence: number;
    isUserVerified: boolean;
  };
  rawData: {
    originalDescription: string;
    source: string;
    importBatch?: string;
  };
  createdAt: string;
}

export interface UploadValidationResult {
  isValid: boolean;
  detectedFormat: {
    name: string;
    delimiter: string;
    hasHeader: boolean;
    columns: string[];
  };
  totalRows: number;
  fileSize: number;
  sampleRows: any[];
  errors: string[];
  warnings: string[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    importBatch: string;
    processedCount: number;
    errorCount: number;
    validation: {
      detectedFormat: string;
      totalRows: number;
      fileSize: number;
      warnings: string[];
    };
    transactions: Transaction[];
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
