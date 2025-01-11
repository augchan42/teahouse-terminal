import { Pool, PoolClient } from 'pg';
import { DatabaseAdapter } from './types';
import { ChatRoom, ChatMessage, ModelInfo } from '../types';

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool | null = null;
  
  getDatabase() {
    return this.pool!;
  }
  
  async initialize(): Promise<void> {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        tags JSONB,
        created_at TIMESTAMP WITH TIME ZONE,
        message_count INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id),
        content TEXT,
        sender_username TEXT,
        sender_model TEXT,
        timestamp TIMESTAMP WITH TIME ZONE
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
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      
      const id = room.name.toLowerCase().replace('#', '') || crypto.randomUUID();
      await client.query(
        `INSERT INTO rooms (id, name, topic, tags, created_at, message_count, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          room.name,
          room.topic,
          JSON.stringify(room.tags),
          new Date().toISOString(),
          0,
          room.displayOrder || 0
        ]
      );
      
      // Add initial participants if any
      if (room.participants?.length) {
        const participantValues = room.participants
          .map((p, i) => `($1, $${i*2 + 2}, $${i*2 + 3})`)
          .join(',');
        
        const participantParams = room.participants.flatMap(p => [p.username, p.model]);
        
        await client.query(
          `INSERT INTO participants (room_id, username, model) VALUES ${participantValues}`,
          [id, ...participantParams]
        );
      }
      
      await client.query('COMMIT');
      return this.getRoom(id) as Promise<ChatRoom>;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getRoom(roomId: string): Promise<ChatRoom | null> {
    const { rows: [room] } = await this.pool!.query(
      `SELECT r.*,
        json_agg(json_build_object('username', p.username, 'model', p.model)) as participants
       FROM rooms r
       LEFT JOIN participants p ON r.id = p.room_id
       WHERE r.id = $1
       GROUP BY r.id`,
      [roomId]
    );
    
    if (!room) return null;
    
    return {
      id: room.id,
      name: room.name,
      topic: room.topic,
      tags: room.tags,
      participants: room.participants.filter((p: any) => p.username),
      createdAt: room.created_at,
      messageCount: room.message_count,
      displayOrder: room.display_order
    };
  }
  
  async updateRoom(roomId: string, room: Partial<ChatRoom>): Promise<ChatRoom> {
    const updates: string[] = [];
    const values: any[] = [roomId];
    let paramCount = 2;
    
    if (room.name) {
      updates.push(`name = $${paramCount}`);
      values.push(room.name);
      paramCount++;
    }
    if (room.topic) {
      updates.push(`topic = $${paramCount}`);
      values.push(room.topic);
      paramCount++;
    }
    if (room.tags) {
      updates.push(`tags = $${paramCount}`);
      values.push(JSON.stringify(room.tags));
      paramCount++;
    }
    if (typeof room.displayOrder === 'number') {
      updates.push(`display_order = $${paramCount}`);
      values.push(room.displayOrder);
      paramCount++;
    }
    
    if (updates.length > 0) {
      await this.pool!.query(
        `UPDATE rooms SET ${updates.join(', ')} WHERE id = $1`,
        values
      );
    }
    
    return this.getRoom(roomId) as Promise<ChatRoom>;
  }

  async listRooms(tags?: string[]): Promise<ChatRoom[]> {
    let query = `
      SELECT r.*,
        json_agg(json_build_object('username', p.username, 'model', p.model)) as participants
      FROM rooms r
      LEFT JOIN participants p ON r.id = p.room_id
      GROUP BY r.id
      ORDER BY r.display_order ASC
    `;
    
    if (tags?.length) {
      query += ` HAVING r.tags ?| $1`;
      const { rows } = await this.pool!.query(query, [tags]);
      return this.mapRoomsFromRows(rows);
    } else {
      const { rows } = await this.pool!.query(query);
      return this.mapRoomsFromRows(rows);
    }
  }

  async addMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO messages (id, room_id, content, sender_username, sender_model, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          message.roomId,
          message.content,
          message.sender.username,
          message.sender.model,
          message.timestamp
        ]
      );
      
      await client.query(
        `UPDATE rooms SET message_count = message_count + 1 WHERE id = $1`,
        [message.roomId]
      );
      
      await client.query('COMMIT');
      return { ...message, id };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getRoomMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    const { rows } = await this.pool!.query(
      `SELECT * FROM messages 
       WHERE room_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [roomId, limit]
    );
    
    return rows.map(msg => ({
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
    await this.pool!.query(
      `INSERT INTO participants (room_id, username, model)
       VALUES ($1, $2, $3)
       ON CONFLICT (room_id, username) DO UPDATE SET model = $3`,
      [roomId, participant.username, participant.model]
    );
  }

  async removeParticipant(roomId: string, username: string): Promise<void> {
    await this.pool!.query(
      `DELETE FROM participants WHERE room_id = $1 AND username = $2`,
      [roomId, username]
    );
  }

  async clearMessages(roomId: string): Promise<void> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      
      // Delete all messages for the room
      await client.query(
        'DELETE FROM messages WHERE room_id = $1',
        [roomId]
      );
      
      // Reset message count
      await client.query(
        'UPDATE rooms SET message_count = 0 WHERE id = $1',
        [roomId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRoomsFromRows(rows: any[]): ChatRoom[] {
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      topic: row.topic,
      tags: row.tags,
      participants: row.participants.filter((p: any) => p.username),
      createdAt: row.created_at,
      messageCount: row.message_count,
      displayOrder: row.display_order  // Add this line
    }));
  }

  async close(): Promise<void> {
    await this.pool?.end();
  }
} 