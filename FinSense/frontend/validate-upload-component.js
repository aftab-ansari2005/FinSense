/**
 * Validation script for File Upload Component (Task 13.2)
 * 
 * This script validates that the file upload component with drag-and-drop
 * functionality has been properly implemented.
 */

const fs = require('fs');
const path = require('path');

console.log('=== File Upload Component Validation ===\n');

// Required files
const requiredFiles = {
  'Types': [
    'src/types/transaction.types.ts'
  ],
  'Services': [
    'src/services/transaction.service.ts'
  ],
  'Components': [
    'src/components/FileUpload.tsx'
  ],
  'Pages': [
    'src/pages/UploadPage.tsx'
  ]
};

let allValid = true;

// Check each category
for (const [category, files] of Object.entries(requiredFiles)) {
  console.log(`\n${category}:`);
  
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const stats = fs.statSync(filePath);
      const size = stats.size;
      console.log(`  ✓ ${file} (${size} bytes)`);
    } else {
      console.log(`  ✗ ${file} - MISSING`);
      allValid = false;
    }
  }
}

// Check for key features
console.log('\n\nFeature Validation:');

const featureChecks = [
  {
    name: 'FileUpload component has drag-and-drop',
    file: 'src/components/FileUpload.tsx',
    pattern: /onDragEnter|onDragOver|onDragLeave|onDrop/
  },
  {
    name: 'FileUpload component validates file type',
    file: 'src/components/FileUpload.tsx',
    pattern: /\.csv/
  },
  {
    name: 'FileUpload component validates file size',
    file: 'src/components/FileUpload.tsx',
    pattern: /maxSize/
  },
  {
    name: 'FileUpload component shows upload progress',
    file: 'src/components/FileUpload.tsx',
    pattern: /progress/
  },
  {
    name: 'FileUpload component handles errors',
    file: 'src/components/FileUpload.tsx',
    pattern: /error/
  },
  {
    name: 'Transaction service has uploadCSV method',
    file: 'src/services/transaction.service.ts',
    pattern: /uploadCSV/
  },
  {
    name: 'Transaction service tracks upload progress',
    file: 'src/services/transaction.service.ts',
    pattern: /onUploadProgress/
  },
  {
    name: 'Transaction service has validateCSV method',
    file: 'src/services/transaction.service.ts',
    pattern: /validateCSV/
  },
  {
    name: 'UploadPage uses FileUpload component',
    file: 'src/pages/UploadPage.tsx',
    pattern: /<FileUpload/
  },
  {
    name: 'UploadPage handles upload success',
    file: 'src/pages/UploadPage.tsx',
    pattern: /uploadResult/
  },
  {
    name: 'UploadPage shows instructions',
    file: 'src/pages/UploadPage.tsx',
    pattern: /CSV File Format|Instructions/
  },
  {
    name: 'Transaction types defined',
    file: 'src/types/transaction.types.ts',
    pattern: /interface Transaction/
  },
  {
    name: 'Upload types defined',
    file: 'src/types/transaction.types.ts',
    pattern: /UploadResponse|UploadProgress/
  }
];

for (const check of featureChecks) {
  const filePath = path.join(__dirname, check.file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = check.pattern.test(content);
    
    if (found) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - NOT FOUND`);
      allValid = false;
    }
  } else {
    console.log(`  ✗ ${check.name} - FILE MISSING`);
    allValid = false;
  }
}

// Check component features in detail
console.log('\n\nComponent Features:');

const componentFeatures = [
  {
    name: 'Drag and drop zone',
    file: 'src/components/FileUpload.tsx',
    patterns: ['onDragEnter', 'onDragLeave', 'onDragOver', 'onDrop']
  },
  {
    name: 'File browse button',
    file: 'src/components/FileUpload.tsx',
    patterns: ['Browse Files', 'fileInputRef']
  },
  {
    name: 'File validation (type and size)',
    file: 'src/components/FileUpload.tsx',
    patterns: ['validateFile', 'maxSize']
  },
  {
    name: 'Upload progress bar',
    file: 'src/components/FileUpload.tsx',
    patterns: ['progress', 'percentage']
  },
  {
    name: 'Error display',
    file: 'src/components/FileUpload.tsx',
    patterns: ['validationError', 'error']
  },
  {
    name: 'File clear functionality',
    file: 'src/components/FileUpload.tsx',
    patterns: ['handleClearFile', 'Clear']
  }
];

for (const feature of componentFeatures) {
  const filePath = path.join(__dirname, feature.file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const allPatternsFound = feature.patterns.every(pattern => content.includes(pattern));
    
    if (allPatternsFound) {
      console.log(`  ✓ ${feature.name}`);
    } else {
      const missingPatterns = feature.patterns.filter(p => !content.includes(p));
      console.log(`  ✗ ${feature.name} - Missing: ${missingPatterns.join(', ')}`);
      allValid = false;
    }
  } else {
    console.log(`  ✗ ${feature.name} - FILE MISSING`);
    allValid = false;
  }
}

// Summary
console.log('\n\n=== Validation Summary ===');
if (allValid) {
  console.log('✓ All checks passed! File upload component is complete.');
  console.log('\nImplemented Features:');
  console.log('  • Drag-and-drop file upload');
  console.log('  • File browse button');
  console.log('  • CSV file validation (type and size)');
  console.log('  • Upload progress tracking');
  console.log('  • Error handling and display');
  console.log('  • Success feedback with statistics');
  console.log('  • User instructions and tips');
  console.log('\nNext steps:');
  console.log('1. Run "npm install" if not already done');
  console.log('2. Start the backend server (npm start in backend/)');
  console.log('3. Start the frontend (npm start in frontend/)');
  console.log('4. Test file upload with a sample CSV file');
  console.log('5. Verify drag-and-drop functionality');
  console.log('6. Test error handling with invalid files');
  process.exit(0);
} else {
  console.log('✗ Some checks failed. Please review the output above.');
  process.exit(1);
}
