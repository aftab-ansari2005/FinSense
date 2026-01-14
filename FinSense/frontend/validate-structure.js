/**
 * Validation script for React Application Structure (Task 13.1)
 * 
 * This script validates that all required files and components are in place
 * for the React application structure implementation.
 */

const fs = require('fs');
const path = require('path');

console.log('=== React Application Structure Validation ===\n');

// Required files and directories
const requiredStructure = {
  'Types': [
    'src/types/auth.types.ts'
  ],
  'Services': [
    'src/services/api.service.ts',
    'src/services/auth.service.ts'
  ],
  'Contexts': [
    'src/contexts/AuthContext.tsx'
  ],
  'Components': [
    'src/components/Layout.tsx',
    'src/components/Navbar.tsx',
    'src/components/ProtectedRoute.tsx'
  ],
  'Pages': [
    'src/pages/HomePage.tsx',
    'src/pages/LoginPage.tsx',
    'src/pages/RegisterPage.tsx',
    'src/pages/DashboardPage.tsx',
    'src/pages/TransactionsPage.tsx',
    'src/pages/PredictionsPage.tsx',
    'src/pages/UploadPage.tsx'
  ],
  'Configuration': [
    'src/App.tsx',
    'src/index.tsx',
    'package.json',
    'tsconfig.json',
    'tailwind.config.js',
    '.env.example'
  ]
};

let allValid = true;

// Check each category
for (const [category, files] of Object.entries(requiredStructure)) {
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

// Check for key features in files
console.log('\n\nFeature Validation:');

const featureChecks = [
  {
    name: 'AuthContext exports useAuth hook',
    file: 'src/contexts/AuthContext.tsx',
    pattern: /export const useAuth/
  },
  {
    name: 'API service has token refresh interceptor',
    file: 'src/services/api.service.ts',
    pattern: /interceptors\.response/
  },
  {
    name: 'ProtectedRoute checks authentication',
    file: 'src/components/ProtectedRoute.tsx',
    pattern: /isAuthenticated/
  },
  {
    name: 'App.tsx has Router setup',
    file: 'src/App.tsx',
    pattern: /BrowserRouter|Router/
  },
  {
    name: 'App.tsx has protected routes',
    file: 'src/App.tsx',
    pattern: /ProtectedRoute/
  },
  {
    name: 'Navbar has responsive menu',
    file: 'src/components/Navbar.tsx',
    pattern: /isMobileMenuOpen/
  },
  {
    name: 'Auth types defined',
    file: 'src/types/auth.types.ts',
    pattern: /interface AuthContextType/
  },
  {
    name: 'Tailwind config has custom colors',
    file: 'tailwind.config.js',
    pattern: /primary:/
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

// Check package.json dependencies
console.log('\n\nDependency Validation:');

const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = [
    'react',
    'react-dom',
    'react-router-dom',
    'typescript',
    'tailwindcss',
    'axios'
  ];
  
  for (const dep of requiredDeps) {
    const hasInDeps = packageJson.dependencies && packageJson.dependencies[dep];
    const hasInDevDeps = packageJson.devDependencies && packageJson.devDependencies[dep];
    
    if (hasInDeps || hasInDevDeps) {
      const version = hasInDeps ? packageJson.dependencies[dep] : packageJson.devDependencies[dep];
      console.log(`  ✓ ${dep} (${version})`);
    } else {
      console.log(`  ✗ ${dep} - MISSING`);
      allValid = false;
    }
  }
}

// Summary
console.log('\n\n=== Validation Summary ===');
if (allValid) {
  console.log('✓ All checks passed! React application structure is complete.');
  console.log('\nNext steps:');
  console.log('1. Run "npm install" to install dependencies');
  console.log('2. Create .env file from .env.example');
  console.log('3. Run "npm start" to start the development server');
  console.log('4. Test authentication flow (register, login, protected routes)');
  console.log('5. Verify responsive design on different screen sizes');
  process.exit(0);
} else {
  console.log('✗ Some checks failed. Please review the output above.');
  process.exit(1);
}
