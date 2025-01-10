import { createAdapter } from "@/server/db";

export async function GET() {
  try {
    // Test database connection
    const adapter = await createAdapter();
    await adapter.initialize();
    await adapter.close();
    
    return new Response(JSON.stringify({
      status: 'healthy',
      database: 'connected'
    }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 