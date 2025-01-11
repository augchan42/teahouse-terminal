import { NextResponse } from 'next/server';

export async function GET() {
  if (!global.wss) {
    return NextResponse.json({ 
      status: 'error',
      message: 'WebSocket server not initialized'
    }, { status: 500 });
  }

  try {
    const address = global.wss.address();
    return NextResponse.json({ 
      status: 'ok',
      address,
      connections: global.wss.clients.size
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 