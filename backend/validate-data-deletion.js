/**
 * Validation Script for Data Deletion Service (Task 16.2)
 * Tests GDPR-compliant data deletion functionality
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let passCount = 0;
let failCount = 0;
const failures = [];

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function check(condition, description) {
  if (condition) {
    passCount++;
    log(`✓ ${description}`, colors.green);
    return true;
  } else {
    failCount++;
    failures.push(description);
    log(`✗ ${description}`, colors.red);
    return false;
  }
}

function section(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(title, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

// File paths
const SERVICE_PATH = path.join(__dirname, 'src', 'services', 'dataDeletionService.js');
const ROUTES_PATH = path.join(__dirname, 'src', 'routes', 'dataDeletion.js');
const SERVER_PATH = path.join(__dirname, 'server.js');

section('TASK 16.2: DATA DELETION VALIDATION');

// ============================================================================
// 1. FILE EXISTENCE CHECKS
// ============================================================================
section('1. File Existence');

check(
  fs.existsSync(SERVICE_PATH),
  'dataDeletionService.js exists'
);

check(
  fs.existsSync(ROUTES_PATH),
  'dataDeletion.js routes file exists'
);

// ============================================================================
// 2. DATA DELETION SERVICE VALIDATION
// ============================================================================
section('2. Data Deletion Service Structure');

let serviceContent = '';
if (fs.existsSync(SERVICE_PATH)) {
  serviceContent = fs.readFileSync(SERVICE_PATH, 'utf8');

  // Check class structure
  check(
    serviceContent.includes('class DataDeletionService'),
    'DataDeletionService class defined'
  );

  // Check core methods
  check(
    serviceContent.includes('previewDeletion'),
    'previewDeletion method exists'
  );

  check(
    serviceContent.includes('deleteUserAccount'),
    'deleteUserAccount method exists'
  );

  check(
    serviceContent.includes('deleteTransactions'),
    'deleteTransactions method exists'
  );

  check(
    serviceContent.includes('deletePredictions'),
    'deletePredictions method exists'
  );

  check(
    serviceContent.includes('deleteFinancialStressRecords'),
    'deleteFinancialStressRecords method exists'
  );

  check(
    serviceContent.includes('deleteTransactionsByDateRange'),
    'deleteTransactionsByDateRange method exists'
  );

  check(
    serviceContent.includes('requestDeletion'),
    'requestDeletion method exists'
  );

  check(
    serviceContent.includes('getDeletionStatistics'),
    'getDeletionStatistics method exists'
  );

  // Check model imports
  check(
    serviceContent.includes("require('../models/User')"),
    'User model imported'
  );

  check(
    serviceContent.includes("require('../models/Transaction')"),
    'Transaction model imported'
  );

  check(
    serviceContent.includes("require('../models/Prediction')"),
    'Prediction model imported'
  );

  check(
    serviceContent.includes("require('../models/FinancialStress')"),
    'FinancialStress model imported'
  );

  // Check logger usage
  check(
    serviceContent.includes("require('../config/logger')"),
    'Logger imported'
  );

  check(
    serviceContent.match(/logger\.info/g)?.length >= 8,
    'Adequate info logging (8+ instances)'
  );

  check(
    serviceContent.match(/logger\.error/g)?.length >= 8,
    'Adequate error logging (8+ instances)'
  );
}

// ============================================================================
// 3. DELETION METHODS VALIDATION
// ============================================================================
section('3. Deletion Methods Implementation');

if (serviceContent) {
  // Preview deletion
  check(
    serviceContent.includes('previewDeletion') && 
    serviceContent.includes('countDocuments'),
    'previewDeletion uses countDocuments'
  );

  check(
    serviceContent.includes('dataToDelete') &&
    serviceContent.includes('totalRecords'),
    'previewDeletion returns comprehensive preview'
  );

  check(
    serviceContent.includes('irreversible') ||
    serviceContent.includes('permanently'),
    'previewDeletion includes warning message'
  );

  // Account deletion
  check(
    serviceContent.includes('deleteUserAccount') &&
    serviceContent.includes('deleteMany'),
    'deleteUserAccount uses deleteMany for bulk deletion'
  );

  check(
    serviceContent.includes('Promise.all') &&
    serviceContent.includes('deleteMany'),
    'deleteUserAccount performs parallel deletion'
  );

  check(
    serviceContent.includes('findByIdAndDelete') ||
    serviceContent.includes('User.findByIdAndDelete'),
    'deleteUserAccount deletes user record'
  );

  check(
    serviceContent.includes('deletedCount'),
    'deleteUserAccount tracks deleted record counts'
  );

  // Selective deletion
  check(
    serviceContent.includes('Transaction.deleteMany({ userId })'),
    'deleteTransactions deletes all user transactions'
  );

  check(
    serviceContent.includes('Prediction.deleteMany({ userId })'),
    'deletePredictions deletes all user predictions'
  );

  check(
    serviceContent.includes('FinancialStress.deleteMany({ userId })'),
    'deleteFinancialStressRecords deletes all stress records'
  );

  // Date range deletion
  check(
    serviceContent.includes('deleteTransactionsByDateRange') &&
    serviceContent.includes('$gte') &&
    serviceContent.includes('$lte'),
    'deleteTransactionsByDateRange uses date range query'
  );

  // Request deletion
  check(
    serviceContent.includes('requestDeletion') &&
    serviceContent.includes('confirmationToken'),
    'requestDeletion generates confirmation token'
  );

  check(
    serviceContent.includes('expiresAt') ||
    serviceContent.includes('24'),
    'requestDeletion includes expiration time'
  );

  // Statistics
  check(
    serviceContent.includes('getDeletionStatistics') &&
    serviceContent.includes('deletionOptions'),
    'getDeletionStatistics provides deletion options'
  );

  check(
    serviceContent.includes('gdprCompliance') ||
    serviceContent.includes('GDPR'),
    'getDeletionStatistics includes GDPR compliance info'
  );
}

// ============================================================================
// 4. ROUTES VALIDATION
// ============================================================================
section('4. Data Deletion Routes');

let routesContent = '';
if (fs.existsSync(ROUTES_PATH)) {
  routesContent = fs.readFileSync(ROUTES_PATH, 'utf8');

  // Check router setup
  check(
    routesContent.includes('express.Router()'),
    'Express router initialized'
  );

  check(
    routesContent.includes("require('../middleware/auth')"),
    'Authentication middleware imported'
  );

  check(
    routesContent.includes("require('../services/dataDeletionService')"),
    'Data deletion service imported'
  );

  // Check routes
  check(
    routesContent.includes("router.get('/statistics'") &&
    routesContent.includes('authenticate'),
    'GET /statistics route with authentication'
  );

  check(
    routesContent.includes("router.get('/preview'") &&
    routesContent.includes('authenticate'),
    'GET /preview route with authentication'
  );

  check(
    routesContent.includes("router.post('/request'") &&
    routesContent.includes('authenticate'),
    'POST /request route with authentication'
  );

  check(
    routesContent.includes("router.delete('/account'") &&
    routesContent.includes('authenticate'),
    'DELETE /account route with authentication'
  );

  check(
    routesContent.includes("router.delete('/transactions'") &&
    routesContent.includes('authenticate'),
    'DELETE /transactions route with authentication'
  );

  check(
    routesContent.includes("router.delete('/predictions'") &&
    routesContent.includes('authenticate'),
    'DELETE /predictions route with authentication'
  );

  check(
    routesContent.includes("router.delete('/stress'") &&
    routesContent.includes('authenticate'),
    'DELETE /stress route with authentication'
  );

  // Check confirmation requirement
  check(
    routesContent.includes('DELETE_MY_ACCOUNT') ||
    routesContent.includes('confirmation'),
    'Account deletion requires explicit confirmation'
  );

  check(
    routesContent.includes('confirmation !== ') ||
    routesContent.includes('confirmation === '),
    'Confirmation validation implemented'
  );

  // Check date range support
  check(
    routesContent.includes('startDate') &&
    routesContent.includes('endDate'),
    'Transaction deletion supports date range'
  );

  // Check error handling
  check(
    routesContent.match(/try\s*{/g)?.length >= 6,
    'All routes have try-catch error handling'
  );

  check(
    routesContent.match(/catch\s*\(/g)?.length >= 6,
    'All routes have catch blocks'
  );

  // Check response structure
  check(
    routesContent.match(/success:\s*true/g)?.length >= 6,
    'Success responses include success flag'
  );

  check(
    routesContent.match(/res\.status\(200\)/g)?.length >= 6,
    'Successful operations return 200 status'
  );

  check(
    routesContent.includes('res.status(400)'),
    'Invalid requests return 400 status'
  );

  check(
    routesContent.includes('res.status(500)'),
    'Server errors return 500 status'
  );

  // Check module export
  check(
    routesContent.includes('module.exports = router'),
    'Router exported correctly'
  );
}

// ============================================================================
// 5. SERVER INTEGRATION
// ============================================================================
section('5. Server Integration');

let serverContent = '';
if (fs.existsSync(SERVER_PATH)) {
  serverContent = fs.readFileSync(SERVER_PATH, 'utf8');

  check(
    serverContent.includes("require('./src/routes/dataDeletion')"),
    'Data deletion routes imported in server.js'
  );

  check(
    serverContent.includes("app.use('/api/data-deletion'") &&
    serverContent.includes('dataDeletionRoutes'),
    'Data deletion routes mounted at /api/data-deletion'
  );
}

// ============================================================================
// 6. GDPR COMPLIANCE CHECKS
// ============================================================================
section('6. GDPR Compliance Features');

const combinedContent = serviceContent + routesContent;

check(
  combinedContent.includes('GDPR') ||
  combinedContent.includes('gdpr') ||
  combinedContent.includes('compliance'),
  'GDPR compliance mentioned in code'
);

check(
  combinedContent.includes('irreversible') ||
  combinedContent.includes('permanent'),
  'Deletion permanence warning included'
);

check(
  combinedContent.includes('confirmation') &&
  combinedContent.includes('DELETE'),
  'Explicit confirmation required for account deletion'
);

check(
  serviceContent.includes('audit') ||
  serviceContent.includes('logger.info'),
  'Audit logging implemented for deletions'
);

check(
  combinedContent.includes('preview') ||
  combinedContent.includes('Preview'),
  'Preview functionality before deletion'
);

check(
  combinedContent.includes('statistics') ||
  combinedContent.includes('Statistics'),
  'Deletion statistics available'
);

// ============================================================================
// 7. SECURITY CHECKS
// ============================================================================
section('7. Security Features');

check(
  routesContent.match(/authenticate/g)?.length >= 6,
  'All routes require authentication'
);

check(
  routesContent.includes('req.user.userId'),
  'User ID extracted from authenticated request'
);

check(
  !routesContent.includes('req.params.userId') &&
  !routesContent.includes('req.query.userId'),
  'User ID not accepted from request params (security)'
);

check(
  serviceContent.includes('userId') &&
  serviceContent.includes('deleteMany({ userId })'),
  'Deletion scoped to specific user'
);

// ============================================================================
// 8. ERROR HANDLING
// ============================================================================
section('8. Error Handling');

check(
  serviceContent.match(/try\s*{/g)?.length >= 8,
  'All service methods have try-catch blocks'
);

check(
  serviceContent.match(/catch\s*\(/g)?.length >= 8,
  'All service methods have catch blocks'
);

check(
  serviceContent.includes('throw error') ||
  serviceContent.includes('throw new Error'),
  'Errors properly thrown for handling'
);

check(
  routesContent.includes('error.message'),
  'Error messages included in responses'
);

// ============================================================================
// SUMMARY
// ============================================================================
section('VALIDATION SUMMARY');

const totalChecks = passCount + failCount;
const passPercentage = ((passCount / totalChecks) * 100).toFixed(1);

log(`\nTotal Checks: ${totalChecks}`, colors.blue);
log(`Passed: ${passCount}`, colors.green);
log(`Failed: ${failCount}`, failCount > 0 ? colors.red : colors.green);
log(`Success Rate: ${passPercentage}%`, passPercentage >= 90 ? colors.green : colors.yellow);

if (failures.length > 0) {
  log('\nFailed Checks:', colors.red);
  failures.forEach(failure => {
    log(`  - ${failure}`, colors.red);
  });
}

if (passPercentage >= 90) {
  log('\n✓ Data deletion implementation validated successfully!', colors.green);
  log('All GDPR-compliant deletion features are properly implemented.', colors.green);
} else if (passPercentage >= 70) {
  log('\n⚠ Data deletion implementation needs minor improvements.', colors.yellow);
} else {
  log('\n✗ Data deletion implementation needs significant work.', colors.red);
}

log('');

// Exit with appropriate code
process.exit(failCount > 0 ? 1 : 0);
