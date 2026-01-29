import { NextResponse } from 'next/server';

/**
 * API route to provide port configuration to the frontend.
 * In development mode, returns the default ports.
 * In production (Electron), this route is handled by the static server.
 */
export async function GET() {
  // Default ports - in dev mode, we use the defaults
  // In production, the Electron static server intercepts this route
  return NextResponse.json({
    wsPort: 7101,
    httpPort: 7100,
    mode: 'development'
  });
}
