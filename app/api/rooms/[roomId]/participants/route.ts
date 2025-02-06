import { NextResponse, NextRequest } from "next/server";
import { getRoomParticipants } from "@/server/store";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
): Promise<Response | NextResponse> {
  const roomId = params.roomId.toLowerCase().replace("#", "");

  try {
    const participants = await getRoomParticipants(roomId);
    
    if (!participants) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('Error fetching room participants:', error);
    return NextResponse.json(
      { 
        error: "Failed to fetch room participants",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
