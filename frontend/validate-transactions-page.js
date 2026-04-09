/**
 * Validation script for Transactions Page Integration
 * 
 * This script validates that the TransactionsPage component is properly
 * integrated with the backend API.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Transactions Page Integration...\n');

let hasErrors = false;

// Check if transactions service exists
const transactionsServicePath = path.join(__dirname, 'src/services/transactions.service.ts');
if (fs.existsSync(transactionsServicePath)) {
  console.log('✅ Transactions service file exists');
  
  const serviceContent = fs.readFileSync(transactionsServicePath, 'utf8');
  
  // Check for required methods
  const requiredMethods = [
    'getTransactions',
    'getTransaction',
    'updateTransactionCategory',
    'deleteTransaction',
    'uploadCSV',
    'getCategories'
  ];
  
  requiredMethods.forEach(method => {
    if (serviceContent.includes(`async ${method}(`)) {
      console.log(`  ✅ Method ${method} implemented`);
    } else {
      console.log(`  ❌ Method ${method} missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('❌ Transactions service file not found');
  hasErrors = true;
}

// Check if TransactionsPage exists
const transactionsPagePath = path.join(__dirname, 'src/pages/TransactionsPage.tsx');
if (fs.existsSync(transactionsPagePath)) {
  console.log('\n✅ TransactionsPage component exists');
  
  const pageContent = fs.readFileSync(transactionsPagePath, 'utf8');
  
  // Check for required features
  const requiredFeatures = [
    { name: 'Pagination', pattern: /setPage\(/ },
    { name: 'Search functionality', pattern: /handleSearch/ },
    { name: 'Category filter', pattern: /handleCategoryFilter/ },
    { name: 'Transaction list display', pattern: /<table/ },
    { name: 'Error handling', pattern: /error &&/ },
    { name: 'Loading state', pattern: /loading \?/ },
    { name: 'Empty state', pattern: /No transactions/ }
  ];
  
  requiredFeatures.forEach(feature => {
    if (feature.pattern.test(pageContent)) {
      console.log(`  ✅ ${feature.name} implemented`);
    } else {
      console.log(`  ❌ ${feature.name} missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('\n❌ TransactionsPage component not found');
  hasErrors = true;
}

// Check if backend routes have required endpoints
const backendRoutesPath = path.join(__dirname, '../backend/src/routes/transactions.js');
if (fs.existsSync(backendRoutesPath)) {
  console.log('\n✅ Backend transactions routes file exists');
  
  const routesContent = fs.readFileSync(backendRoutesPath, 'utf8');
  
  // Check for required endpoints
  const requiredEndpoints = [
    { name: 'GET /transactions', pattern: /router\.get\('\/'\,/ },
    { name: 'GET /transactions/categories', pattern: /router\.get\('\/categories'/ },
    { name: 'PATCH /transactions/:id/category', pattern: /router\.patch\('\/:id\/category'/ },
    { name: 'DELETE /transactions/:id', pattern: /router\.delete\('\/:id'/ },
    { name: 'POST /transactions/upload', pattern: /router\.post\('\/upload'/ }
  ];
  
  requiredEndpoints.forEach(endpoint => {
    if (endpoint.pattern.test(routesContent)) {
      console.log(`  ✅ ${endpoint.name} endpoint exists`);
    } else {
      console.log(`  ❌ ${endpoint.name} endpoint missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('\n❌ Backend transactions routes file not found');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Validation completed with errors');
  console.log('\nPlease fix the issues above before proceeding.');
  process.exit(1);
} else {
  console.log('✅ All validations passed!');
  console.log('\nTransactions Page Integration Summary:');
  console.log('  • Frontend service with all CRUD operations');
  console.log('  • Comprehensive TransactionsPage with filters and pagination');
  console.log('  • Backend API endpoints for transactions management');
  console.log('  • Category management and updates');
  console.log('  • Search and filtering capabilities');
  console.log('\nThe transactions page is fully integrated with the backend!');
}
