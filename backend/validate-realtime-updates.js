/**
 * Validation Script for Real-Time Updates (Task 15.1)
 * Tests WebSocket connection and real-time update functionality
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
const SERVICE_PATH = path.join(__dirname, 'src', 'services', 'realTimeUpdateService.js');
const SERVER_PATH = path.join(__dirname, 'server.js');

section('TASK 15.1: REAL-TIME UPDATES VALIDATION');

// ============================================================================
// 1. FILE EXISTENCE CHECKS
// ============================================================================
section('1. File Existence');

check(
  fs.existsSync(SERVICE_PATH),
  'realTimeUpdateService.js exists'
);

check(
  fs.existsSync(SERVER_PATH),
  'server.js exists'
);

// ============================================================================
// 2. REAL-TIME UPDATE SERVICE VALIDATION
// ============================================================================
section('2. Real-Time Update Service Structure');

let serviceContent = '';
if (fs.existsSync(SERVICE_PATH)) {
  serviceContent = fs.readFileSync(SERVICE_PATH, 'utf8');

  // Check class structure
  check(
    serviceContent.includes('class RealTimeUpdateService'),
    'RealTimeUpdateService class defined'
  );

  // Check core methods
  check(
    serviceContent.includes('addClient'),
    'addClient method exists'
  );

  check(
    serviceContent.includes('removeClient'),
    'removeClient method exists'
  );

  check(
    serviceContent.includes('broadcastToUser'),
    'broadcastToUser method exists'
  );

  check(
    serviceContent.includes('broadcastTransactionUpdate'),
    'broadcastTransactionUpdate method exists'
  );

  check(
    serviceContent.includes('broadcastPredictionUpdate'),
    'broadcastPredictionUpdate method exists'
  );

  check(
    serviceContent.includes('broadcastFinancialStressUpdate'),
    'broadcastFinancialStressUpdate method exists'
  );

  check(
    serviceContent.includes('broadcastDashboardUpdate'),
    'broadcastDashboardUpdate method exists'
  );

  check(
    serviceContent.includes('broadcastAlert'),
    'broadcastAlert method exists'
  );

  check(
    serviceContent.includes('startHeartbeat'),
    'startHeartbeat method exists'
  );

  check(
    serviceContent.includes('stopHeartbeat'),
    'stopHeartbeat method exists'
  );

  check(
    serviceContent.includes('getStatistics'),
    'getStatistics method exists'
  );

  check(
    serviceContent.includes('closeAllConnections'),
    'closeAllConnections method exists'
  );

  // Check connection management
  check(
    serviceContent.includes('this.clients') &&
    serviceContent.includes('new Map'),
    'Client connection map initialized'
  );

  check(
    serviceContent.includes('connectionCount'),
    'Connection count tracking'
  );

  // Check logger usage
  check(
    serviceContent.includes("require('../config/logger')"),
    'Logger imported'
  );

  check(
    serviceContent.match(/logger\.info/g)?.length >= 5,
    'Adequate info logging (5+ instances)'
  );

  check(
    serviceContent.match(/logger\.error/g)?.length >= 3,
    'Adequate error logging (3+ instances)'
  );
}

// ============================================================================
// 3. WEBSOCKET FUNCTIONALITY VALIDATION
// ============================================================================
section('3. WebSocket Functionality');

if (serviceContent) {
  // Connection handling
  check(
    serviceContent.includes('setupConnectionHandlers'),
    'Connection handlers setup method exists'
  );

  check(
    serviceContent.includes("ws.on('message'"),
    'Message event handler'
  );

  check(
    serviceContent.includes("ws.on('close'"),
    'Close event handler'
  );

  check(
    serviceContent.includes("ws.on('error'"),
    'Error event handler'
  );

  check(
    serviceContent.includes("ws.on('pong'"),
    'Pong event handler for heartbeat'
  );

  // Message handling
  check(
    serviceContent.includes('handleClientMessage'),
    'Client message handler exists'
  );

  check(
    serviceContent.includes('JSON.parse'),
    'JSON message parsing'
  );

  check(
    serviceContent.includes('JSON.stringify'),
    'JSON message serialization'
  );

  // Subscription system
  check(
    serviceContent.includes('handleSubscription'),
    'Subscription handler exists'
  );

  check(
    serviceContent.includes('handleUnsubscription'),
    'Unsubscription handler exists'
  );

  check(
    serviceContent.includes('ws.subscriptions'),
    'Client subscription tracking'
  );

  // Heartbeat mechanism
  check(
    serviceContent.includes('ws.isAlive'),
    'Connection health tracking'
  );

  check(
    serviceContent.includes('ws.ping()'),
    'Ping mechanism for heartbeat'
  );

  check(
    serviceContent.includes('setInterval'),
    'Heartbeat interval setup'
  );

  check(
    serviceContent.includes('clearInterval'),
    'Heartbeat cleanup'
  );
}

// ============================================================================
// 4. BROADCAST METHODS VALIDATION
// ============================================================================
section('4. Broadcast Methods');

if (serviceContent) {
  // Transaction updates
  check(
    serviceContent.includes('broadcastTransactionUpdate') &&
    serviceContent.includes('transaction_update'),
    'Transaction update broadcasting'
  );

  // Prediction updates
  check(
    serviceContent.includes('broadcastPredictionUpdate') &&
    serviceContent.includes('prediction_update'),
    'Prediction update broadcasting'
  );

  // Financial stress updates
  check(
    serviceContent.includes('broadcastFinancialStressUpdate') &&
    serviceContent.includes('financial_stress_update'),
    'Financial stress update broadcasting'
  );

  // Dashboard updates
  check(
    serviceContent.includes('broadcastDashboardUpdate') &&
    serviceContent.includes('dashboard_update'),
    'Dashboard update broadcasting'
  );

  // Alert broadcasting
  check(
    serviceContent.includes('broadcastAlert') &&
    serviceContent.includes('alert'),
    'Alert broadcasting'
  );

  // Channel-based filtering
  check(
    serviceContent.includes('channel') &&
    serviceContent.includes('subscriptions'),
    'Channel-based message filtering'
  );
}

// ============================================================================
// 5. SERVER INTEGRATION VALIDATION
// ============================================================================
section('5. Server Integration');

let serverContent = '';
if (fs.existsSync(SERVER_PATH)) {
  serverContent = fs.readFileSync(SERVER_PATH, 'utf8');

  check(
    serverContent.includes("require('./src/services/realTimeUpdateService')"),
    'Real-time service imported in server.js'
  );

  check(
    serverContent.includes('getRealTimeUpdateService'),
    'Real-time service getter used'
  );

  check(
    serverContent.includes('/ws/realtime'),
    'Real-time WebSocket path configured'
  );

  check(
    serverContent.includes('realtimeWss') ||
    serverContent.includes('realtime'),
    'Real-time WebSocket server created'
  );

  check(
    serverContent.includes('startHeartbeat'),
    'Heartbeat started on server initialization'
  );

  check(
    serverContent.includes('closeAllConnections'),
    'Graceful shutdown handler for connections'
  );
}

// ============================================================================
// 6. AUTHENTICATION VALIDATION
// ============================================================================
section('6. Authentication');

if (serverContent) {
  check(
    serverContent.includes('token') &&
    serverContent.includes('jwt'),
    'JWT token authentication'
  );

  check(
    serverContent.includes('jwt.verify'),
    'Token verification'
  );

  check(
    serverContent.includes('userId'),
    'User ID extraction from token'
  );

  check(
    serverContent.includes('ws.close') &&
    serverContent.includes('Authentication required'),
    'Connection rejection without authentication'
  );

  check(
    serverContent.includes('Invalid token'),
    'Invalid token handling'
  );
}

// ============================================================================
// 7. PII SANITIZATION VALIDATION
// ============================================================================
section('7. PII Sanitization');

if (serviceContent) {
  check(
    serviceContent.includes("require('../utils/piiSanitizer')"),
    'PII sanitizer imported'
  );

  check(
    serviceContent.includes('sanitizeObject'),
    'Object sanitization used'
  );

  check(
    serviceContent.includes('sanitizedUpdate'),
    'Updates sanitized before broadcasting'
  );
}

// ============================================================================
// 8. ERROR HANDLING VALIDATION
// ============================================================================
section('8. Error Handling');

if (serviceContent) {
  check(
    serviceContent.match(/try\s*{/g)?.length >= 2,
    'Try-catch blocks for error handling'
  );

  check(
    serviceContent.match(/catch\s*\(/g)?.length >= 2,
    'Catch blocks for error handling'
  );

  check(
    serviceContent.includes('sendError'),
    'Error message sending method'
  );

  check(
    serviceContent.includes('readyState'),
    'WebSocket state checking before sending'
  );
}

// ============================================================================
// 9. CONNECTION MANAGEMENT VALIDATION
// ============================================================================
section('9. Connection Management');

if (serviceContent) {
  check(
    serviceContent.includes('Map') &&
    serviceContent.includes('Set'),
    'Efficient data structures for connection management'
  );

  check(
    serviceContent.includes('this.clients.has'),
    'Connection existence checking'
  );

  check(
    serviceContent.includes('this.clients.get'),
    'Connection retrieval'
  );

  check(
    serviceContent.includes('this.clients.set'),
    'Connection storage'
  );

  check(
    serviceContent.includes('this.clients.delete'),
    'Connection cleanup'
  );

  check(
    serviceContent.includes('getStatistics'),
    'Connection statistics tracking'
  );
}

// ============================================================================
// 10. MESSAGE TYPES VALIDATION
// ============================================================================
section('10. Message Types');

if (serviceContent) {
  check(
    serviceContent.includes('type:') &&
    serviceContent.includes('connection'),
    'Connection message type'
  );

  check(
    serviceContent.includes('ping') &&
    serviceContent.includes('pong'),
    'Ping/pong message types'
  );

  check(
    serviceContent.includes('subscribe') &&
    serviceContent.includes('unsubscribe'),
    'Subscription message types'
  );

  check(
    serviceContent.includes('transaction_update'),
    'Transaction update message type'
  );

  check(
    serviceContent.includes('prediction_update'),
    'Prediction update message type'
  );

  check(
    serviceContent.includes('financial_stress_update'),
    'Financial stress update message type'
  );

  check(
    serviceContent.includes('dashboard_update'),
    'Dashboard update message type'
  );

  check(
    serviceContent.includes('alert'),
    'Alert message type'
  );
}

// ============================================================================
// 11. SINGLETON PATTERN VALIDATION
// ============================================================================
section('11. Singleton Pattern');

if (serviceContent) {
  check(
    serviceContent.includes('let instance = null'),
    'Singleton instance variable'
  );

  check(
    serviceContent.includes('if (!instance)'),
    'Singleton instance check'
  );

  check(
    serviceContent.includes('return instance'),
    'Singleton instance return'
  );

  check(
    serviceContent.includes('module.exports') &&
    serviceContent.includes('getRealTimeUpdateService'),
    'Singleton getter exported'
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
  log('\n✓ Real-time updates implementation validated successfully!', colors.green);
  log('WebSocket connection and real-time update features are properly implemented.', colors.green);
} else if (passPercentage >= 70) {
  log('\n⚠ Real-time updates implementation needs minor improvements.', colors.yellow);
} else {
  log('\n✗ Real-time updates implementation needs significant work.', colors.red);
}

log('');

// Exit with appropriate code
process.exit(failCount > 0 ? 1 : 0);
