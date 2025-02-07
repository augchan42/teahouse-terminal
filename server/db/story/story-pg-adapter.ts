import { Pool } from 'pg';
import { StoryState, StoryPhase, StoryPlot } from '../story/types';

export class PostgresStoryAdapter {
  constructor(private pool: Pool) {}

  async createStoryState(roomId: string, state: StoryState): Promise<void> {
    await this.pool.query(
      `INSERT INTO story_states (
        room_id, current_scene, progress, character_states, covered_points
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        roomId,
        state.currentScene,
        state.progress,
        JSON.stringify(state.characterStates),
        JSON.stringify(state.coveredPoints)
      ]
    );
  }

  async getStoryState(roomId: string): Promise<StoryState | null> {
    const { rows: [state] } = await this.pool.query(
      `SELECT * FROM story_states WHERE room_id = $1`,
      [roomId]
    );
    
    if (!state) return null;
    
    return {
      currentScene: state.current_scene,
      progress: state.progress,
      characterStates: state.character_states,
      coveredPoints: state.covered_points,
      template: state.template
    };
  }

  async updateStoryState(roomId: string, updates: Partial<StoryState>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [roomId];
    let paramCount = 2;

    if (updates.currentScene) {
      sets.push(`current_scene = $${paramCount}`);
      values.push(updates.currentScene);
      paramCount++;
    }
    if (updates.progress) {
      sets.push(`progress = $${paramCount}`);
      values.push(updates.progress);
      paramCount++;
    }
    if (updates.characterStates) {
      sets.push(`character_states = $${paramCount}`);
      values.push(JSON.stringify(updates.characterStates));
      paramCount++;
    }
    if (updates.coveredPoints) {
      sets.push(`covered_points = $${paramCount}`);
      values.push(JSON.stringify(updates.coveredPoints));
      paramCount++;
    }

    if (updates.template) {
      sets.push(`template = $${paramCount}`);
      values.push(updates.template);
      paramCount++;
    }

    if (sets.length > 0) {
      await this.pool.query(
        `UPDATE story_states SET ${sets.join(', ')} WHERE room_id = $1`,
        values
      );
    }
  }

  async createStoryPlot(plot: Omit<StoryPlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryPlot> {
    const { rows: [created] } = await this.pool.query(
      `INSERT INTO story_plots (
        room_id, title, premise, template, character_arcs,
        scenes, expected_outcomes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        plot.roomId,
        plot.title,
        plot.premise,
        plot.template,
        JSON.stringify(plot.characterArcs),
        JSON.stringify(plot.scenes),
        JSON.stringify(plot.expectedOutcomes)
      ]
    );

    return {
      id: created.id,
      roomId: created.room_id,
      title: created.title,
      premise: created.premise,
      template: created.template,
      characterArcs: created.character_arcs,
      scenes: created.scenes,
      expectedOutcomes: created.expected_outcomes,
      createdAt: created.created_at,
      updatedAt: created.updated_at
    };
  }

  async getStoryPlot(roomId: string): Promise<StoryPlot | null> {
    const { rows: [plot] } = await this.pool.query(
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
      template: plot.template,
      characterArcs: plot.character_arcs,
      scenes: plot.scenes,
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
    if (updates.template) {
      sets.push(`template = $${paramCount}`);
      values.push(updates.template);
      paramCount++;
    }
    if (updates.characterArcs) {
      sets.push(`character_arcs = $${paramCount}`);
      values.push(JSON.stringify(updates.characterArcs));
      paramCount++;
    }
    if (updates.scenes) {
      sets.push(`scenes = $${paramCount}`);
      values.push(JSON.stringify(updates.scenes));
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

      await this.pool.query(
        `UPDATE story_plots SET ${sets.join(', ')} WHERE room_id = $1`,
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
}