/**
 * Monitoring System Validation Script
 * 
 * Tests the comprehensive monitoring implementation including:
 * - API monitoring middleware
 * - Metrics collection
 * - Dashboard functionality
 * - Alert system
 * - WebSocket real-time updates
 */

const axios = require('axios');
const WebSocket = require('ws');
const { logger } = require('./src/config/logger');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const WS_URL = process.env.WS_URL || 'ws://localhost:5000';

class MonitoringValidator {
  constructor() {
    this.results = {
      apiMonitoring: { passed: 0, failed: 0, tests: [] },
      metricsCollection: { passed: 0, failed: 0, tests: [] },
      dashboard: { passed: 0, failed: 0, tests: [] },
      alerts: { passed: 0, failed: 0, tests: [] },
      websocket: { passed: 0, failed: 0, tests: [] }
    };
  }

  async runTest(category, testName, testFn) {
    try {
      console.log(`\n🧪 Testing ${category}: ${testName}`);
      const result = await testFn();
      
      this.results[category].passed++;
      this.results[category].tests.push({
        name: testName,
        status: 'PASSED',
        result
      });
      
      console.log(`✅ ${testName} - PASSED`);
      return result;
    } catch (error) {
      this.results[category].failed++;
      this.results[category].tests.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      return null;
    }
  }

  async validateAPIMonitoring() {
    console.log('\n📊 Validating API Monitoring...');

    // Test 1: Basic health check with monitoring
    await this.runTest('apiMonitoring', 'Health Check Monitoring', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      if (!response.data.status) {
        throw new Error('Health check response missing status');
      }
      
      return { status: response.data.status, timestamp: response.data.timestamp };
    });

