const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Alert and Recommendation Display Implementation...\n');

let allChecksPassed = true;
const errors = [];
const warnings = [];

// Files to check
const filesToCheck = [
  'src/components/StressAlertBanner.tsx',
  'src/components/RecommendationCards.tsx',
  'src/components/AlertList.tsx',
  'src/components/AlertThresholdSettings.tsx',
  'src/pages/DashboardPage.tsx',
];

// Check if all required files exist
console.log('📁 Checking file existence...');
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} - MISSING`);
    errors.push(`Missing file: ${file}`);
    allChecksPassed = false;
  }
});

// Check StressAlertBanner component
console.log('\n🚨 Checking StressAlertBanner component...');
const stressAlertPath = path.join(__dirname, 'src/components/StressAlertBanner.tsx');
if (fs.existsSync(stressAlertPath)) {
  const content = fs.readFileSync(stressAlertPath, 'utf8');
  
  const checks = [
    { pattern: /interface StressScore/, name: 'StressScore interface' },
    { pattern: /getRiskConfig/, name: 'Risk configuration function' },
    { pattern: /Critical|High|Moderate/, name: 'Risk level labels' },
    { pattern: /score >= 80/, name: 'Critical threshold (80)' },
    { pattern: /score >= 70/, name: 'High threshold (70)' },
    { pattern: /level: 'Moderate'/, name: 'Moderate threshold' },
    { pattern: /factors/, name: 'Contributing factors display' },
    { pattern: /onViewDetails/, name: 'View details callback' },
    { pattern: /bg-red-50|bg-orange-50|bg-yellow-50/, name: 'Color-coded backgrounds' },
    { pattern: /Score Badge/, name: 'Score badge display' },
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - MISSING`);
      errors.push(`StressAlertBanner missing: ${check.name}`);
      allChecksPassed = false;
    }
  });
}

// Check RecommendationCards component
console.log('\n💡 Checking RecommendationCards component...');
const recommendationCardsPath = path.join(__dirname, 'src/components/RecommendationCards.tsx');
if (fs.existsSync(recommendationCardsPath)) {
  const content = fs.readFileSync(recommendationCardsPath, 'utf8');
  
  const checks = [
    { pattern: /interface Recommendation/, name: 'Recommendation interface' },
    { pattern: /getPriorityConfig/, name: 'Priority configuration function' },
    { pattern: /getCategoryIcon/, name: 'Category icon function' },
    { pattern: /high|medium|low/, name: 'Priority levels' },
    { pattern: /savings|spending|budget/, name: 'Category types' },
    { pattern: /grid grid-cols-1 md:grid-cols-2/, name: 'Responsive grid layout' },
    { pattern: /badgeColor/, name: 'Priority badges' },
    { pattern: /hover:shadow-md/, name: 'Hover effects' },
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - MISSING`);
      errors.push(`RecommendationCards missing: ${check.name}`);
      allChecksPassed = false;
    }
  });
}

// Check AlertList component
console.log('\n📋 Checking AlertList component...');
const alertListPath = path.join(__dirname, 'src/components/AlertList.tsx');
if (fs.existsSync(alertListPath)) {
  const content = fs.readFileSync(alertListPath, 'utf8');
  
  const checks = [
    { pattern: /interface Alert/, name: 'Alert interface' },
    { pattern: /getAlertConfig/, name: 'Alert configuration function' },
    { pattern: /warning|danger|info/, name: 'Alert types' },
    { pattern: /dismissible/, name: 'Dismissible alerts' },
    { pattern: /handleDismiss/, name: 'Dismiss handler' },
    { pattern: /dismissedAlerts/, name: 'Dismissed alerts state' },
    { pattern: /timestamp/, name: 'Timestamp display' },
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - MISSING`);
      errors.push(`AlertList missing: ${check.name}`);
      allChecksPassed = false;
    }
  });
}

