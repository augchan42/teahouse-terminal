import { NextResponse } from "next/server";
import { updateRoomTopic } from "@/server/store";

export async function PATCH(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    console.log("PATCH updateRoomTopic called");
    const roomId = params.roomId.toLowerCase().replace("#", "");
    const updates = await request.json();
    
    const updatedRoom = await updateRoomTopic(roomId, updates);
    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error('Error updating topic:', error);
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}