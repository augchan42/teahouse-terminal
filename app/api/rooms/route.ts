import { NextResponse } from "next/server";
import { listRooms, createRoom } from "@/server/store";
import { ChatRoom, ModelInfo } from "@/server/types";

// List all rooms
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tags = searchParams.get("tags")?.split(",") || [];
    
    const rooms = await listRooms(tags);
    console.log('Available rooms:', rooms); // Debug log
    
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Error in GET /api/rooms:', error);
    return NextResponse.json(
      { error: "Failed to fetch rooms", details: error },
      { status: 500 }
    );
  }
}

// Create a new room
export async function POST(request: Request) {
  try {
    const { name, topic, tags, creator, displayOrder } = await request.json() as {
      name: string;
      topic: string;
      tags: string[];
      creator: ModelInfo;
      displayOrder: number;
    };
    
    const room = await createRoom({
      name,
      topic,
      tags,
      participants: [creator],
      createdAt: new Date().toISOString(),
      messageCount: 0,
      displayOrder
    } as Omit<ChatRoom, 'id'>);
    
    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
} 