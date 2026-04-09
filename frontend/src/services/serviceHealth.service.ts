import api from './api.service';

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastChecked: Date;
  responseTime?: number;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  services: ServiceStatus[];
  timestamp: Date;
}

class ServiceHealthService {
  private healthCache: SystemHealth | null = null;
  private cacheExpiry: number = 60000; // 1 minute
  private lastCheck: number = 0;

  /**
   * Check health of all services
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.healthCache && (now - this.lastCheck) < this.cacheExpiry) {
      return this.healthCache;
    }

    const services: ServiceStatus[] = [];

    // Check backend API
    const backendStatus = await this.checkBackendHealth();
    services.push(backendStatus);

    // Check ML service (through backend proxy)
    const mlStatus = await this.checkMLServiceHealth();
    services.push(mlStatus);

    // Determine overall health
    const downServices = services.filter(s => s.status === 'down').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'down';
    if (downServices > 0) {
      overall = downServices === services.length ? 'down' : 'degraded';
    } else if (degradedServices > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    this.healthCache = {
      overall,
      services,
      timestamp: new Date(),
    };
    this.lastCheck = now;

    return this.healthCache;
  }

  /**
   * Check backend API health
   */
  private async checkBackendHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      await api.get('/health', { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'Backend API',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        lastChecked: new Date(),
        responseTime,
      };
    } catch (error: any) {
      return {
        name: 'Backend API',
        status: 'down',
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Check ML service health (through backend)
   */
  private async checkMLServiceHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      await api.get('/ml/health', { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'ML Service',
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        lastChecked: new Date(),
        responseTime,
      };
    } catch (error: any) {
      return {
        name: 'ML Service',
        status: 'down',
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Check if a specific service is available
   */
  async isServiceAvailable(serviceName: string): Promise<boolean> {
    const health = await this.checkSystemHealth();
    const service = health.services.find(s => s.name === serviceName);
    return service ? service.status !== 'down' : false;
  }

  /**
   * Get cached health status without making new requests
   */
  getCachedHealth(): SystemHealth | null {
    return this.healthCache;
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache = null;
    this.lastCheck = 0;
  }
}

export const serviceHealthService = new ServiceHealthService();
export default serviceHealthService;
