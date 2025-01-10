import { NextResponse } from 'next/server';
import { WebSocketServer } from 'ws';

declare global {
  var wss: WebSocketServer | undefined;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let wss: WebSocketServer;

if (!global.wss) {
  wss = new WebSocketServer({ port: 3001 });
  global.wss = wss;
}

export async function GET(request: Request) {
  return new NextResponse('WebSocket server is running', {
    status: 200,
  });
} 