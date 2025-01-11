import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { DatabaseAdapter } from './types';
import { ChatRoom, ChatMessage, ModelInfo } from '../types';
import path from 'path';
import { runMigrations } from './migrations';

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database | null = null;
  
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
    `);
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
} 