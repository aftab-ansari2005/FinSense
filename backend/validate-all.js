const validateDataLayer = require('./validate-data-layer');
const validateCSVService = require('./validate-csv-service');

async function validateAll() {
  console.log('🚀 Starting comprehensive validation of FinSense data layer...\n');
  
  let allPassed = true;
  
  try {
    // Validate data layer (models, database)
    console.log('=' .repeat(60));
    console.log('🗄️  DATA LAYER VALIDATION');
    console.log('=' .repeat(60));
    
    const dataLayerPassed = await validateDataLayer();
    if (!dataLayerPassed) {
      allPassed = false;
      console.log('❌ Data layer validation failed');
    } else {
      console.log('✅ Data layer validation completed successfully');
    }
    
    // Validate CSV service
    console.log('\n' + '=' .repeat(60));
    console.log('📊 CSV SERVICE VALIDATION');
    console.log('=' .repeat(60));
    
    const csvServicePassed = await validateCSVService();
    if (!csvServicePassed) {
      allPassed = false;
      console.log('❌ CSV service validation failed');
    } else {
      console.log('✅ CSV service validation completed successfully');
    }
    
    // Final summary
    console.log('\n' + '=' .repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    
    if (allPassed) {
      console.log('🎉 ALL VALIDATIONS PASSED SUCCESSFULLY!');
      console.log('\n✅ Components validated:');
      console.log('  • MongoDB Models (User, Transaction, Prediction, FinancialStress, MLModelMetadata)');
      console.log('  • Database Connection & Queries');
      console.log('  • Model Relationships & Population');
      console.log('  • Authentication & Password Hashing');
      console.log('  • CSV Format Detection & Parsing');
      console.log('  • Data Validation & Error Handling');
      console.log('  • File Processing & Cleanup');
      console.log('\n🚀 The data layer is ready for the next implementation phase!');
    } else {
      console.log('❌ SOME VALIDATIONS FAILED');
      console.log('\n⚠️  Please review the error messages above and fix the issues before proceeding.');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('\n💥 Validation script encountered an error:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  validateAll()
    .then(success => {
      console.log(`\n🏁 Validation completed with ${success ? 'SUCCESS' : 'FAILURES'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation script error:', error);
      process.exit(1);
    });
}

module.exports = validateAll;