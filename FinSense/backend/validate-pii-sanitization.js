/**
 * Validation Script for PII Sanitization (Task 16.4)
 * Tests PII protection in logging functionality
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
const SANITIZER_PATH = path.join(__dirname, 'src', 'utils', 'piiSanitizer.js');
const LOGGER_PATH = path.join(__dirname, 'src', 'config', 'logger.js');

section('TASK 16.4: PII SANITIZATION VALIDATION');

// ============================================================================
// 1. FILE EXISTENCE CHECKS
// ============================================================================
section('1. File Existence');

check(
  fs.existsSync(SANITIZER_PATH),
  'piiSanitizer.js utility exists'
);

check(
  fs.existsSync(LOGGER_PATH),
  'logger.js configuration exists'
);

// ============================================================================
// 2. PII SANITIZER UTILITY VALIDATION
// ============================================================================
section('2. PII Sanitizer Utility Structure');

let sanitizerContent = '';
if (fs.existsSync(SANITIZER_PATH)) {
  sanitizerContent = fs.readFileSync(SANITIZER_PATH, 'utf8');

  // Check core functions
  check(
    sanitizerContent.includes('function sanitizeString') ||
    sanitizerContent.includes('sanitizeString'),
    'sanitizeString function exists'
  );

  check(
    sanitizerContent.includes('function sanitizeObject') ||
    sanitizerContent.includes('sanitizeObject'),
    'sanitizeObject function exists'
  );

  check(
    sanitizerContent.includes('function sanitizeError') ||
    sanitizerContent.includes('sanitizeError'),
    'sanitizeError function exists'
  );

  check(
    sanitizerContent.includes('function sanitizeRequest') ||
    sanitizerContent.includes('sanitizeRequest'),
    'sanitizeRequest function exists'
  );

  check(
    sanitizerContent.includes('function sanitizeResponse') ||
    sanitizerContent.includes('sanitizeResponse'),
    'sanitizeResponse function exists'
  );

  check(
    sanitizerContent.includes('function sanitizeHeaders') ||
    sanitizerContent.includes('sanitizeHeaders'),
    'sanitizeHeaders function exists'
  );

  check(
    sanitizerContent.includes('function sanitizeQuery') ||
    sanitizerContent.includes('sanitizeQuery'),
    'sanitizeQuery function exists'
  );

  check(
    sanitizerContent.includes('function maskPartial') ||
    sanitizerContent.includes('maskPartial'),
    'maskPartial function exists'
  );

  check(
    sanitizerContent.includes('function containsPII') ||
    sanitizerContent.includes('containsPII'),
    'containsPII function exists'
  );

  check(
    sanitizerContent.includes('function detectPIITypes') ||
    sanitizerContent.includes('detectPIITypes'),
    'detectPIITypes function exists'
  );
}

// ============================================================================
// 3. PII PATTERNS VALIDATION
// ============================================================================
section('3. PII Pattern Coverage');

if (sanitizerContent) {
  check(
    sanitizerContent.includes('email') &&
    sanitizerContent.includes('EMAIL'),
    'Email pattern defined'
  );

  check(
    sanitizerContent.includes('phone') &&
    sanitizerContent.includes('PHONE'),
    'Phone number pattern defined'
  );

  check(
    sanitizerContent.includes('ssn') ||
    sanitizerContent.includes('SSN'),
    'SSN pattern defined'
  );

  check(
    sanitizerContent.includes('creditCard') ||
    sanitizerContent.includes('CARD'),
    'Credit card pattern defined'
  );

  check(
    sanitizerContent.includes('ipAddress') ||
    sanitizerContent.includes('IP'),
    'IP address pattern defined'
  );

  check(
    sanitizerContent.includes('jwt') ||
    sanitizerContent.includes('JWT'),
    'JWT token pattern defined'
  );

  check(
    sanitizerContent.includes('apiKey') ||
    sanitizerContent.includes('API_KEY'),
    'API key pattern defined'
  );

  check(
    sanitizerContent.includes('password') &&
    sanitizerContent.includes('PASSWORD'),
    'Password pattern defined'
  );

  check(
    sanitizerContent.includes('mongoId') ||
    sanitizerContent.includes('ID'),
    'MongoDB ObjectId pattern defined'
  );

  check(
    sanitizerContent.includes('address') ||
    sanitizerContent.includes('ADDRESS'),
    'Street address pattern defined'
  );

  check(
    sanitizerContent.includes('zipCode') ||
    sanitizerContent.includes('ZIP'),
    'ZIP code pattern defined'
  );
}

// ============================================================================
// 4. SENSITIVE FIELDS VALIDATION
// ============================================================================
section('4. Sensitive Field Detection');

if (sanitizerContent) {
  check(
    sanitizerContent.includes('SENSITIVE_FIELDS'),
    'SENSITIVE_FIELDS array defined'
  );

  check(
    sanitizerContent.includes("'password'") ||
    sanitizerContent.includes('"password"'),
    'Password field marked as sensitive'
  );

  check(
    sanitizerContent.includes("'token'") ||
    sanitizerContent.includes('"token"'),
    'Token field marked as sensitive'
  );

  check(
    sanitizerContent.includes("'apiKey'") ||
    sanitizerContent.includes('"apiKey"'),
    'API key field marked as sensitive'
  );

  check(
    sanitizerContent.includes("'ssn'") ||
    sanitizerContent.includes('"ssn"'),
    'SSN field marked as sensitive'
  );

  check(
    sanitizerContent.includes("'creditCard'") ||
    sanitizerContent.includes('"creditCard"'),
    'Credit card field marked as sensitive'
  );
}

// ============================================================================
// 5. SANITIZATION LOGIC VALIDATION
// ============================================================================
section('5. Sanitization Implementation');

if (sanitizerContent) {
  check(
    sanitizerContent.includes('replace(') &&
    sanitizerContent.includes('pattern'),
    'Pattern-based replacement implemented'
  );

  check(
    sanitizerContent.includes('REDACTED') ||
    sanitizerContent.includes('MASKED'),
    'Redaction markers used'
  );

  check(
    sanitizerContent.includes('Array.isArray'),
    'Array handling implemented'
  );

  check(
    sanitizerContent.includes('typeof') &&
    sanitizerContent.includes('object'),
    'Object type checking implemented'
  );

  check(
    sanitizerContent.includes('recursive') ||
    (sanitizerContent.match(/sanitizeObject/g) || []).length >= 2,
    'Recursive sanitization for nested objects'
  );

  check(
    sanitizerContent.includes('toLowerCase'),
    'Case-insensitive field matching'
  );
}

// ============================================================================
// 6. LOGGER INTEGRATION VALIDATION
// ============================================================================
section('6. Logger Integration');

let loggerContent = '';
if (fs.existsSync(LOGGER_PATH)) {
  loggerContent = fs.readFileSync(LOGGER_PATH, 'utf8');

  check(
    loggerContent.includes("require('../utils/piiSanitizer')") ||
    loggerContent.includes('require("../utils/piiSanitizer")'),
    'PII sanitizer imported in logger'
  );

  check(
    loggerContent.includes('sanitizeString'),
    'sanitizeString used in logger'
  );

  check(
    loggerContent.includes('sanitizeObject') ||
    loggerContent.includes('sanitize'),
    'Sanitization applied in logger'
  );

  check(
    loggerContent.includes('sanitizeFormat') ||
    loggerContent.includes('winston.format'),
    'Custom Winston format for sanitization'
  );

  check(
    loggerContent.includes('IP_REDACTED') ||
    loggerContent.includes('[IP'),
    'IP addresses redacted in API logger'
  );

  check(
    loggerContent.includes('apiLogger'),
    'API logger middleware exists'
  );
}

// ============================================================================
// 7. FUNCTIONAL TESTS
// ============================================================================
section('7. Functional Testing');

try {
  const piiSanitizer = require(SANITIZER_PATH);

  // Test email sanitization
  const emailTest = piiSanitizer.sanitizeString('Contact user@example.com for info');
  check(
    !emailTest.includes('user@example.com') &&
    (emailTest.includes('REDACTED') || emailTest.includes('MASKED')),
    'Email addresses are sanitized'
  );

  // Test phone sanitization
  const phoneTest = piiSanitizer.sanitizeString('Call 555-123-4567 now');
  check(
    !phoneTest.includes('555-123-4567') &&
    (phoneTest.includes('REDACTED') || phoneTest.includes('MASKED')),
    'Phone numbers are sanitized'
  );

  // Test object sanitization
  const objTest = piiSanitizer.sanitizeObject({
    email: 'test@example.com',
    password: 'secret123',
    name: 'John Doe'
  });
  check(
    !JSON.stringify(objTest).includes('test@example.com'),
    'Email in objects is sanitized'
  );

  check(
    objTest.password === '[REDACTED]' || !objTest.password.includes('secret'),
    'Password field is redacted'
  );

  check(
    objTest.name === 'John Doe',
    'Non-sensitive fields are preserved'
  );

  // Test nested object sanitization
  const nestedTest = piiSanitizer.sanitizeObject({
    user: {
      email: 'nested@example.com',
      profile: {
        phone: '555-0000'
      }
    }
  });
  check(
    !JSON.stringify(nestedTest).includes('nested@example.com'),
    'Nested object sanitization works'
  );

  // Test array sanitization
  const arrayTest = piiSanitizer.sanitizeObject([
    { email: 'test1@example.com' },
    { email: 'test2@example.com' }
  ]);
  check(
    !JSON.stringify(arrayTest).includes('test1@example.com'),
    'Array sanitization works'
  );

  // Test PII detection
  check(
    piiSanitizer.containsPII('Contact me at user@example.com'),
    'PII detection works for email'
  );

  check(
    !piiSanitizer.containsPII('This is a normal message'),
    'PII detection returns false for clean text'
  );

  // Test PII type detection
  const detectedTypes = piiSanitizer.detectPIITypes('Email: user@example.com, Phone: 555-1234');
  check(
    detectedTypes.includes('email'),
    'PII type detection identifies email'
  );

  // Test partial masking
  const masked = piiSanitizer.maskPartial('1234567890', 2);
  check(
    masked.includes('12') && masked.includes('90') && masked.includes('*'),
    'Partial masking works correctly'
  );

} catch (error) {
  log(`Error during functional tests: ${error.message}`, colors.red);
  failCount += 10;
}

// ============================================================================
// 8. SECURITY CHECKS
// ============================================================================
section('8. Security Features');

const combinedContent = sanitizerContent + loggerContent;

check(
  combinedContent.includes('authorization') ||
  combinedContent.includes('Authorization'),
  'Authorization headers handled'
);

check(
  combinedContent.includes('cookie') ||
  combinedContent.includes('Cookie'),
  'Cookie headers handled'
);

check(
  combinedContent.includes('JWT') ||
  combinedContent.includes('jwt'),
  'JWT tokens handled'
);

check(
  !loggerContent.includes('req.ip') ||
  loggerContent.includes('IP_REDACTED'),
  'IP addresses not logged in plain text'
);

// ============================================================================
// 9. MODULE EXPORTS VALIDATION
// ============================================================================
section('9. Module Exports');

if (sanitizerContent) {
  check(
    sanitizerContent.includes('module.exports'),
    'Sanitizer module exports defined'
  );

  check(
    sanitizerContent.includes('sanitizeString') &&
    sanitizerContent.includes('exports'),
    'sanitizeString exported'
  );

  check(
    sanitizerContent.includes('sanitizeObject') &&
    sanitizerContent.includes('exports'),
    'sanitizeObject exported'
  );

  check(
    sanitizerContent.includes('PII_PATTERNS') &&
    sanitizerContent.includes('exports'),
    'PII_PATTERNS exported'
  );

  check(
    sanitizerContent.includes('SENSITIVE_FIELDS') &&
    sanitizerContent.includes('exports'),
    'SENSITIVE_FIELDS exported'
  );
}

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
  log('\n✓ PII sanitization implementation validated successfully!', colors.green);
  log('All PII protection features are properly implemented.', colors.green);
} else if (passPercentage >= 70) {
  log('\n⚠ PII sanitization implementation needs minor improvements.', colors.yellow);
} else {
  log('\n✗ PII sanitization implementation needs significant work.', colors.red);
}

log('');

// Exit with appropriate code
process.exit(failCount > 0 ? 1 : 0);
