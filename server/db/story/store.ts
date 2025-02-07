import { getDb, db } from '../../store';
import { StoryState, StoryPhase, StoryPlot, Understanding, Scene, Progress } from './types';
import { StoryTemplate } from './types';
// Story State operations
export async function createStoryState(roomId: string, state: StoryState): Promise<void> {
  await db!.createStoryState(roomId, state);
}

export async function getStoryState(roomId: string): Promise<StoryState | null> {
  return db!.getStoryState(roomId);
}

export async function updateStoryState(roomId: string, updates: Partial<StoryState>): Promise<void> {
  await db!.updateStoryState(roomId, updates);
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
  return db!.createStoryPlot(plot);
}

export async function getStoryPlot(roomId: string): Promise<StoryPlot | null> {
  return db!.getStoryPlot(roomId);
}

export async function updateStoryPlot(roomId: string, updates: Partial<StoryPlot>): Promise<void> {
  await db!.updateStoryPlot(roomId, updates);
}

// Helper function to initialize story for a room
export async function initializeStoryForRoom(
  roomId: string, 
  context: { 
    topic: string, 
    characters: string[] 
  }
): Promise<void> {
  const initialState: StoryState = {
    currentScene: Scene.OPENING,
    progress: Progress.ONGOING,
    template: StoryTemplate.IASIP,
    characterStates: context.characters.reduce((acc, char) => ({
      ...acc,
      [char]: {
        lastActive: new Date().toISOString(),
        currentGoal: '',
        understanding: Understanding.OBLIVIOUS,
        relationships: {},
        template: StoryTemplate.IASIP
      }
    }), {}),
    coveredPoints: []
  };

  await createStoryState(roomId, initialState);
}

export async function getRoomParticipants(roomId: string): Promise<string[]> {
  const room = await db!.getRoom(roomId);
  
  if (!room) return [];
  
  return room.participants
    .filter(p => !p.username.includes('director') && !p.username.includes('system'))
    .map(p => p.username);
}