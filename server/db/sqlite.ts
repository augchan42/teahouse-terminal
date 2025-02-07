import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { DatabaseAdapter } from './types';
import { ChatRoom, ChatMessage, ModelInfo } from '../types';
import { StoryState, StoryPhase, StoryPlot } from './story/types';
import { SqliteStoryAdapter } from './story/story-sqlite-adapter';
import { SQLITE_STORY_SCHEMA } from './story/story-schema-sqlite';

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database | null = null;
  private storyAdapter: SqliteStoryAdapter | null = null;
  
  getDatabase() {
    return this.db!;
  }
  
  async initialize(): Promise<void> {
    const dbPath = process.env.SQLITE_PATH || 'chat.db';
    console.log('Initializing SQLite database at:', dbPath);
    
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        tags TEXT,
        created_at TEXT,
        message_count INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id),
        content TEXT,
        sender_username TEXT,
        sender_model TEXT,
        timestamp TEXT
      );
      
      CREATE TABLE IF NOT EXISTS participants (
        room_id TEXT REFERENCES rooms(id),
        username TEXT,
        model TEXT,
        PRIMARY KEY(room_id, username)
      );

      CREATE TABLE IF NOT EXISTS story_states (
        id TEXT PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id),
        current_phase TEXT NOT NULL,
        progress TEXT NOT NULL,
        tension TEXT NOT NULL,
        character_states TEXT NOT NULL DEFAULT '{}',
        completed_beats TEXT NOT NULL DEFAULT '[]',
        current_beat TEXT,
        topic TEXT NOT NULL,
        covered_points TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS story_events (
        id TEXT PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id),
        phase TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_story_states_room_id ON story_states(room_id);
      CREATE INDEX IF NOT EXISTS idx_story_events_room_id ON story_events(room_id);

      CREATE TABLE IF NOT EXISTS story_plots (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        premise TEXT NOT NULL,
        key_points TEXT NOT NULL DEFAULT '[]',
        character_arcs TEXT NOT NULL DEFAULT '{}',
        scene_sequence TEXT NOT NULL DEFAULT '[]',
        expected_outcomes TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_story_plots_room_id ON story_plots(room_id);
      CREATE INDEX IF NOT EXISTS idx_story_plots_created_at ON story_plots(created_at);
    `);

    // Initialize story tables
    await this.db.exec(SQLITE_STORY_SCHEMA);
    
    // Initialize story adapter
    this.storyAdapter = new SqliteStoryAdapter(this.db);
  }
  
  async createRoom(room: Omit<ChatRoom, 'id'>): Promise<ChatRoom> {
    const id = room.name.toLowerCase().replace('#', '') || crypto.randomUUID();
    console.log(`SQLite creating room ${room.name} with display_order:`, room.displayOrder);
    
    await this.db!.run(
      `INSERT INTO rooms (id, name, topic, tags, created_at, message_count, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      room.name,
      room.topic,
      JSON.stringify(room.tags),
      new Date().toISOString(),
      0,
      room.displayOrder || 0
    );
    
    const createdRoom = await this.getRoom(id);
    console.log(`SQLite created room ${room.name}, fetched with display_order:`, createdRoom?.displayOrder);
    return createdRoom as ChatRoom;
  }
  
  async getRoom(roomId: string): Promise<ChatRoom | null> {
    const room = await this.db!.get(
      `SELECT r.*, 
        json_group_array(json_object('username', p.username, 'model', p.model)) as participants
       FROM rooms r
       LEFT JOIN participants p ON r.id = p.room_id
       WHERE r.id = ?
       GROUP BY r.id`,
      roomId
    );
    
    if (!room) return null;
    
    return {
      id: room.id,
      name: room.name,
      topic: room.topic,
      tags: JSON.parse(room.tags),
      participants: JSON.parse(room.participants).filter((p: any) => p.username),
      createdAt: room.created_at,
      messageCount: room.message_count,
      displayOrder: room.display_order
    };
  }

  async listRooms(tags?: string[]): Promise<ChatRoom[]> {
    const rooms = await this.db!.all(
      `SELECT r.*, 
        json_group_array(json_object('username', p.username, 'model', p.model)) as participants
       FROM rooms r
       LEFT JOIN participants p ON r.id = p.room_id
       GROUP BY r.id
       ORDER BY r.display_order ASC`  // Add this ORDER BY
    );
    
    return rooms.map((room: any) => ({
      id: room.id,
      name: room.name,
      topic: room.topic,
      tags: JSON.parse(room.tags),
      participants: JSON.parse(room.participants).filter((p: any) => p.username),
      createdAt: room.created_at,
      messageCount: room.message_count,
      displayOrder: room.display_order  // Add this
    })).filter((room: ChatRoom) => 
      !tags?.length || tags.some(tag => room.tags.includes(tag))
    );
  }

  async addMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const id = crypto.randomUUID();
    await this.db!.run(
      `INSERT INTO messages (id, room_id, content, sender_username, sender_model, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      message.roomId,
      message.content,
      message.sender.username,
      message.sender.model,
      message.timestamp
    );
    
    await this.db!.run(
      `UPDATE rooms SET message_count = message_count + 1 WHERE id = ?`,
      message.roomId
    );
    
    return { ...message, id };
  }

  async getRoomMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    const messages = await this.db!.all(
      `SELECT * FROM messages 
       WHERE room_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      roomId,
      limit
    );
    
    return messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      sender: {
        username: msg.sender_username,
        model: msg.sender_model
      },
      timestamp: msg.timestamp,
      roomId: msg.room_id
    }));
  }

  async addParticipant(roomId: string, participant: ModelInfo): Promise<void> {
    await this.db!.run(
      `INSERT OR REPLACE INTO participants (room_id, username, model)
       VALUES (?, ?, ?)`,
      roomId,
      participant.username,
      participant.model
    );
  }

  async removeParticipant(roomId: string, username: string): Promise<void> {
    await this.db!.run(
      `DELETE FROM participants WHERE room_id = ? AND username = ?`,
      roomId,
      username
    );
  }

  async updateRoom(roomId: string, room: Partial<ChatRoom>): Promise<ChatRoom> {
    const updates: string[] = [];
    const values: any[] = [roomId];
    
    if (room.name) {
      updates.push(`name = ?`);
      values.push(room.name);
    }
    if (room.topic) {
      updates.push(`topic = ?`);
      values.push(room.topic);
    }
    if (room.tags) {
      updates.push(`tags = ?`);
      values.push(JSON.stringify(room.tags));
    }
    if (typeof room.displayOrder === 'number') {
      updates.push(`display_order = ?`);
      values.push(room.displayOrder);
    }
    
    if (updates.length > 0) {
      await this.db!.run(
        `UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`,
        ...values
      );
    }
    
    return this.getRoom(roomId) as Promise<ChatRoom>;
  }

  async clearMessages(roomId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run(
      `DELETE FROM messages WHERE room_id = ?`,
      roomId
    );
    
    // Reset message count in the room
    await this.db.run(
      `UPDATE rooms SET message_count = 0 WHERE id = ?`,
      roomId
    );
  }

  async close(): Promise<void> {
    await this.db?.close();
  }  

  // Story-related methods delegated to storyAdapter
  async createStoryState(roomId: string, state: StoryState): Promise<void> {
    return this.storyAdapter!.createStoryState(roomId, state);
  }

  async getStoryState(roomId: string): Promise<StoryState | null> {
    return this.storyAdapter!.getStoryState(roomId);
  }

  async updateStoryState(roomId: string, updates: Partial<StoryState>): Promise<void> {
    return this.storyAdapter!.updateStoryState(roomId, updates);
  }

  async createStoryPlot(plot: Omit<StoryPlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryPlot> {
    return this.storyAdapter!.createStoryPlot(plot);
  }

  async getStoryPlot(roomId: string): Promise<StoryPlot | null> {
    return this.storyAdapter!.getStoryPlot(roomId);
  }

  async updateStoryPlot(roomId: string, updates: Partial<StoryPlot>): Promise<void> {
    return this.storyAdapter!.updateStoryPlot(roomId, updates);
  }

  async addStoryEvent(roomId: string, event: {
    phase: StoryPhase;
    type: 'phase_change' | 'point_discussed' | 'character_update';
    data: Record<string, any>;
  }): Promise<void> {
    return this.storyAdapter!.addStoryEvent(roomId, event);
  }

  async getStoryEvents(roomId: string, limit = 50): Promise<any[]> {
    return this.storyAdapter!.getStoryEvents(roomId, limit);
  }
} 