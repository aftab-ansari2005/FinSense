import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/FileUpload';
import transactionService from '@/services/transaction.service';
import { UploadProgress, UploadResponse } from '@/types/transaction.types';

const UploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | undefined>();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const navigate = useNavigate();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    setUploadResult(null);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setUploadProgress(undefined);

    try {
      const result = await transactionService.uploadCSV(file, (progress) => {
        setUploadProgress(progress);
      });

      setUploadResult(result);
      setSelectedFile(null);

      // Show success message for a moment, then redirect
      setTimeout(() => {
        navigate('/transactions');
      }, 3000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to upload file. Please try again.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Transactions</h1>
        <p className="text-gray-600">
          Upload your bank statement CSV file to automatically categorize and analyze your transactions
        </p>
      </div>

      {/* Upload Component */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <FileUpload
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          isUploading={isUploading}
          progress={uploadProgress}
          error={uploadError}
          maxSize={10}
        />
      </div>

      {/* Success Result */}
      {uploadResult && (
        <div className="bg-success-50 border border-success-500 rounded-lg p-6 animate-fade-in">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-success-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-success-900">
                Upload Successful!
              </h3>
              <div className="mt-2 text-sm text-success-700">
                <p className="mb-2">{uploadResult.message}</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600">Transactions Processed</p>
                    <p className="text-2xl font-bold text-success-600">
                      {uploadResult.data.processedCount}
                    </p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600">Errors</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {uploadResult.data.errorCount}
                    </p>
                  </div>
                </div>
                {uploadResult.data.validation.warnings.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-warning-700">Warnings:</p>
                    <ul className="list-disc list-inside mt-1">
                      {uploadResult.data.validation.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-4 text-sm">
                  Redirecting to transactions page...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-3">
          CSV File Format
        </h3>
        <div className="text-primary-700 space-y-2">
          <p>Your CSV file should contain the following columns:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Date</strong>: Transaction date (various formats supported)</li>
            <li><strong>Amount</strong>: Transaction amount (positive or negative)</li>
            <li><strong>Description</strong>: Transaction description or merchant name</li>
          </ul>
          <p className="mt-4">
            The system will automatically detect the format and categorize your transactions using AI.
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Tips for Best Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900">Export from your bank</p>
              <p className="text-sm text-gray-600">
                Download transaction history directly from your bank's website
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900">Include all transactions</p>
              <p className="text-sm text-gray-600">
                Upload at least 3 months of data for accurate predictions
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900">Check file format</p>
              <p className="text-sm text-gray-600">
                Ensure your file is in CSV format, not Excel or PDF
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900">Review categories</p>
              <p className="text-sm text-gray-600">
                After upload, review and correct any miscategorized transactions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
