// ============================================================
// Health Controller
// Simple health check endpoint
// ============================================================

interface HealthCheckResult {
  status: 'ok';
  timestamp: string;
  version: string;
  uptime: number;
}

export function healthCheck(): HealthCheckResult {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
  };
}
