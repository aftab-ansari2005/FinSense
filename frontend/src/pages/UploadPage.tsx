import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import transactionService from '../services/transaction.service';
import { UploadProgress, UploadResponse } from '../types/transaction.types';

const inkText: React.CSSProperties = { fontFamily: "'Lato', sans-serif", color: '#1e1610' };

const Section: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div className="paper-card-base paper-card-torn" style={{ borderRadius: '3px', padding: '22px 24px 32px', position: 'relative', ...style }}>
    {children}
  </div>
);

const UploadPage: React.FC = () => {
  const [isUploading, setIsUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | undefined>();
  const [uploadError, setUploadError]   = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const navigate = useNavigate();

  const handleFileSelect = (file: File) => { setSelectedFile(file); setUploadError(null); setUploadResult(null); };

  const handleUpload = async (file: File) => {
    setIsUploading(true); setUploadError(null); setUploadResult(null); setUploadProgress(undefined);
    try {
      const result = await transactionService.uploadCSV(file, p => setUploadProgress(p));
      setUploadResult(result); setSelectedFile(null);
      setTimeout(() => navigate('/transactions'), 3000);
    } catch (err: any) {
      setUploadError(err.response?.data?.message || err.response?.data?.error || 'Failed to upload file.');
    } finally { setIsUploading(false); setUploadProgress(undefined); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div
        className="paper-blue"
        style={{
          padding: '24px 28px 18px',
          boxShadow: '0 4px 18px rgba(58,34,10,.3)',
          clipPath: `polygon(0% 0%, 100% 0%, 100% 78%, 97% 84%, 93% 78%, 90% 85%, 86% 78%, 82% 85%, 78% 78%, 74% 85%, 70% 78%, 66% 84%, 62% 78%, 58% 84%, 54% 78%, 50% 85%, 46% 78%, 42% 84%, 38% 78%, 34% 85%, 30% 78%, 26% 84%, 22% 78%, 18% 84%, 14% 78%, 10% 84%, 6% 78%, 2% 84%, 0% 78%)`,
        }}
      >
        <h1 style={{ ...inkText, fontWeight: 900, fontSize: '26px', margin: '0 0 5px', color: '#1a3848' }}>Upload Transactions</h1>
        <p style={{ ...inkText, fontSize: '14px', color: '#3e6070', margin: 0 }}>
          Upload your bank statement CSV to automatically categorize and analyze transactions
        </p>
      </div>

      {/* FileUpload zone */}
      <Section>
        <FileUpload
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          isUploading={isUploading}
          progress={uploadProgress}
          error={uploadError}
          maxSize={10}
        />
      </Section>

      {/* Success result */}
      {uploadResult && (
        <div style={{
          background: 'linear-gradient(160deg, #e8f5e8, #d8eed8)',
          border: '1.5px solid rgba(50,130,50,.3)',
          borderRadius: '3px', padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(30,80,30,.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <svg style={{ width: '24px', height: '24px', color: '#2a6e2a', flexShrink: 0, marginTop: '2px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ flex: 1 }}>
              <h3 style={{ ...inkText, fontWeight: 700, fontSize: '16px', color: '#1e4e1e', margin: '0 0 6px' }}>Upload Successful!</h3>
              <p style={{ ...inkText, fontSize: '13px', color: '#2a5e2a', margin: '0 0 12px' }}>{uploadResult.message}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Transactions Processed', val: uploadResult.data.processedCount, colour: '#1e4e1e' },
                  { label: 'Errors', val: uploadResult.data.errorCount, colour: uploadResult.data.errorCount > 0 ? '#7a1818' : '#1e4e1e' },
                ].map(item => (
                  <div key={item.label} className="paper-card-base" style={{ borderRadius: '2px', padding: '10px 14px' }}>
                    <p style={{ ...inkLabel, margin: '0 0 4px' }}>{item.label}</p>
                    <p style={{ ...inkText, fontSize: '24px', fontWeight: 700, color: item.colour, margin: 0 }}>{item.val}</p>
                  </div>
                ))}
              </div>
              <p style={{ ...inkText, fontSize: '12px', color: '#3a6e3a', margin: '12px 0 0' }}>Redirecting to transactions page…</p>
            </div>
          </div>
        </div>
      )}

      {/* CSV format guide */}
      <Section>
        <h3 style={{ ...inkText, fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>📋 CSV File Format</h3>
        <p style={{ ...inkText, fontSize: '13px', color: '#5a4832', margin: '0 0 10px' }}>Your CSV file should contain the following columns:</p>
        <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            ['Date', 'Transaction date (various formats supported)'],
            ['Amount', 'Transaction amount (positive or negative)'],
            ['Description', 'Transaction description or merchant name'],
          ].map(([bold, rest]) => (
            <li key={bold} style={{ ...inkText, fontSize: '13px', color: '#3a2e22' }}>
              <strong>{bold}</strong>: {rest}
            </li>
          ))}
        </ul>
        <p style={{ ...inkText, fontSize: '13px', color: '#5a4832', margin: 0 }}>
          The system will automatically detect the format and categorize your transactions using AI.
        </p>
      </Section>

      {/* Tips grid */}
      <Section>
        <h3 style={{ ...inkText, fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>💡 Tips for Best Results</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {[
            ['Export from your bank', "Download transaction history directly from your bank's website"],
            ['Include all transactions', 'Upload at least 3 months of data for accurate predictions'],
            ['Check file format', 'Ensure your file is in CSV format, not Excel or PDF'],
            ['Review categories', 'After upload, review and correct any miscategorized transactions'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>✓</span>
              <div>
                <p style={{ ...inkText, fontWeight: 700, fontSize: '13px', margin: '0 0 3px' }}>{title}</p>
                <p style={{ ...inkText, fontSize: '12px', color: '#7a6248', margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default UploadPage;
