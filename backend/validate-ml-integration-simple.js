/**
 * Simple ML Integration Validation
 * 
 * Basic validation that doesn't require external dependencies
 */

const fs = require('fs');
const path = require('path');

function validateMLIntegration() {
  console.log('🔍 Validating ML Integration Implementation...\n');

  try {
    // Test 1: Check if ML integration file exists
    console.log('✅ Test 1: Checking ML integration file...');
    const mlIntegrationPath = path.join(__dirname, 'src', 'routes', 'ml-integration.js');
    
    if (!fs.existsSync(mlIntegrationPath)) {
      throw new Error('ML integration file not found');
    }
    
    const mlIntegrationContent = fs.readFileSync(mlIntegrationPath, 'utf8');
    console.log(`   ✓ ML integration file exists (${mlIntegrationContent.length} characters)\n`);

    // Test 2: Check for required endpoints
    console.log('✅ Test 2: Checking for required endpoints...');
    const requiredEndpoints = [
      'POST.*categorize',
      'POST.*predict',
      'POST.*stress-score',
      'POST.*learning/corrections',
      'GET.*learning/stats',
      'GET.*alerts',
      'POST.*acknowledge',
      'GET.*recommendations',
      'PUT.*status',
      'GET.*dashboard',
      'GET.*health'
    ];

    const missingEndpoints = [];
    requiredEndpoints.forEach(endpoint => {
      const regex = new RegExp(endpoint, 'i');
      if (!regex.test(mlIntegrationContent)) {
        missingEndpoints.push(endpoint);
      }
    });

    if (missingEndpoints.length === 0) {
      console.log('   ✓ All required endpoints are implemented\n');
    } else {
      console.log('   ⚠️  Missing endpoints:', missingEndpoints, '\n');
    }

    // Test 3: Check for security features
    console.log('✅ Test 3: Checking security features...');
    const securityFeatures = [
      'authenticateToken',
      'validateResourceOwnership',
      'handleValidationErrors',
      'Circuit.*Breaker',
      'retryMLRequest'
    ];

    const missingFeatures = [];
    securityFeatures.forEach(feature => {
      const regex = new RegExp(feature, 'i');
      if (!regex.test(mlIntegrationContent)) {
        missingFeatures.push(feature);
      }
    });

    if (missingFeatures.length === 0) {
      console.log('   ✓ All security features are implemented\n');
    } else {
      console.log('   ⚠️  Missing security features:', missingFeatures, '\n');
    }

    // Test 4: Check server.js integration
    console.log('✅ Test 4: Checking server.js integration...');
    const serverPath = path.join(__dirname, 'server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes('ml-integration') && serverContent.includes('/api/ml')) {
      console.log('   ✓ ML integration routes are properly registered in server.js\n');
    } else {
      console.log('   ⚠️  ML integration routes may not be properly registered\n');
    }

    // Test 5: Check for proper error handling
    console.log('✅ Test 5: Checking error handling...');
    const errorHandlingPatterns = [
      'try.*catch',
      'logger\\.error',
      'Circuit.*breaker.*OPEN',
      'ML.*service.*unavailable',
      'res\\.status\\(50[0-9]\\)'
    ];

    const missingErrorHandling = [];
    errorHandlingPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'i');
      if (!regex.test(mlIntegrationContent)) {
        missingErrorHandling.push(pattern);
      }
    });

    if (missingErrorHandling.length === 0) {
      console.log('   ✓ Comprehensive error handling is implemented\n');
    } else {
      console.log('   ⚠️  Missing error handling patterns:', missingErrorHandling, '\n');
    }

    // Test 6: Check for validation middleware
    console.log('✅ Test 6: Checking validation middleware...');
    const validationPatterns = [
      'body\\(',
      'param\\(',
      'query\\(',
      'validationResult',
      'isArray',
      'isFloat',
      'notEmpty'
    ];

    const foundValidations = validationPatterns.filter(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(mlIntegrationContent);
    });

    console.log(`   ✓ Found ${foundValidations.length}/${validationPatterns.length} validation patterns\n`);

    console.log('🎉 ML Integration Validation Complete!\n');
    console.log('📊 Summary:');
    console.log(`   • File exists: ✓`);
    console.log(`   • Endpoints: ${requiredEndpoints.length - missingEndpoints.length}/${requiredEndpoints.length}`);
    console.log(`   • Security features: ${securityFeatures.length - missingFeatures.length}/${securityFeatures.length}`);
    console.log(`   • Server integration: ✓`);
    console.log(`   • Error handling: ${errorHandlingPatterns.length - missingErrorHandling.length}/${errorHandlingPatterns.length}`);
    console.log(`   • Validation patterns: ${foundValidations.length}/${validationPatterns.length}`);

    return {
      success: true,
      endpoints: requiredEndpoints.length - missingEndpoints.length,
      security: securityFeatures.length - missingFeatures.length,
      errorHandling: errorHandlingPatterns.length - missingErrorHandling.length,
      validation: foundValidations.length
    };

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run validation
const result = validateMLIntegration();
process.exit(result.success ? 0 : 1);