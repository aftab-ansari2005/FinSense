# File Upload Component - Task 13.2 Documentation

## Overview

This document describes the file upload component implementation for the FinSense Financial Health Prediction System. The component provides drag-and-drop CSV file upload functionality with validation, progress tracking, and error handling.

## Components Implemented

### 1. FileUpload Component (`src/components/FileUpload.tsx`)

A reusable file upload component with comprehensive features:

**Features:**
- Drag-and-drop file upload
- File browse button
- File type validation (CSV only)
- File size validation (configurable, default 10MB)
- Upload progress tracking with percentage
- Error handling and display
- File preview with size information
- Clear file functionality
- Visual feedback for drag states
- Disabled state during upload

**Props:**
```typescript
interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUpload: (file: File) => Promise<void>;
  accept?: string;              // Default: '.csv'
  maxSize?: number;             // In MB, default: 10
  isUploading?: boolean;
  progress?: UploadProgress;
  error?: string | null;
}
```

**Usage Example:**
```typescript
<FileUpload
  onFileSelect={handleFileSelect}
  onUpload={handleUpload}
  isUploading={isUploading}
  progress={uploadProgress}
  error={uploadError}
  maxSize={10}
/>
```

### 2. UploadPage Component (`src/pages/UploadPage.tsx`)

Complete upload page with:
- FileUpload component integration
- Upload state management
- Success/error feedback
- Automatic redirect to transactions page after success
- CSV format instructions
- Tips for best results
- Statistics display (processed count, errors)
- Warnings display

### 3. Transaction Service (`src/services/transaction.service.ts`)

API service for transaction operations:

**Methods:**
- `uploadCSV(file, onProgress)` - Upload and process CSV file
- `validateCSV(file)` - Validate CSV without processing
- `getTransactions(params)` - Get user transactions with filtering
- `getStats(startDate, endDate)` - Get transaction statistics

**Features:**
- FormData handling for file uploads
- Upload progress tracking
- Error handling
- TypeScript type safety

### 4. Type Definitions (`src/types/transaction.types.ts`)

TypeScript interfaces for:
- `Transaction` - Transaction data structure
- `UploadValidationResult` - Validation response
- `UploadResponse` - Upload success response
- `UploadProgress` - Progress tracking data

## User Flow

### Upload Process

1. **File Selection**
   - User drags file onto drop zone OR clicks "Browse Files"
   - Component validates file type (must be .csv)
   - Component validates file size (must be < 10MB)
   - File preview displayed with name and size

2. **Upload Initiation**
   - User clicks "Upload File" button
   - Component calls `onUpload` callback
   - UploadPage sends file to backend via transaction service

3. **Progress Tracking**
   - Progress bar shows upload percentage
   - "Uploading..." message displayed
   - Upload button disabled during upload

4. **Success Handling**
   - Success message displayed with green checkmark
   - Statistics shown (processed count, error count)
   - Warnings displayed if any
   - Automatic redirect to transactions page after 3 seconds

5. **Error Handling**
   - Error message displayed in red alert box
   - User can clear file and try again
   - Specific error messages for different failure types

## Validation

### Frontend Validation

**File Type:**
- Only .csv files accepted
- Checked by file extension
- Error: "Please upload a CSV file"

**File Size:**
- Maximum 10MB (configurable)
- Checked before upload
- Error: "File size must be less than 10MB"

### Backend Validation

The backend performs additional validation:
- CSV structure validation
- Column detection
- Data format validation
- Row count validation

## API Integration

### Upload Endpoint

```
POST /api/transactions/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'file' field
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "CSV file processed successfully",
  "data": {
    "importBatch": "batch-id",
    "processedCount": 150,
    "errorCount": 0,
    "validation": {
      "detectedFormat": "Standard CSV",
      "totalRows": 150,
      "fileSize": 45678,
      "warnings": []
    },
    "transactions": [...]
  }
}
```

**Error Response (400/500):**
```json
{
  "error": "Processing failed",
  "message": "Error description",
  "details": {
    "errors": [...],
    "warnings": [...]
  }
}
```

### Validate Endpoint

```
POST /api/transactions/validate
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'file' field
```

Used for validation without processing (future enhancement).

## Styling

### Tailwind CSS Classes

**Drag Zone States:**
- Default: `border-gray-300 bg-white`
- Dragging: `border-primary-500 bg-primary-50`
- Uploading: `opacity-50 cursor-not-allowed`

**Progress Bar:**
- Container: `bg-gray-200 rounded-full h-2`
- Fill: `bg-primary-600 h-2 rounded-full`
- Animated width transition

**Alert Boxes:**
- Success: `bg-success-50 border-success-500 text-success-700`
- Error: `bg-danger-50 border-danger-500 text-danger-700`
- Info: `bg-primary-50 border-primary-200 text-primary-700`

### Responsive Design

