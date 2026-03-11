# FinSense Monitoring System

## Overview

The FinSense monitoring system provides comprehensive real-time monitoring, metrics collection, alerting, and performance tracking for the backend API. It includes enterprise-grade features like WebSocket real-time updates, Prometheus metrics export, and intelligent alerting.

## Architecture

### Core Components

1. **API Monitoring Service** (`src/services/apiMonitoring.js`)
   - Middleware-based request/response tracking
   - Performance metrics collection
   - Error tracking and categorization
   - Automatic metrics export

2. **Monitoring Dashboard** (`src/services/monitoringDashboard.js`)
   - Real-time WebSocket broadcasting
   - Alert management and thresholds
   - System health monitoring
   - Comprehensive status reporting

3. **Monitoring Routes** (`src/routes/monitoring.js`)
   - RESTful API endpoints for monitoring data
   - Authentication and authorization
   - Multiple export formats (JSON, Prometheus)

## Features

### 📊 Metrics Collection

- **Request Metrics**: Total, successful, failed requests by endpoint, method, user
- **Performance Metrics**: Response times, percentiles (P95, P99), slowest/fastest endpoints
- **Error Tracking**: Error counts by type, endpoint, recent error history
- **System Metrics**: Memory usage, CPU usage, uptime tracking

### 🚨 Intelligent Alerting

- **Configurable Thresholds**: Error rate, response time, memory usage, disk space, CPU usage
- **Alert Types**: Error, performance, system, service alerts
- **Alert Management**: Acknowledgment, filtering, history tracking
- **Real-time Notifications**: WebSocket broadcasting of alert updates

### 📈 Real-time Dashboard

- **WebSocket Support**: Live metrics updates every 10 seconds
- **Client Management**: Automatic connection handling and cleanup
- **Comprehensive Status**: API health, system metrics, ML service status
- **Historical Data**: Metrics history and trend analysis

### 🔧 Integration Features

- **Prometheus Export**: Standard metrics format for external monitoring tools
- **Circuit Breaker Integration**: ML service health monitoring
- **Service Discovery**: Multi-instance health tracking
- **Connection Pool Monitoring**: HTTP connection statistics

## API Endpoints

### Public Endpoints

- `GET /health` - Basic health check (no authentication required)

### Authenticated Endpoints

- `GET /api/monitoring/status` - Comprehensive system status
- `GET /api/monitoring/metrics` - API metrics (JSON/Prometheus formats)
- `GET /api/monitoring/performance` - Performance metrics and analysis
- `GET /api/monitoring/errors` - Error tracking and recent errors
- `GET /api/monitoring/alerts` - Alert management and history
- `GET /api/monitoring/system` - System information and resources
- `GET /api/monitoring/report` - Exportable monitoring reports

### Admin-only Endpoints

- `POST /api/monitoring/alerts/:alertId/acknowledge` - Acknowledge specific alert
- `PUT /api/monitoring/alerts/thresholds` - Update alert thresholds
- `POST /api/monitoring/metrics/reset` - Reset all metrics (admin only)

## WebSocket Real-time Updates

### Connection

```javascript
const ws = new WebSocket('ws://localhost:5000/ws/monitoring');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message.type, message.data);
});
```

### Message Types

- `initial` - Complete system status on connection
- `metrics-update` - Periodic metrics updates (every 10 seconds)
- `alerts` - Alert updates when alerts are triggered/resolved
- `alert-acknowledged` - Alert acknowledgment notifications
- `thresholds-updated` - Alert threshold changes

## Configuration

### Environment Variables

```bash
# Monitoring Configuration
LOG_LEVEL=info                    # Logging level
RATE_LIMIT_WINDOW_MS=900000      # Rate limiting window (15 minutes)
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window
NODE_ENV=development             # Environment mode
```

### Alert Thresholds (Default)

```javascript
{
  errorRate: 10,        // percentage
  responseTime: 5000,   // milliseconds
  memoryUsage: 500,     // MB
  diskSpace: 90,        // percentage
  cpuUsage: 80         // percentage
}
```

## Usage Examples

### Basic Health Check

```bash
curl http://localhost:5000/health
```

### Get Metrics (JSON)

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/monitoring/metrics
```

### Get Metrics (Prometheus Format)

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/monitoring/metrics?format=prometheus
```

### Get System Status

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/monitoring/status
```

### Update Alert Thresholds (Admin)

```bash
curl -X PUT \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{"errorRate": 15, "responseTime": 3000}' \
     http://localhost:5000/api/monitoring/alerts/thresholds
```

## Integration with External Tools

### Prometheus Integration

The monitoring system exports metrics in Prometheus format:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'finsense-backend'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/monitoring/metrics'
    params:
      format: ['prometheus']
```

### Grafana Dashboard

Use the Prometheus metrics to create Grafana dashboards:

- `api_requests_total` - Request volume
- `api_response_time_average` - Response time trends
- `api_errors_total` - Error rates
- `system_memory_used_bytes` - Memory usage
- `system_uptime_seconds` - System uptime

## Security Features

### Authentication & Authorization

- JWT token authentication for all monitoring endpoints
- Role-based access control (admin-only endpoints)
- Rate limiting per user
- PII sanitization in logs

### Data Privacy

- Automatic PII masking in logs (emails, phone numbers, SSNs, credit cards)
- Secure logging practices
- No sensitive data in metrics export

## Performance Considerations

### Memory Management

- Automatic cleanup of old metrics (keeps last 1000 response times)
- Periodic metrics export to files
- Efficient Map-based data structures
- WebSocket client cleanup

### Scalability

- Singleton pattern for service instances
- Efficient metric aggregation
- Configurable alert checking intervals
- Batch processing for large datasets

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check server is running on correct port
   - Verify WebSocket path: `/ws/monitoring`
   - Check firewall settings

2. **Metrics Not Updating**
   - Verify middleware is properly registered
   - Check for errors in server logs
   - Ensure requests are being processed

3. **Alerts Not Triggering**
   - Check alert thresholds configuration
   - Verify alert checking is running (30-second intervals)
   - Review system metrics vs thresholds

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

### Health Check Validation

Run the monitoring validation script:

```bash
node validate-monitoring.js
```

## Development

### Adding New Metrics

1. Extend `MetricsCollector` class in `apiMonitoring.js`
2. Update metrics structure in `getMetrics()` method
3. Add corresponding API endpoints in `monitoring.js`
4. Update Prometheus export format if needed

### Adding New Alerts

1. Add alert logic in `checkAlerts()` method in `monitoringDashboard.js`
2. Define alert thresholds in constructor
3. Update threshold validation in monitoring routes
4. Add alert type documentation

### Testing

```bash
# Run simple monitoring test
node test-monitoring-simple.js

# Run comprehensive validation
node validate-monitoring.js

# Run unit tests
npm test
```

## Production Deployment

### Recommendations

1. **External Monitoring**: Integrate with Prometheus + Grafana
2. **Log Aggregation**: Use ELK stack or similar for log analysis
3. **Alert Routing**: Configure alert notifications (email, Slack, PagerDuty)
4. **Backup**: Regular metrics export and backup
5. **Scaling**: Consider time-series database for historical data

### Performance Tuning

- Adjust alert checking intervals based on load
- Configure appropriate rate limits
- Set up log rotation
- Monitor memory usage and adjust cleanup intervals

## License

This monitoring system is part of the FinSense application and follows the same licensing terms.