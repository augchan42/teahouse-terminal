import { NextResponse, NextRequest } from "next/server";
import { createStoryState, getStoryState, updateStoryState } from "@/server/db/story/store";
import { StoryState } from "@/server/db/story/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<Response | NextResponse> {
  const roomId = params.roomId.toLowerCase().replace("#", "");

  try {
    const state = await getStoryState(roomId);
    
    if (!state) {
      return NextResponse.json(
        { error: "Story state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ state });
  } catch (error) {
    console.error('Error fetching story state:', error);
    return NextResponse.json(
      { 
        error: "Failed to fetch story state",
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
    const state: StoryState = await request.json();
    await createStoryState(roomId, state);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating story state:', error);
    return NextResponse.json(
      { 
        error: "Failed to create story state",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<Response | NextResponse> {
  const roomId = params.roomId.toLowerCase().replace("#", "");
  
  try {
    const updates: Partial<StoryState> = await request.json();
    await updateStoryState(roomId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating story state:', error);
    return NextResponse.json(
      { 
        error: "Failed to update story state",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 