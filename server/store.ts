import { DatabaseAdapter, createAdapter } from './db';
import { ChatRoom, ChatMessage, ModelInfo, StoryState, StoryPhase, StoryPlot } from './types';

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
export async function getDb() {
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

export async function updateRoomTopic(roomId: string, topic: string) {
  const database = await getDb();
  return database.updateRoom(roomId, { topic });
}

// Story State operations
export async function createStoryState(roomId: string, state: StoryState): Promise<void> {
  const database = await getDb();
  await database.createStoryState(roomId, state);
}

export async function getStoryState(roomId: string): Promise<StoryState | null> {
  const database = await getDb();
  return database.getStoryState(roomId);
}

export async function updateStoryState(roomId: string, updates: Partial<StoryState>): Promise<void> {
  const database = await getDb();
  await database.updateStoryState(roomId, updates);
}

// Story Events operations
export async function addStoryEvent(roomId: string, event: {
  phase: StoryPhase;
  type: 'phase_change' | 'point_discussed' | 'character_update';
  data: Record<string, any>;
}): Promise<void> {
  const database = await getDb();
  await database.addStoryEvent(roomId, event);
}

export async function getStoryEvents(roomId: string, limit?: number): Promise<any[]> {
  const database = await getDb();
  return database.getStoryEvents(roomId, limit);
}

// Story Plot operations
export async function createStoryPlot(plot: Omit<StoryPlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryPlot> {
  const database = await getDb();
  return database.createStoryPlot(plot);
}

export async function getStoryPlot(roomId: string): Promise<StoryPlot | null> {
  const database = await getDb();
  return database.getStoryPlot(roomId);
}

export async function updateStoryPlot(roomId: string, updates: Partial<StoryPlot>): Promise<void> {
  const database = await getDb();
  await database.updateStoryPlot(roomId, updates);
}

// Helper function to initialize story for a room
export async function initializeStoryForRoom(roomId: string, topic: string): Promise<void> {
  const initialState: StoryState = {
    currentPhase: StoryPhase.SETUP,
    progress: 'beginning',
    tension: 'low',
    characterStates: {},
    completedBeats: [],
    topic,
    coveredPoints: []
  };

  await createStoryState(roomId, initialState);
}

export async function getRoomParticipants(roomId: string): Promise<string[]> {
  const database = await getDb();
  const room = await database.getRoom(roomId);
  
  if (!room) return [];
  
  return room.participants
    .filter(p => !p.username.includes('director') && !p.username.includes('system'))
    .map(p => p.username);
}

// Export db for direct access if needed
export { db };