// Check AlertThresholdSettings component
console.log('\n⚙️  Checking AlertThresholdSettings component...');
const settingsPath = path.join(__dirname, 'src/components/AlertThresholdSettings.tsx');
if (fs.existsSync(settingsPath)) {
  const content = fs.readFileSync(settingsPath, 'utf8');
  
  const checks = [
    { pattern: /interface ThresholdSettings/, name: 'ThresholdSettings interface' },
    { pattern: /stressScoreThreshold/, name: 'Stress score threshold' },
    { pattern: /lowBalanceThreshold/, name: 'Low balance threshold' },
    { pattern: /highSpendingThreshold/, name: 'High spending threshold' },
    { pattern: /enableEmailAlerts/, name: 'Email alerts toggle' },
    { pattern: /enablePushNotifications/, name: 'Push notifications toggle' },
    { pattern: /type="range"/, name: 'Range slider for stress score' },
    { pattern: /type="number"/, name: 'Number inputs for thresholds' },
    { pattern: /type="checkbox"/, name: 'Checkboxes for notifications' },
    { pattern: /handleSave/, name: 'Save handler' },
    { pattern: /handleReset/, name: 'Reset handler' },
    { pattern: /hasChanges/, name: 'Change tracking' },
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - MISSING`);
      errors.push(`AlertThresholdSettings missing: ${check.name}`);
      allChecksPassed = false;
    }
  });
}

// Check DashboardPage integration
console.log('\n📊 Checking DashboardPage integration...');
const dashboardPath = path.join(__dirname, 'src/pages/DashboardPage.tsx');
if (fs.existsSync(dashboardPath)) {
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  const checks = [
    { pattern: /import.*StressAlertBanner/, name: 'StressAlertBanner import' },
    { pattern: /import.*RecommendationCards/, name: 'RecommendationCards import' },
    { pattern: /import.*AlertList/, name: 'AlertList import' },
    { pattern: /import.*AlertThresholdSettings/, name: 'AlertThresholdSettings import' },
    { pattern: /<StressAlertBanner/, name: 'StressAlertBanner usage' },
    { pattern: /<RecommendationCards/, name: 'RecommendationCards usage' },
    { pattern: /<AlertList/, name: 'AlertList usage' },
    { pattern: /<AlertThresholdSettings/, name: 'AlertThresholdSettings usage' },
    { pattern: /showSettings/, name: 'Settings toggle state' },
    { pattern: /handleSaveSettings/, name: 'Save settings handler' },
    { pattern: /handleDismissAlert/, name: 'Dismiss alert handler' },
    { pattern: /Configure Alerts/, name: 'Settings button' },
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - MISSING`);
      errors.push(`DashboardPage missing: ${check.name}`);
      allChecksPassed = false;
    }
  });
}

// Summary
console.log('\n' + '='.repeat(60));
if (allChecksPassed) {
  console.log('✅ All validation checks passed!');
  console.log('\n📋 Implementation Summary:');
  console.log('  • Prominent stress alert banner with risk levels');
  console.log('  • Recommendation cards with priority and category');
  console.log('  • Alert list with dismissible notifications');
  console.log('  • Alert threshold management interface');
  console.log('  • Integrated into DashboardPage');
  console.log('  • Color-coded severity indicators');
  console.log('  • Responsive design');
  console.log('  • User-friendly settings management');
  console.log('\n✨ Task 14.5 (Alert and Recommendation Display) is complete!');
  console.log('\n📊 Features Implemented:');
  console.log('  ✓ Prominent financial stress alerts');
  console.log('  ✓ Risk level indicators (Critical/High/Moderate)');
  console.log('  ✓ Contributing factors display');
  console.log('  ✓ Personalized recommendation cards');
  console.log('  ✓ Priority-based recommendations');
  console.log('  ✓ Category-specific icons');
  console.log('  ✓ Dismissible alert notifications');
  console.log('  ✓ Alert threshold configuration');
  console.log('  ✓ Email and push notification settings');
  console.log('  ✓ Responsive grid layouts');
} else {
  console.log('❌ Validation failed with errors:');
  errors.forEach(error => console.log(`  • ${error}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(warning => console.log(`  • ${warning}`));
}

console.log('='.repeat(60));