    // Test 2: Generate multiple requests to test metrics collection
    await this.runTest('apiMonitoring', 'Multiple Request Metrics', async () => {
      const requests = [];
      
      // Generate 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        requests.push(axios.get(`${BASE_URL}/health`));
      }
      
      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;
      
      if (successCount !== 10) {
        throw new Error(`Expected 10 successful requests, got ${successCount}`);
      }
      
      return { requestCount: 10, successCount };
    });

    // Test 3: Test error handling monitoring
    await this.runTest('apiMonitoring', 'Error Request Monitoring', async () => {
      try {
        await axios.get(`${BASE_URL}/nonexistent-endpoint`);
        throw new Error('Expected 404 error');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          return { errorStatus: 404, monitored: true };
        }
        throw error;
      }
    });
  }

  async validateMetricsCollection() {
    console.log('\n📈 Validating Metrics Collection...');

    // Test 1: Get basic metrics
    await this.runTest('metricsCollection', 'Basic Metrics Retrieval', async () => {
      const response = await axios.get(`${BASE_URL}/api/monitoring/metrics`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      const metrics = response.data.data;
      
      // Validate metrics structure
      const requiredFields = ['requests', 'performance', 'errors', 'system'];
      for (const field of requiredFields) {
        if (!metrics[field]) {
          throw new Error(`Missing required metrics field: ${field}`);
        }
      }
      
      return {
        totalRequests: metrics.requests.total,
        averageResponseTime: metrics.performance.averageResponseTime,
        errorCount: metrics.errors.total
      };
    });

    // Test 2: Performance metrics
    await this.runTest('metricsCollection', 'Performance Metrics', async () => {
      const response = await axios.get(`${BASE_URL}/api/monitoring/performance`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      const performance = response.data.data;
      
      if (!performance.overall || !performance.endpoints) {
        throw new Error('Missing performance data structure');
      }
      
      return {
        averageResponseTime: performance.overall.averageResponseTime,
        p95ResponseTime: performance.overall.p95ResponseTime,
        endpointCount: Object.keys(performance.endpoints).length
      };
    });

    // Test 3: Error tracking
    await this.runTest('metricsCollection', 'Error Tracking', async () => {
      const response = await axios.get(`${BASE_URL}/api/monitoring/errors`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      const errors = response.data.data;
      
      if (!errors.recent || !errors.summary) {
        throw new Error('Missing error data structure');
      }
      
      return {
        totalErrors: errors.summary.total,
        recentErrorCount: errors.recent.length,
        errorTypes: Object.keys(errors.summary.byType || {}).length
      };
    });

    // Test 4: Prometheus format
    await this.runTest('metricsCollection', 'Prometheus Format', async () => {
      const response = await axios.get(`${BASE_URL}/api/monitoring/metrics?format=prometheus`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      const prometheusData = response.data;
      
      if (typeof prometheusData !== 'string') {
        throw new Error('Prometheus format should return string');
      }
      
      // Check for required Prometheus metrics
      const requiredMetrics = [
        'api_requests_total',
        'api_response_time_average',
        'system_memory_used_bytes'
      ];
      
      for (const metric of requiredMetrics) {
        if (!prometheusData.includes(metric)) {
          throw new Error(`Missing Prometheus metric: ${metric}`);
        }
      }
      
      return { format: 'prometheus', metricsFound: requiredMetrics.length };
    });
  }

  async validateDashboard() {
    console.log('\n📋 Validating Dashboard Functionality...');

    // Test 1: System status
    await this.runTest('dashboard', 'System Status', async () => {
      const response = await axios.get(`${BASE_URL}/api/monitoring/status`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      const status = response.data.data;
      
      const requiredSections = ['api', 'system', 'summary'];
      for (const section of requiredSections) {
        if (!status[section]) {
          throw new Error(`Missing status section: ${section}`);
        }
      }
      
      return {
        systemStatus: status.summary.status,
        totalRequests: status.summary.totalRequests,
        uptime: status.summary.uptime
      };
    });

    // Test 2: System information
    await this.runTest('dashboard', 'System Information', async () => {
      const response = await axios.get(`${BASE_URL}/api/monitoring/system`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      const system = response.data.data.system;
      
      const requiredFields = ['memory', 'uptime', 'nodeVersion', 'platform'];
      for (const field of requiredFields) {
        if (system[field] === undefined) {
          throw new Error(`Missing system field: ${field}`);
        }
      }
      
      return {
        memoryUsed: system.memory.used,
        uptime: system.uptime,
        platform: system.platform,
        nodeVersion: system.nodeVersion
      };
    });

    // Test 3: Report export
    await this.runTest('dashboard', 'Report Export', async () => {
      const response = await axios.get(`${BASE_URL}/api/monitoring/report`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      const report = response.data.data;
      
      const requiredSections = ['generatedAt', 'summary', 'metrics', 'system'];
      for (const section of requiredSections) {
        if (!report[section]) {
          throw new Error(`Missing report section: ${section}`);
        }
      }
      
      return {
        generatedAt: report.generatedAt,
        timeRange: report.timeRange,
        sectionsCount: Object.keys(report).length
      };
    });
  }

  async validateAlerts() {
    console.log('\n🚨 Validating Alert System...');

    // Test 1: Get alerts
    await this.runTest('alerts', 'Alert Retrieval', async () => {
      const response = await axios.get(`${BASE_URL}/api/monitoring/alerts`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      const alerts = response.data;
      
      if (!Array.isArray(alerts.data)) {
        throw new Error('Alerts data should be an array');
      }
      
      if (!alerts.summary) {
        throw new Error('Missing alerts summary');
      }
      
      return {
        totalAlerts: alerts.summary.total,
        activeAlerts: alerts.summary.active,
        alertsRetrieved: alerts.data.length
      };
    });

    // Test 2: Alert filtering
    await this.runTest('alerts', 'Alert Filtering', async () => {
      // Test active alerts filter
      const activeResponse = await axios.get(`${BASE_URL}/api/monitoring/alerts?active=true`);
      
      if (activeResponse.status !== 200) {
        throw new Error(`Expected status 200, got ${activeResponse.status}`);
      }
      
      const activeAlerts = activeResponse.data.data;
      const nonActiveAlerts = activeAlerts.filter(alert => !alert.active);
      
      if (nonActiveAlerts.length > 0) {
        throw new Error('Active filter returned non-active alerts');
      }
      
      return {
        activeAlertsCount: activeAlerts.length,
        filterWorking: true
      };
    });
  }

  async validateWebSocket() {
    console.log('\n🔌 Validating WebSocket Functionality...');

    return new Promise((resolve, reject) => {
      this.runTest('websocket', 'WebSocket Connection', async () => {
        return new Promise((wsResolve, wsReject) => {
          const ws = new WebSocket(`${WS_URL}/ws/monitoring`);
          let messageReceived = false;
          
          const timeout = setTimeout(() => {
            ws.close();
            if (!messageReceived) {
              wsReject(new Error('No initial message received within 5 seconds'));
            }
          }, 5000);
          
          ws.on('open', () => {
            console.log('WebSocket connection established');
          });
          
          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data);
              
              if (message.type === 'initial' && message.data) {
                messageReceived = true;
                clearTimeout(timeout);
                ws.close();
                
                wsResolve({
                  connected: true,
                  initialDataReceived: true,
                  messageType: message.type,
                  hasSystemData: !!message.data.system,
                  hasMetrics: !!message.data.api
                });
              }
            } catch (error) {
              clearTimeout(timeout);
              ws.close();
              wsReject(new Error(`Failed to parse WebSocket message: ${error.message}`));
            }
          });
          
          ws.on('error', (error) => {
            clearTimeout(timeout);
            wsReject(new Error(`WebSocket error: ${error.message}`));
          });
          
          ws.on('close', () => {
            clearTimeout(timeout);
            if (!messageReceived) {
              wsReject(new Error('WebSocket closed without receiving initial message'));
            }
          });
        });
      }).then(resolve).catch(reject);
    });
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MONITORING VALIDATION SUMMARY');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;

    Object.entries(this.results).forEach(([category, results]) => {
      const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`\n${categoryName}:`);
      console.log(`  ✅ Passed: ${results.passed}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      
      totalPassed += results.passed;
      totalFailed += results.failed;
      
      if (results.failed > 0) {
        console.log('  Failed tests:');
        results.tests
          .filter(test => test.status === 'FAILED')
          .forEach(test => {
            console.log(`    - ${test.name}: ${test.error}`);
          });
      }
    });

    console.log('\n' + '-'.repeat(40));
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

    const overallStatus = totalFailed === 0 ? 'SUCCESS' : 'PARTIAL';
    console.log(`\n🎯 Overall Status: ${overallStatus}`);
    
    if (overallStatus === 'SUCCESS') {
      console.log('\n🎉 All monitoring features are working correctly!');
      console.log('✨ The monitoring system is ready for production use.');
    } else {
      console.log('\n⚠️  Some monitoring features need attention.');
      console.log('🔧 Please review the failed tests above.');
    }
  }

  async run() {
    console.log('🚀 Starting Monitoring System Validation...');
    console.log(`📡 Testing against: ${BASE_URL}`);
    console.log(`🔌 WebSocket URL: ${WS_URL}/ws/monitoring`);

    try {
      // Wait a moment for server to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      await this.validateAPIMonitoring();
      await this.validateMetricsCollection();
      await this.validateDashboard();
      await this.validateAlerts();
      await this.validateWebSocket();

      this.printSummary();
      
      const totalTests = Object.values(this.results).reduce((sum, r) => sum + r.passed + r.failed, 0);
      const passedTests = Object.values(this.results).reduce((sum, r) => sum + r.passed, 0);
      
      return {
        success: passedTests === totalTests,
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: (passedTests / totalTests) * 100
      };
      
    } catch (error) {
      console.error('\n💥 Validation failed with error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new MonitoringValidator();
  
  validator.run()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

module.exports = MonitoringValidator;