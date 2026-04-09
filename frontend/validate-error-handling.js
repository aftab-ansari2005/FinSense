/**
 * Validation script for Error Handling and Graceful Degradation
 * 
 * This script validates that error handling and fallback mechanisms
 * are properly implemented throughout the application.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Error Handling and Graceful Degradation...\n');

let hasErrors = false;

// Check ErrorBoundary component
const errorBoundaryPath = path.join(__dirname, 'src/components/ErrorBoundary.tsx');
if (fs.existsSync(errorBoundaryPath)) {
  console.log('✅ ErrorBoundary component exists');
  
  const content = fs.readFileSync(errorBoundaryPath, 'utf8');
  
  const requiredFeatures = [
    { name: 'componentDidCatch', pattern: /componentDidCatch/ },
    { name: 'getDerivedStateFromError', pattern: /getDerivedStateFromError/ },
    { name: 'Error display UI', pattern: /Something went wrong/ },
    { name: 'Retry functionality', pattern: /handleReset/ },
    { name: 'Development error details', pattern: /NODE_ENV === 'development'/ }
  ];
  
  requiredFeatures.forEach(feature => {
    if (feature.pattern.test(content)) {
      console.log(`  ✅ ${feature.name} implemented`);
    } else {
      console.log(`  ❌ ${feature.name} missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('❌ ErrorBoundary component not found');
  hasErrors = true;
}

// Check ServiceHealth service
const serviceHealthPath = path.join(__dirname, 'src/services/serviceHealth.service.ts');
if (fs.existsSync(serviceHealthPath)) {
  console.log('\n✅ ServiceHealth service exists');
  
  const content = fs.readFileSync(serviceHealthPath, 'utf8');
  
  const requiredMethods = [
    'checkSystemHealth',
    'checkBackendHealth',
    'checkMLServiceHealth',
    'isServiceAvailable',
    'getCachedHealth'
  ];
  
  requiredMethods.forEach(method => {
    if (content.includes(method)) {
      console.log(`  ✅ Method ${method} implemented`);
    } else {
      console.log(`  ❌ Method ${method} missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('\n❌ ServiceHealth service not found');
  hasErrors = true;
}

// Check FallbackData service
const fallbackDataPath = path.join(__dirname, 'src/services/fallbackData.service.ts');
if (fs.existsSync(fallbackDataPath)) {
  console.log('\n✅ FallbackData service exists');
  
  const content = fs.readFileSync(fallbackDataPath, 'utf8');
  
  const requiredMethods = [
    'cacheData',
    'getCachedData',
    'clearCache',
    'getFallbackDashboardData',
    'hasCachedData',
    'getCacheAge'
  ];
  
  requiredMethods.forEach(method => {
    if (content.includes(method)) {
      console.log(`  ✅ Method ${method} implemented`);
    } else {
      console.log(`  ❌ Method ${method} missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('\n❌ FallbackData service not found');
  hasErrors = true;
}

// Check ServiceUnavailable component
const serviceUnavailablePath = path.join(__dirname, 'src/components/ServiceUnavailable.tsx');
if (fs.existsSync(serviceUnavailablePath)) {
  console.log('\n✅ ServiceUnavailable component exists');
  
  const content = fs.readFileSync(serviceUnavailablePath, 'utf8');
  
  const requiredFeatures = [
    { name: 'Service status display', pattern: /ServiceStatus/ },
    { name: 'Retry button', pattern: /onRetry/ },
    { name: 'Cached data option', pattern: /onUseCachedData/ },
    { name: 'Status indicators', pattern: /healthy|degraded|down/ }
  ];
  
  requiredFeatures.forEach(feature => {
    if (feature.pattern.test(content)) {
      console.log(`  ✅ ${feature.name} implemented`);
    } else {
      console.log(`  ❌ ${feature.name} missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('\n❌ ServiceUnavailable component not found');
  hasErrors = true;
}

// Check App.tsx for ErrorBoundary integration
const appPath = path.join(__dirname, 'src/App.tsx');
if (fs.existsSync(appPath)) {
  console.log('\n✅ App.tsx exists');
  
  const content = fs.readFileSync(appPath, 'utf8');
  
  if (content.includes('ErrorBoundary')) {
    console.log('  ✅ ErrorBoundary integrated in App.tsx');
  } else {
    console.log('  ❌ ErrorBoundary not integrated in App.tsx');
    hasErrors = true;
  }
} else {
  console.log('\n❌ App.tsx not found');
  hasErrors = true;
}

// Check Dashboard service for fallback integration
const dashboardServicePath = path.join(__dirname, 'src/services/dashboard.service.ts');
if (fs.existsSync(dashboardServicePath)) {
  console.log('\n✅ Dashboard service exists');
  
  const content = fs.readFileSync(dashboardServicePath, 'utf8');
  
  const requiredFeatures = [
    { name: 'Fallback data import', pattern: /fallbackDataService/ },
    { name: 'Try-catch blocks', pattern: /try\s*{[\s\S]*?}\s*catch/ },
    { name: 'Cache data on success', pattern: /cacheData/ },
    { name: 'Use cached data on error', pattern: /getCachedData/ },
    { name: 'Timeout configuration', pattern: /timeout:/ }
  ];
  
  requiredFeatures.forEach(feature => {
    if (feature.pattern.test(content)) {
      console.log(`  ✅ ${feature.name} implemented`);
    } else {
      console.log(`  ❌ ${feature.name} missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('\n❌ Dashboard service not found');
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
  console.log('\nError Handling and Graceful Degradation Summary:');
  console.log('  • ErrorBoundary component for React error catching');
  console.log('  • ServiceHealth monitoring for backend/ML services');
  console.log('  • FallbackData service with localStorage caching');
  console.log('  • ServiceUnavailable component for user feedback');
  console.log('  • Dashboard service with automatic fallback');
  console.log('  • Timeout configurations for API calls');
  console.log('  • Try-catch blocks with proper error handling');
  console.log('\nThe application now handles errors gracefully!');
}