- Mobile-friendly drag zone
- Responsive grid layouts for tips
- Touch-friendly buttons
- Readable text sizes on all devices

## Error Handling

### Client-Side Errors

1. **Invalid File Type**
   - Detected: File extension check
   - Message: "Please upload a CSV file"
   - Action: File rejected, user can select another

2. **File Too Large**
   - Detected: File size check
   - Message: "File size must be less than 10MB"
   - Action: File rejected, user can select another

3. **Network Error**
   - Detected: Axios error without response
   - Message: "Failed to upload file. Please try again."
   - Action: User can retry upload

### Server-Side Errors

1. **Invalid CSV Format**
   - Status: 400
   - Message: From server response
   - Details: Validation errors and warnings
   - Action: User must fix CSV and retry

2. **Processing Error**
   - Status: 500
   - Message: "Internal server error during CSV processing"
   - Action: User can retry or contact support

## Accessibility

- Keyboard navigation support
- Focus states on interactive elements
- ARIA labels for screen readers (can be enhanced)
- Clear error messages
- Visual feedback for all states

## Performance Considerations

- File validation before upload (saves bandwidth)
- Progress tracking for user feedback
- Automatic cleanup of selected file after success
- Efficient FormData handling
- Debounced drag events (implicit in React)

## Security Considerations

- File type validation on frontend and backend
- File size limits to prevent DoS
- Authentication required for upload
- CSRF protection via JWT tokens
- No file content exposed in errors

## Testing Recommendations

### Manual Testing

1. **Drag and Drop**
   - [ ] Drag CSV file onto drop zone
   - [ ] Verify visual feedback during drag
   - [ ] Verify file is selected after drop
   - [ ] Try dragging non-CSV file (should work, validation happens after)

2. **File Browse**
   - [ ] Click "Browse Files" button
   - [ ] Select CSV file from dialog
   - [ ] Verify file is selected

3. **Validation**
   - [ ] Try uploading non-CSV file
   - [ ] Try uploading file > 10MB
   - [ ] Verify error messages display

4. **Upload**
   - [ ] Upload valid CSV file
   - [ ] Verify progress bar appears
   - [ ] Verify success message displays
   - [ ] Verify statistics are correct
   - [ ] Verify redirect to transactions page

5. **Error Handling**
   - [ ] Upload invalid CSV format
   - [ ] Test with backend offline
   - [ ] Verify error messages display
   - [ ] Verify can retry after error

6. **Clear Functionality**
   - [ ] Select file
   - [ ] Click "Clear" button
   - [ ] Verify file is removed
   - [ ] Verify can select new file

### Automated Testing (Future)

```typescript
// Example test cases
describe('FileUpload Component', () => {
  it('should accept CSV files via drag and drop');
  it('should reject non-CSV files');
  it('should reject files larger than maxSize');
  it('should show upload progress');
  it('should display errors');
  it('should call onUpload when upload button clicked');
  it('should clear file when clear button clicked');
});
```

## Future Enhancements

1. **Multiple File Upload**
   - Allow uploading multiple CSV files at once
   - Batch processing with individual progress

2. **File Preview**
   - Show first few rows of CSV before upload
   - Allow column mapping

3. **Validation Before Upload**
   - Use validate endpoint before full upload
   - Show validation results to user

4. **Drag and Drop Improvements**
   - Highlight specific drop zones
   - Show file count when multiple files dragged

5. **Progress Enhancements**
   - Show processing status after upload
   - Real-time categorization progress
   - Estimated time remaining

6. **Error Recovery**
   - Automatic retry on network errors
   - Resume interrupted uploads

7. **Accessibility**
   - Add ARIA labels
   - Improve keyboard navigation
   - Add screen reader announcements

## Troubleshooting

### Common Issues

1. **"Please upload a CSV file" error**
   - Ensure file has .csv extension
   - Check file is not corrupted
   - Try exporting CSV again from source

2. **"File size must be less than 10MB" error**
   - Reduce date range of export
   - Split large files into smaller chunks
   - Remove unnecessary columns

3. **Upload fails with no error message**
   - Check backend server is running
   - Check network connection
   - Check browser console for errors

4. **Progress bar stuck at 100%**
   - Backend is still processing
   - Wait for response
   - Check backend logs if timeout

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 1.1**: CSV file format validation
- **Requirement 1.4**: Descriptive error messages for invalid files
- **Requirement 4.1**: User interface for file upload

## Related Files

- `frontend/src/components/FileUpload.tsx` - Main upload component
- `frontend/src/pages/UploadPage.tsx` - Upload page
- `frontend/src/services/transaction.service.ts` - API service
- `frontend/src/types/transaction.types.ts` - Type definitions
- `backend/src/routes/transactions.js` - Backend upload endpoint
- `backend/src/services/csvService.js` - CSV processing service

## References

- [React File Upload Best Practices](https://react.dev/)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Axios Upload Progress](https://axios-http.com/docs/req_config)
