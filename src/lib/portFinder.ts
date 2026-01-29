/**
 * Port Finder Utility
 * Finds available ports, avoiding macOS conflicts (AirPlay, etc.)
 */

import * as net from 'net';

// Ports to avoid on macOS (used by system services)
const MACOS_RESERVED_PORTS = [
  3000,  // Often used by dev servers, can conflict
  5000,  // AirPlay Receiver (ControlCenter)
  7000,  // AirPlay Receiver alternate
];

/**
 * Check if a port is available
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, '0.0.0.0');
  });
}

/**
 * Find an available port starting from the preferred port
 * Will skip macOS reserved ports
 */
export async function findAvailablePort(
  preferredPort: number,
  maxAttempts: number = 10
): Promise<number> {
  let port = preferredPort;

  for (let i = 0; i < maxAttempts; i++) {
    // Skip macOS reserved ports
    while (MACOS_RESERVED_PORTS.includes(port)) {
      port++;
    }

    if (await isPortAvailable(port)) {
      return port;
    }

    port++;
  }

  throw new Error(`Could not find available port after ${maxAttempts} attempts starting from ${preferredPort}`);
}

/**
 * Find a pair of available consecutive ports (for HTTP + WebSocket)
 */
export async function findAvailablePortPair(
  preferredStartPort: number = 7100
): Promise<{ httpPort: number; wsPort: number }> {
  let port = preferredStartPort;

  for (let i = 0; i < 20; i++) {
    // Skip macOS reserved ports
    while (MACOS_RESERVED_PORTS.includes(port) || MACOS_RESERVED_PORTS.includes(port + 1)) {
      port++;
    }

    const httpAvailable = await isPortAvailable(port);
    const wsAvailable = await isPortAvailable(port + 1);

    if (httpAvailable && wsAvailable) {
      return { httpPort: port, wsPort: port + 1 };
    }

    port++;
  }

  throw new Error('Could not find available port pair');
}
