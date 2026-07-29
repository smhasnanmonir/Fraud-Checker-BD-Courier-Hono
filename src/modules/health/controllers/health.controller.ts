// ============================================================
// Health Controller
//   live   — liveness; always 200 if the process is alive.
//   ready  — readiness; 200 if at least one courier is configured, 503 otherwise.
// Distinguishing the two lets orchestrators restart the process
// (live) vs stop sending traffic (ready) independently.
// ============================================================

import { config } from '../../../config/index.js';

const APP_VERSION = '1.0.0';

interface LivenessResult {
  status: 'ok';
  timestamp: string;
  version: string;
  uptime: number;
}

interface DependencyStatus {
  configured: boolean;
}

interface ReadinessResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: Record<string, DependencyStatus>;
}

export function liveness(): LivenessResult {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: process.uptime(),
  };
}

export function readiness(): ReadinessResult {
  const dependencies = {
    steadfast: { configured: Boolean(config.steadfast.email && config.steadfast.password) },
    pathao: { configured: Boolean(config.pathao.username && config.pathao.password) },
    redx: { configured: Boolean(config.redx.phone && config.redx.password) },
    paperfly: { configured: Boolean(config.paperfly.username && config.paperfly.password) },
    carrybee: { configured: Boolean(config.carrybee.phone && config.carrybee.password) },
  };
  const configuredCount = Object.values(dependencies).filter((d) => d.configured).length;
  return {
    status: configuredCount > 0 ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: process.uptime(),
    dependencies,
  };
}
