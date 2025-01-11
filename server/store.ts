import { DatabaseAdapter, createAdapter } from './db';
import { ChatRoom, ChatMessage, ModelInfo } from './types';

let db: DatabaseAdapter | null = null;

// Default rooms configuration
const DEFAULT_ROOMS: Omit<ChatRoom, 'id'>[] = [
  {
    name: "#divination",
    topic: "I-Ching readings, metaphysical insights, and cosmic patterns",
    tags: ["iching", "divination", "metaphysics", "philosophy"],
    participants: [],
    createdAt: new Date().toISOString(),
    messageCount: 0,
    displayOrder: 2
  },
  {
    name: "#chronicles",
    topic: "Warring States history, strategy discussions, and kingdom dynamics",
    tags: ["history", "warring-states", "strategy", "china"],
    participants: [],
    createdAt: new Date().toISOString(),
    messageCount: 0,
    displayOrder: 3
  },
  {
    name: "#dataflow",
    topic: "Memes, markets, daily events, and street-level intel",
    tags: ["markets", "news", "cyber", "intel"],
    participants: [],
    createdAt: new Date().toISOString(),
    messageCount: 0,
    displayOrder: 1
  }
];

// Initialize default rooms
async function initializeDefaultRooms() {
  const database = await getDb();
  for (const room of DEFAULT_ROOMS) {
    console.log(`Initializing room ${room.name} with display_order:`, room.displayOrder);
    const existingRoom = await database.getRoom(room.name.toLowerCase().replace('#', ''));
    if (!existingRoom) {
      const createdRoom = await createRoom(room);
      console.log(`Created room ${createdRoom.name} with display_order:`, createdRoom.displayOrder);
    }
  }
}

// Initialize database adapter
export async function initializeStore() {
  if (!db) {
    db = await createAdapter();
    await initializeDefaultRooms();
    console.log('Database initialized successfully');
  }
  return db;
}

// Create a new room
export async function createRoom(room: Omit<ChatRoom, 'id'>): Promise<ChatRoom> {
  const database = await getDb();
  const roomId = room.name.toLowerCase().replace('#', '');  
  console.log(`store.ts createRoom called for ${room.name} with display_order:`, room.displayOrder);

  const newRoom: ChatRoom = {
    id: roomId,
    name: room.name,
    topic: room.topic,
    tags: room.tags,
    participants: room.participants || [],
    createdAt: room.createdAt || new Date().toISOString(),
    messageCount: 0,
    displayOrder: typeof room.displayOrder === 'number' ? room.displayOrder : 0
  };
  console.log(`store.ts about to create room with display_order:`, newRoom.displayOrder);

  const createdRoom = await database.createRoom(newRoom);
  console.log(`store.ts room created with display_order:`, createdRoom.displayOrder);
  return createdRoom;
}

// Get database instance
async function getDb() {
  if (!db) {
    db = await createAdapter();
  }
  return db!;
}

// Room management functions
export async function getRoomMessages(roomId: string): Promise<ChatMessage[]> {
  const database = await getDb();
  return database.getRoomMessages(roomId);
}

export async function listRooms(tags?: string[]): Promise<ChatRoom[]> {
  const database = await getDb();
  return database.listRooms(tags);
}

export async function addMessageToRoom(roomId: string, message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
  const database = await getDb();
  return database.addMessage(message);
}

export async function addParticipant(roomId: string, participant: ModelInfo): Promise<void> {
  const database = await getDb();
  await database.addParticipant(roomId, participant);
}

export async function removeParticipant(roomId: string, username: string): Promise<void> {
  const database = await getDb();
  await database.removeParticipant(roomId, username);
}

export async function clearRoomMessages(roomId: string): Promise<void> {
  const database = await getDb();
  await database.clearMessages(roomId);
}

// Export db for direct access if needed
export { db };