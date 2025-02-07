import { NextResponse, NextRequest } from "next/server";
import { addStoryEvent, getStoryEvents } from "@/server/db/story/store";
import { StoryPhase } from "@/server/db/story/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<Response | NextResponse> {
  const roomId = params.roomId.toLowerCase().replace("#", "");
  const searchParams = new URL(request.url).searchParams;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

  try {
    const events = await getStoryEvents(roomId, limit);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching story events:', error);
    return NextResponse.json(
      { 
        error: "Failed to fetch story events",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<Response | NextResponse> {
  const roomId = params.roomId.toLowerCase().replace("#", "");
  
  try {
    const event: {
      phase: StoryPhase;
      type: 'phase_change' | 'point_discussed' | 'character_update';
      data: Record<string, any>;
    } = await request.json();
    
    await addStoryEvent(roomId, event);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding story event:', error);
    return NextResponse.json(
      { 
        error: "Failed to add story event",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 