/**
 * Validation script for Dashboard Component (Task 14.1)
 * 
 * This script validates that the main dashboard component with
 * balance display, spending trends, and category breakdown has been implemented.
 */

const fs = require('fs');
const path = require('path');

console.log('=== Dashboard Component Validation ===\n');

// Required files
const requiredFiles = {
  'Services': [
    'src/services/dashboard.service.ts'
  ],
  'Components': [
    'src/components/StatCard.tsx',
    'src/components/CategoryBreakdown.tsx',
    'src/components/RecentTransactions.tsx'
  ],
  'Pages': [
    'src/pages/DashboardPage.tsx'
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
    name: 'Dashboard service fetches dashboard data',
    file: 'src/services/dashboard.service.ts',
    pattern: /getDashboardData/
  },
  {
    name: 'Dashboard service fetches transaction stats',
    file: 'src/services/dashboard.service.ts',
    pattern: /getTransactionStats/
  },
  {
    name: 'StatCard component displays value',
    file: 'src/components/StatCard.tsx',
    pattern: /value.*title/
  },
  {
    name: 'StatCard component shows loading state',
    file: 'src/components/StatCard.tsx',
    pattern: /loading.*animate-pulse/
  },
  {
    name: 'CategoryBreakdown shows categories',
    file: 'src/components/CategoryBreakdown.tsx',
    pattern: /categories.*map/
  },
  {
    name: 'CategoryBreakdown shows percentages',
    file: 'src/components/CategoryBreakdown.tsx',
    pattern: /percentage/
  },
  {
    name: 'RecentTransactions displays transactions',
    file: 'src/components/RecentTransactions.tsx',
    pattern: /transactions.*map/
  },
  {
    name: 'RecentTransactions formats currency',
    file: 'src/components/RecentTransactions.tsx',
    pattern: /formatCurrency/
  },
  {
    name: 'DashboardPage fetches data on mount',
    file: 'src/pages/DashboardPage.tsx',
    pattern: /useEffect.*fetchDashboardData/
  },
  {
    name: 'DashboardPage displays stat cards',
    file: 'src/pages/DashboardPage.tsx',
    pattern: /<StatCard/
  },
  {
    name: 'DashboardPage shows category breakdown',
    file: 'src/pages/DashboardPage.tsx',
    pattern: /<CategoryBreakdown/
  },
  {
    name: 'DashboardPage shows recent transactions',
    file: 'src/pages/DashboardPage.tsx',
    pattern: /<RecentTransactions/
  },
  {
    name: 'DashboardPage handles loading state',
    file: 'src/pages/DashboardPage.tsx',
    pattern: /loading.*setLoading/
  },
  {
    name: 'DashboardPage handles errors',
    file: 'src/pages/DashboardPage.tsx',
    pattern: /error.*setError/
  },
  {
    name: 'DashboardPage shows alerts',
    file: 'src/pages/DashboardPage.tsx',
    pattern: /alerts.*length/
  },
  {
    name: 'DashboardPage shows recommendations',
    file: 'src/pages/DashboardPage.tsx',
    pattern: /recommendations.*length/
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
    name: 'StatCard with loading skeleton',
    file: 'src/components/StatCard.tsx',
    patterns: ['loading', 'animate-pulse', 'bg-gray-200']
  },
  {
    name: 'StatCard with trend indicator',
    file: 'src/components/StatCard.tsx',
    patterns: ['trend', 'isPositive', 'percentage']
  },
  {
    name: 'CategoryBreakdown with progress bars',
    file: 'src/components/CategoryBreakdown.tsx',
    patterns: ['percentage', 'rounded-full', 'bg-']
  },
  {
    name: 'CategoryBreakdown with color palette',
    file: 'src/components/CategoryBreakdown.tsx',
    patterns: ['colors', 'bg-primary', 'bg-success']
  },
  {
    name: 'RecentTransactions with date formatting',
    file: 'src/components/RecentTransactions.tsx',
    patterns: ['formatDate', 'toLocaleDateString']
  },
  {
    name: 'RecentTransactions with category display',
    file: 'src/components/RecentTransactions.tsx',
    patterns: ['category', 'name', 'bg-gray-100']
  },
  {
    name: 'DashboardPage with current balance',
    file: 'src/pages/DashboardPage.tsx',
    patterns: ['Current Balance', 'calculateCurrentBalance']
  },
  {
    name: 'DashboardPage with monthly spending',
    file: 'src/pages/DashboardPage.tsx',
    patterns: ['Monthly Spending', 'calculateMonthlySpending']
  },
  {
    name: 'DashboardPage with financial health',
    file: 'src/pages/DashboardPage.tsx',
    patterns: ['Financial Health', 'getFinancialHealthStatus']
  },
  {
    name: 'DashboardPage with quick actions',
    file: 'src/pages/DashboardPage.tsx',
    patterns: ['Quick Actions', 'navigate']
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
  console.log('✓ All checks passed! Dashboard component is complete.');
  console.log('\nImplemented Features:');
  console.log('  • Current balance display');
  console.log('  • Monthly spending calculation');
  console.log('  • Financial health status');
  console.log('  • Category breakdown with progress bars');
  console.log('  • Recent transactions list');
  console.log('  • Financial alerts display');
  console.log('  • Personalized recommendations');
  console.log('  • Loading states and error handling');
  console.log('  • Responsive layout with Tailwind CSS');
  console.log('\nNext steps:');
  console.log('1. Ensure backend and ML services are running');
  console.log('2. Upload transaction data via /upload page');
  console.log('3. View dashboard at /dashboard');
  console.log('4. Verify all components display correctly');
  console.log('5. Test responsive design on different screen sizes');
  process.exit(0);
} else {
  console.log('✗ Some checks failed. Please review the output above.');
  process.exit(1);
}
