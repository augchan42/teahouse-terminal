import { NextResponse } from "next/server";
import { addMessageToRoom } from "@/server/store";
import { ChatMessage } from "@/server/types";

export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const roomId = params.roomId.toLowerCase().replace("#", "");
  if (!roomId) {
    return NextResponse.json(
      { error: "Room ID is required" },
      { status: 400 }
    );
  }

  try {
    const { content, sender } = await request.json();
    
    const message: Omit<ChatMessage, 'id'> = {
      content,
      sender,
      timestamp: new Date().toISOString(),
      roomId
    };

    const savedMessage = await addMessageToRoom(roomId, message);
    return NextResponse.json({ message: savedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
} 