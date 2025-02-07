import { ChatRoom, ChatMessage, ModelInfo} from '../types';
import { StoryPlot, StoryPhase, StoryState }from './story/types';
import { Database } from 'sqlite';
import { Pool } from 'pg';

export interface DatabaseAdapter {
  // Room operations
  createRoom(room: Omit<ChatRoom, 'id'>): Promise<ChatRoom>;
  getRoom(roomId: string): Promise<ChatRoom | null>;
  listRooms(tags?: string[]): Promise<ChatRoom[]>;
  updateRoom(roomId: string, room: Partial<ChatRoom>): Promise<ChatRoom>;
  
  // Message operations
  addMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage>;
  getRoomMessages(roomId: string, limit?: number): Promise<ChatMessage[]>;
  clearMessages(roomId: string): Promise<void>;
  
  // Participant operations
  addParticipant(roomId: string, participant: ModelInfo): Promise<void>;
  removeParticipant(roomId: string, username: string): Promise<void>;
  
  // Add this method
  getDatabase(): Database | Pool;
  
  // Initialize/cleanup
  initialize(): Promise<void>;
  close(): Promise<void>;
  
  // Story State operations
  createStoryState(roomId: string, state: StoryState): Promise<void>;
  getStoryState(roomId: string): Promise<StoryState | null>;
  updateStoryState(roomId: string, updates: Partial<StoryState>): Promise<void>;
  
  // Story Events operations
  addStoryEvent(roomId: string, event: {
    phase: StoryPhase;
    type: 'phase_change' | 'point_discussed' | 'character_update';
    data: Record<string, any>;
  }): Promise<void>;
  getStoryEvents(roomId: string, limit?: number): Promise<any[]>;

  createStoryPlot(plot: Omit<StoryPlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryPlot>;
  getStoryPlot(roomId: string): Promise<StoryPlot | null>;
  updateStoryPlot(roomId: string, updates: Partial<StoryPlot>): Promise<void>;
} 