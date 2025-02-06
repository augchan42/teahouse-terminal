import { NextResponse, NextRequest } from "next/server";
import { createStoryPlot, getStoryPlot, updateStoryPlot } from "@/server/store";
import { StoryPlot } from "@/server/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<Response | NextResponse> {
  const roomId = params.roomId.toLowerCase().replace("#", "");

  try {
    const plot = await getStoryPlot(roomId);
    
    if (!plot) {
      return NextResponse.json(
        { error: "Story plot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ plot });
  } catch (error) {
    console.error('Error fetching story plot:', error);
    return NextResponse.json(
      { 
        error: "Failed to fetch story plot",
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
    const plotData = await request.json();
    const plot = await createStoryPlot({ ...plotData, roomId });
    return NextResponse.json({ plot });
  } catch (error) {
    console.error('Error creating story plot:', error);
    return NextResponse.json(
      { 
        error: "Failed to create story plot",
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
    const updates: Partial<StoryPlot> = await request.json();
    await updateStoryPlot(roomId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating story plot:', error);
    return NextResponse.json(
      { 
        error: "Failed to update story plot",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 