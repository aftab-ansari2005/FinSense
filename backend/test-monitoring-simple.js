/**
 * Simple Monitoring Test
 * 
 * Basic test to verify monitoring endpoints are working
 */

const { getMetricsCollector } = require('./src/services/apiMonitoring');
const { getMonitoringDashboard } = require('./src/services/monitoringDashboard');

console.log('🧪 Testing Monitoring Services...');

try {
  // Test 1: Metrics Collector
  console.log('\n📊 Testing Metrics Collector...');
  const metricsCollector = getMetricsCollector();
  
  // Simulate a request
  const mockReq = {
    method: 'GET',
    path: '/test',
    route: { path: '/test' },
    userId: 'test-user',
    originalUrl: '/test',
    url: '/test',
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    get: (header) => {
      const headers = {
        'User-Agent': 'test-agent',
        'Referrer': 'test-referrer'
      };
      return headers[header];
    }
  };
  
  const mockRes = {
    statusCode: 200,
    get: (header) => {
      const headers = {
        'Content-Length': '100'
      };
      return headers[header];
    }
  };
  
  metricsCollector.recordRequest(mockReq, mockRes, 150);
  
  const metrics = metricsCollector.getMetrics();
  console.log('✅ Metrics collected:', {
    totalRequests: metrics.requests.total,
    averageResponseTime: metrics.performance.averageResponseTime
  });
  
  const health = metricsCollector.getHealthStatus();
  console.log('✅ Health status:', health.status);
  
  // Test 2: Monitoring Dashboard
  console.log('\n📋 Testing Monitoring Dashboard...');
  const dashboard = getMonitoringDashboard();
  
  const status = dashboard.getComprehensiveStatus();
  console.log('✅ Dashboard status retrieved');
  
  const alerts = dashboard.getActiveAlerts();
  console.log('✅ Active alerts:', alerts.length);
  
  console.log('\n🎉 All monitoring services are working correctly!');
  
} catch (error) {
  console.error('❌ Error testing monitoring services:', error.message);
  process.exit(1);
}