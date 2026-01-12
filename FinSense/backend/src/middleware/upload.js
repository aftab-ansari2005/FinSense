const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logger } = require('../config/logger');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific subdirectory
    const userUploadDir = path.join(uploadDir, req.userId ? req.userId.toString() : 'anonymous');
    
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }
    
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}_${randomString}${extension}`;
    
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel' // Some systems send CSV as Excel MIME type
  ];
  
  const allowedExtensions = ['.csv', '.txt'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only CSV files are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only allow one file at a time
  }
});

/**
 * Middleware for single file upload
 */
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                error: 'File too large',
                message: `File size exceeds ${(parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024) / 1024 / 1024}MB limit`
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                error: 'Too many files',
                message: 'Only one file is allowed per upload'
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                error: 'Unexpected field',
                message: `Expected field name: ${fieldName}`
              });
            default:
              return res.status(400).json({
                error: 'Upload error',
                message: err.message
              });
          }
        }
        
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: 'Invalid file type',
            message: err.message
          });
        }
        
        return res.status(500).json({
          error: 'Upload failed',
          message: 'Internal server error'
        });
      }
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a file to upload'
        });
      }
      
      // Log successful upload
      logger.info('File uploaded successfully', {
        userId: req.userId,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      
      next();
    });
  };
};

/**
 * Middleware for multiple file upload
 */
const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        logger.error('Multiple file upload error:', err);
        
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                error: 'File too large',
                message: `One or more files exceed ${(parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024) / 1024 / 1024}MB limit`
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                error: 'Too many files',
                message: `Maximum ${maxCount} files allowed per upload`
              });
            default:
              return res.status(400).json({
                error: 'Upload error',
                message: err.message
              });
          }
        }
        
        return res.status(500).json({
          error: 'Upload failed',
          message: 'Internal server error'
        });
      }
      
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: 'Please select files to upload'
        });
      }
      
      // Log successful uploads
      logger.info('Multiple files uploaded successfully', {
        userId: req.userId,
        fileCount: req.files.length,
        files: req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          size: file.size
        }))
      });
      
      next();
    });
  };
};

/**
 * Middleware to clean up uploaded files on error
 */
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Check if this is an error response
    if (res.statusCode >= 400) {
      // Clean up uploaded files
      const filesToClean = [];
      
      if (req.file) {
        filesToClean.push(req.file.path);
      }
      
      if (req.files && Array.isArray(req.files)) {
        filesToClean.push(...req.files.map(file => file.path));
      }
      
      // Clean up files asynchronously
      filesToClean.forEach(filePath => {
        fs.unlink(filePath, (err) => {
          if (err && err.code !== 'ENOENT') {
            logger.error('Error cleaning up file:', { filePath, error: err.message });
          } else {
            logger.info('Cleaned up file after error:', { filePath });
          }
        });
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware to validate file content after upload
 */
const validateUploadedFile = (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    // Check if file exists and is readable
    if (!fs.existsSync(req.file.path)) {
      return res.status(500).json({
        error: 'Upload failed',
        message: 'Uploaded file not found'
      });
    }
    
    // Check file size matches what multer reported
    const stats = fs.statSync(req.file.path);
    if (stats.size !== req.file.size) {
      return res.status(500).json({
        error: 'Upload failed',
        message: 'File size mismatch'
      });
    }
    
    // Add file stats to request
    req.fileStats = {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
    
    next();
  } catch (error) {
    logger.error('File validation error:', error);
    res.status(500).json({
      error: 'Upload validation failed',
      message: 'Unable to validate uploaded file'
    });
  }
};

/**
 * Get upload statistics for user
 */
const getUploadStats = async (userId) => {
  try {
    const userUploadDir = path.join(uploadDir, userId.toString());
    
    if (!fs.existsSync(userUploadDir)) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null
      };
    }
    
    const files = fs.readdirSync(userUploadDir);
    let totalSize = 0;
    let oldestFile = null;
    let newestFile = null;
    
    files.forEach(filename => {
      const filePath = path.join(userUploadDir, filename);
      const stats = fs.statSync(filePath);
      
      totalSize += stats.size;
      
      if (!oldestFile || stats.birthtime < oldestFile.created) {
        oldestFile = { filename, created: stats.birthtime, size: stats.size };
      }
      
      if (!newestFile || stats.birthtime > newestFile.created) {
        newestFile = { filename, created: stats.birthtime, size: stats.size };
      }
    });
    
    return {
      totalFiles: files.length,
      totalSize,
      oldestFile,
      newestFile
    };
  } catch (error) {
    logger.error('Error getting upload stats:', error);
    throw error;
  }
};

/**
 * Clean up old uploaded files
 */
const cleanupOldFiles = async (userId, maxAge = 24 * 60 * 60 * 1000) => { // 24 hours default
  try {
    const userUploadDir = path.join(uploadDir, userId.toString());
    
    if (!fs.existsSync(userUploadDir)) {
      return { cleaned: 0, errors: 0 };
    }
    
    const files = fs.readdirSync(userUploadDir);
    const now = Date.now();
    let cleaned = 0;
    let errors = 0;
    
    for (const filename of files) {
      try {
        const filePath = path.join(userUploadDir, filename);
        const stats = fs.statSync(filePath);
        
        if (now - stats.birthtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
          logger.info('Cleaned up old file:', { filePath, age: now - stats.birthtime.getTime() });
        }
      } catch (error) {
        errors++;
        logger.error('Error cleaning up file:', { filename, error: error.message });
      }
    }
    
    return { cleaned, errors };
  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  cleanupOnError,
  validateUploadedFile,
  getUploadStats,
  cleanupOldFiles
};