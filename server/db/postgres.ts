import { Pool, PoolClient } from 'pg';
import { DatabaseAdapter } from './types';
import { ChatRoom, ChatMessage, ModelInfo, StoryState, StoryPhase, StoryPlot } from '../types';

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

      CREATE TABLE IF NOT EXISTS story_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
        current_phase TEXT NOT NULL,
        progress TEXT NOT NULL,
        tension TEXT NOT NULL,
        character_states JSONB NOT NULL DEFAULT '{}',
        completed_beats JSONB NOT NULL DEFAULT '[]',
        current_beat TEXT,
        topic TEXT NOT NULL,
        covered_points JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS story_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
        phase TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );      

      CREATE INDEX IF NOT EXISTS idx_story_states_room_id ON story_states(room_id);
      CREATE INDEX IF NOT EXISTS idx_story_events_room_id ON story_events(room_id);

      CREATE TABLE IF NOT EXISTS story_plots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        premise TEXT NOT NULL,
        key_points JSONB NOT NULL DEFAULT '[]',
        character_arcs JSONB NOT NULL DEFAULT '{}',
        scene_sequence JSONB NOT NULL DEFAULT '[]',
        expected_outcomes JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_story_plots_room_id ON story_plots(room_id);
      CREATE INDEX IF NOT EXISTS idx_story_plots_created_at ON story_plots(created_at);
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
    
    return rows.map(row => ({
      id: row.id,
      content: row.content,
      sender: {
        username: row.sender_username,
        model: row.sender_model
      },
      timestamp: row.timestamp,
      roomId: row.room_id,
      contentType: row.content_type,
      metadata: row.content_metadata
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

  async createStoryState(roomId: string, state: StoryState): Promise<void> {
    await this.pool!.query(
      `INSERT INTO story_states (
        room_id, current_phase, progress, tension,
        character_states, completed_beats, current_beat,
        topic, covered_points
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        roomId,
        state.currentPhase,
        state.progress,
        state.tension,
        JSON.stringify(state.characterStates),
        JSON.stringify(state.completedBeats),
        state.currentBeat,
        state.topic,
        JSON.stringify(state.coveredPoints)
      ]
    );
  }

  async getStoryState(roomId: string): Promise<StoryState | null> {
    const { rows: [state] } = await this.pool!.query(
      `SELECT * FROM story_states WHERE room_id = $1`,
      [roomId]
    );
    
    if (!state) return null;
    
    return {
      currentPhase: state.current_phase,
      progress: state.progress,
      tension: state.tension,
      characterStates: state.character_states,
      completedBeats: state.completed_beats,
      currentBeat: state.current_beat,
      topic: state.topic,
      coveredPoints: state.covered_points
    };
  }

  async updateStoryState(roomId: string, updates: Partial<StoryState>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [roomId];
    let paramCount = 2;

    if (updates.currentPhase) {
      sets.push(`current_phase = $${paramCount}`);
      values.push(updates.currentPhase);
      paramCount++;
    }
    if (updates.progress) {
      sets.push(`progress = $${paramCount}`);
      values.push(updates.progress);
      paramCount++;
    }
    if (updates.tension) {
      sets.push(`tension = $${paramCount}`);
      values.push(updates.tension);
      paramCount++;
    }
    if (updates.characterStates) {
      sets.push(`character_states = $${paramCount}`);
      values.push(JSON.stringify(updates.characterStates));
      paramCount++;
    }
    if (updates.completedBeats) {
      sets.push(`completed_beats = $${paramCount}`);
      values.push(JSON.stringify(updates.completedBeats));
      paramCount++;
    }
    if (updates.currentBeat) {
      sets.push(`current_beat = $${paramCount}`);
      values.push(updates.currentBeat);
      paramCount++;
    }
    if (updates.topic) {
      sets.push(`topic = $${paramCount}`);
      values.push(updates.topic);
      paramCount++;
    }
    if (updates.coveredPoints) {
      sets.push(`covered_points = $${paramCount}`);
      values.push(JSON.stringify(updates.coveredPoints));
      paramCount++;
    }

    if (sets.length > 0) {
      await this.pool!.query(
        `UPDATE story_states SET ${sets.join(', ')} WHERE room_id = $1`,
        values
      );
    }
  }

  async addStoryEvent(roomId: string, event: {
    phase: StoryPhase;
    type: 'phase_change' | 'point_discussed' | 'character_update';
    data: Record<string, any>;
  }): Promise<void> {
    await this.pool!.query(
      `INSERT INTO story_events (room_id, phase, event_type, event_data)
       VALUES ($1, $2, $3, $4)`,
      [roomId, event.phase, event.type, JSON.stringify(event.data)]
    );
  }

  async getStoryEvents(roomId: string, limit = 50): Promise<any[]> {
    const { rows } = await this.pool!.query(
      `SELECT * FROM story_events 
       WHERE room_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [roomId, limit]
    );
    return rows;
  }

  // Add to PostgresAdapter
  async createStoryPlot(plot: Omit<StoryPlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryPlot> {
    const { rows: [created] } = await this.pool!.query(
      `INSERT INTO story_plots (
        room_id, title, premise, key_points, character_arcs,
        scene_sequence, expected_outcomes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        plot.roomId,
        plot.title,
        plot.premise,
        JSON.stringify(plot.keyPoints),
        JSON.stringify(plot.characterArcs),
        JSON.stringify(plot.sceneSequence),
        JSON.stringify(plot.expectedOutcomes)
      ]
    );

    return {
      id: created.id,
      roomId: created.room_id,
      title: created.title,
      premise: created.premise,
      keyPoints: created.key_points,
      characterArcs: created.character_arcs,
      sceneSequence: created.scene_sequence,
      expectedOutcomes: created.expected_outcomes,
      createdAt: created.created_at,
      updatedAt: created.updated_at
    };
  }

  async getStoryPlot(roomId: string): Promise<StoryPlot | null> {
    const { rows: [plot] } = await this.pool!.query(
      `SELECT * FROM story_plots 
       WHERE room_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [roomId]
    );

    if (!plot) return null;

    return {
      id: plot.id,
      roomId: plot.room_id,
      title: plot.title,
      premise: plot.premise,
      keyPoints: plot.key_points,
      characterArcs: plot.character_arcs,
      sceneSequence: plot.scene_sequence,
      expectedOutcomes: plot.expected_outcomes,
      createdAt: plot.created_at,
      updatedAt: plot.updated_at
    };
  }

  async updateStoryPlot(roomId: string, updates: Partial<StoryPlot>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [roomId];
    let paramCount = 2;

    if (updates.title) {
      sets.push(`title = $${paramCount}`);
      values.push(updates.title);
      paramCount++;
    }
    if (updates.premise) {
      sets.push(`premise = $${paramCount}`);
      values.push(updates.premise);
      paramCount++;
    }
    if (updates.keyPoints) {
      sets.push(`key_points = $${paramCount}`);
      values.push(JSON.stringify(updates.keyPoints));
      paramCount++;
    }
    if (updates.characterArcs) {
      sets.push(`character_arcs = $${paramCount}`);
      values.push(JSON.stringify(updates.characterArcs));
      paramCount++;
    }
    if (updates.sceneSequence) {
      sets.push(`scene_sequence = $${paramCount}`);
      values.push(JSON.stringify(updates.sceneSequence));
      paramCount++;
    }
    if (updates.expectedOutcomes) {
      sets.push(`expected_outcomes = $${paramCount}`);
      values.push(JSON.stringify(updates.expectedOutcomes));
      paramCount++;
    }

    if (sets.length > 0) {
      sets.push(`updated_at = $${paramCount}`);
      values.push(new Date().toISOString());

      await this.pool!.query(
        `UPDATE story_plots SET ${sets.join(', ')} WHERE room_id = $1`,
        values
      );
    }
  }
} 