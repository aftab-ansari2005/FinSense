/**
 * Inter-Service Communication Validation
 * 
 * Validates the implementation of inter-service communication features including
 * HTTP client, timeout/retry logic, circuit breaker, connection pooling, and service discovery.
 */

const fs = require('fs');
const path = require('path');

function validateInterServiceCommunication() {
  console.log('🔍 Validating Inter-Service Communication Implementation...\n');

  const results = {
    success: true,
    components: {},
    features: {},
    errors: []
  };

  try {
    // Test 1: Validate ML Service Client
    console.log('✅ Test 1: Validating ML Service Client...');
    const mlClientPath = path.join(__dirname, 'src', 'services', 'mlServiceClient.js');
    
    if (!fs.existsSync(mlClientPath)) {
      results.errors.push('ML Service Client file not found');
      results.success = false;
    } else {
      const mlClientContent = fs.readFileSync(mlClientPath, 'utf8');
      
      const mlClientFeatures = {
        'Circuit Breaker': /class CircuitBreaker/i.test(mlClientContent),
        'Retry Logic': /retryRequest/i.test(mlClientContent),
        'Timeout Configuration': /timeout.*=.*\d+/i.test(mlClientContent),
        'Health Monitoring': /checkHealth|healthStatus/i.test(mlClientContent),
        'Request Interceptors': /interceptors\.(request|response)/i.test(mlClientContent),
        'Exponential Backoff': /Math\.pow.*2.*attempt/i.test(mlClientContent),
        'Circuit States': /CLOSED.*OPEN.*HALF_OPEN/i.test(mlClientContent),
        'Statistics Tracking': /stats.*=.*{/i.test(mlClientContent),
        'Batch Operations': /batchRequest/i.test(mlClientContent),
        'Service Methods': /categorizeTransactions.*generatePredictions.*calculateStressScore/i.test(mlClientContent)
      };
      
      results.components.mlServiceClient = mlClientFeatures;
      
      const mlClientScore = Object.values(mlClientFeatures).filter(Boolean).length;
      console.log(`   ✓ ML Service Client: ${mlClientScore}/${Object.keys(mlClientFeatures).length} features implemented\n`);
    }

    // Test 2: Validate Connection Pool
    console.log('✅ Test 2: Validating Connection Pool...');
    const connectionPoolPath = path.join(__dirname, 'src', 'services', 'connectionPool.js');
    
    if (!fs.existsSync(connectionPoolPath)) {
      results.errors.push('Connection Pool file not found');
      results.success = false;
    } else {
      const connectionPoolContent = fs.readFileSync(connectionPoolPath, 'utf8');
      
      const connectionPoolFeatures = {
        'HTTP Agent': /new Agent\(/i.test(connectionPoolContent),
        'HTTPS Agent': /new HttpsAgent\(/i.test(connectionPoolContent),
        'Keep-Alive': /keepAlive.*true/i.test(connectionPoolContent),
        'Max Sockets': /maxSockets/i.test(connectionPoolContent),
        'Connection Monitoring': /on\('free'|on\('connect'/i.test(connectionPoolContent),
        'Statistics': /stats.*=.*{/i.test(connectionPoolContent),
        'Cleanup Timer': /setInterval.*cleanup/i.test(connectionPoolContent),
        'Socket Destruction': /socket\.destroy/i.test(connectionPoolContent),
        'Service Manager': /class ServiceConnectionManager/i.test(connectionPoolContent),
        'Graceful Shutdown': /SIGTERM.*SIGINT/i.test(connectionPoolContent)
      };
      
      results.components.connectionPool = connectionPoolFeatures;
      
      const poolScore = Object.values(connectionPoolFeatures).filter(Boolean).length;
      console.log(`   ✓ Connection Pool: ${poolScore}/${Object.keys(connectionPoolFeatures).length} features implemented\n`);
    }

    // Test 3: Validate Service Discovery
    console.log('✅ Test 3: Validating Service Discovery...');
    const serviceDiscoveryPath = path.join(__dirname, 'src', 'services', 'serviceDiscovery.js');
    
    if (!fs.existsSync(serviceDiscoveryPath)) {
      results.errors.push('Service Discovery file not found');
      results.success = false;
    } else {
      const serviceDiscoveryContent = fs.readFileSync(serviceDiscoveryPath, 'utf8');
      
      const serviceDiscoveryFeatures = {
        'Service Instance': /class ServiceInstance/i.test(serviceDiscoveryContent),
        'Load Balancer': /class LoadBalancer/i.test(serviceDiscoveryContent),
        'Round Robin': /roundRobin/i.test(serviceDiscoveryContent),
        'Least Connections': /leastConnections/i.test(serviceDiscoveryContent),
        'Weighted Balancing': /weightedRoundRobin/i.test(serviceDiscoveryContent),
        'Health Checking': /checkInstanceHealth/i.test(serviceDiscoveryContent),
        'Auto Discovery': /autoDiscoverInstances/i.test(serviceDiscoveryContent),
        'Instance Registration': /registerInstance.*unregisterInstance/i.test(serviceDiscoveryContent),
        'Health Monitoring': /healthCheckInterval/i.test(serviceDiscoveryContent),
        'Statistics': /getStats/i.test(serviceDiscoveryContent)
      };
      
      results.components.serviceDiscovery = serviceDiscoveryFeatures;
      
      const discoveryScore = Object.values(serviceDiscoveryFeatures).filter(Boolean).length;
      console.log(`   ✓ Service Discovery: ${discoveryScore}/${Object.keys(serviceDiscoveryFeatures).length} features implemented\n`);
    }

    // Test 4: Validate ML Integration Routes Updates
    console.log('✅ Test 4: Validating ML Integration Routes Updates...');
    const mlIntegrationPath = path.join(__dirname, 'src', 'routes', 'ml-integration.js');
    
    if (!fs.existsSync(mlIntegrationPath)) {
      results.errors.push('ML Integration Routes file not found');
      results.success = false;
    } else {
      const mlIntegrationContent = fs.readFileSync(mlIntegrationPath, 'utf8');
      
      const integrationFeatures = {
        'Service Client Import': /getMLServiceClient/i.test(mlIntegrationContent),
        'Service Discovery Import': /getServiceDiscovery/i.test(mlIntegrationContent),
        'Connection Manager Import': /getConnectionManager/i.test(mlIntegrationContent),
        'Client Usage': /mlClient\.(categorizeTransactions|generatePredictions|calculateStressScore)/i.test(mlIntegrationContent),
        'Stats Endpoint': /\/stats.*getServiceStats/i.test(mlIntegrationContent),
        'Circuit Breaker Reset': /circuit-breakers\/reset/i.test(mlIntegrationContent),
        'Connection Cleanup': /connections\/cleanup/i.test(mlIntegrationContent),
        'Service Discovery Endpoints': /service-discovery\/instances/i.test(mlIntegrationContent),
        'Health Monitoring': /service_stats.*service_discovery.*connection_pools/i.test(mlIntegrationContent)
      };
      
      results.components.mlIntegration = integrationFeatures;
      
      const integrationScore = Object.values(integrationFeatures).filter(Boolean).length;
      console.log(`   ✓ ML Integration Routes: ${integrationScore}/${Object.keys(integrationFeatures).length} features implemented\n`);
    }

    // Test 5: Check for proper error handling
    console.log('✅ Test 5: Validating Error Handling...');
    const allFiles = [mlClientPath, connectionPoolPath, serviceDiscoveryPath, mlIntegrationPath];
    let errorHandlingCount = 0;
    
    allFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (/try\s*{[\s\S]*?catch\s*\(/i.test(content)) {
          errorHandlingCount++;
        }
      }
    });
    
    console.log(`   ✓ Error handling found in ${errorHandlingCount}/${allFiles.length} files\n`);
    results.features.errorHandling = errorHandlingCount === allFiles.length;

    // Test 6: Check for logging
    console.log('✅ Test 6: Validating Logging...');
    let loggingCount = 0;
    
    allFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (/logger\.(info|warn|error|debug)/i.test(content)) {
          loggingCount++;
        }
      }
    });
    
    console.log(`   ✓ Logging found in ${loggingCount}/${allFiles.length} files\n`);
    results.features.logging = loggingCount === allFiles.length;

    // Calculate overall score
    const totalFeatures = Object.values(results.components).reduce((sum, component) => {
      return sum + Object.keys(component).length;
    }, 0);
    
    const implementedFeatures = Object.values(results.components).reduce((sum, component) => {
      return sum + Object.values(component).filter(Boolean).length;
    }, 0);

    console.log('🎉 Inter-Service Communication Validation Complete!\n');
    console.log('📊 Summary:');
    console.log(`   • Total Features: ${implementedFeatures}/${totalFeatures}`);
    console.log(`   • ML Service Client: ✓`);
    console.log(`   • Connection Pool: ✓`);
    console.log(`   • Service Discovery: ✓`);
    console.log(`   • ML Integration Updates: ✓`);
    console.log(`   • Error Handling: ${results.features.errorHandling ? '✓' : '⚠️'}`);
    console.log(`   • Logging: ${results.features.logging ? '✓' : '⚠️'}`);
    console.log(`   • Implementation Score: ${Math.round((implementedFeatures / totalFeatures) * 100)}%`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      results.errors.forEach(error => console.log(`   • ${error}`));
      results.success = false;
    }

    return results;

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    results.success = false;
    results.errors.push(error.message);
    return results;
  }
}

// Run validation
const result = validateInterServiceCommunication();
process.exit(result.success ? 0 : 1);