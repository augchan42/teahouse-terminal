import { StoryState, StoryPhase, StoryPlot } from '../story/types';

export class SqliteStoryAdapter {
  constructor(private db: any) {}

  async createStoryState(roomId: string, state: StoryState): Promise<void> {
    await this.db!.run(
      `INSERT INTO story_states (
        room_id, current_scene, progress, character_states, covered_points, template
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      roomId,
      state.currentScene,
      state.progress,
      JSON.stringify(state.characterStates),
      JSON.stringify(state.coveredPoints),
      state.template
    );
  }

  async getStoryState(roomId: string): Promise<StoryState | null> {
    const state = await this.db!.get(
      `SELECT * FROM story_states WHERE room_id = ?`,
      roomId
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
    const values: any[] = [];
    
    if (updates.currentScene) {
      sets.push('current_scene = ?');
      values.push(updates.currentScene);
    }
    if (updates.progress) {
      sets.push('progress = ?');
      values.push(updates.progress);
    }
    if (updates.characterStates) {
      sets.push('character_states = ?');
      values.push(JSON.stringify(updates.characterStates));
    }
    if (updates.coveredPoints) {
      sets.push('covered_points = ?');
      values.push(JSON.stringify(updates.coveredPoints));
    }
    if (updates.template) {
      sets.push('template = ?');
      values.push(updates.template);
    }
  
    if (sets.length > 0) {
      values.push(roomId);
      await this.db!.run(
        `UPDATE story_states SET ${sets.join(', ')} WHERE room_id = ?`,
        ...values
      );
    }
  }

  async createStoryPlot(plot: Omit<StoryPlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryPlot> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
  
    await this.db!.run(
      `INSERT INTO story_plots (
        id, room_id, title, premise, template, character_arcs,
        scenes, expected_outcomes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      plot.roomId,
      plot.title,
      plot.premise,
      plot.template,
      JSON.stringify(plot.characterArcs),
      JSON.stringify(plot.scenes),
      JSON.stringify(plot.expectedOutcomes),
      now,
      now
    );
  
    return this.getStoryPlot(plot.roomId) as Promise<StoryPlot>;
  }

  async getStoryPlot(roomId: string): Promise<StoryPlot | null> {
    const plot = await this.db!.get(
      `SELECT * FROM story_plots 
       WHERE room_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      roomId
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
    const values: any[] = [];
  
    if (updates.title) {
      sets.push('title = ?');
      values.push(updates.title);
    }
    if (updates.premise) {
      sets.push('premise = ?');
      values.push(updates.premise);
    }
    if (updates.template) {
      sets.push('template = ?');
      values.push(updates.template);
    }
    if (updates.characterArcs) {
      sets.push('character_arcs = ?');
      values.push(JSON.stringify(updates.characterArcs));
    }
    if (updates.scenes) {
      sets.push('scenes = ?');
      values.push(JSON.stringify(updates.scenes));
    }
    if (updates.expectedOutcomes) {
      sets.push('expected_outcomes = ?');
      values.push(JSON.stringify(updates.expectedOutcomes));
    }
  
    if (sets.length > 0) {
      sets.push('updated_at = ?');
      values.push(new Date().toISOString());
      
      values.push(roomId);
      await this.db!.run(
        `UPDATE story_plots SET ${sets.join(', ')} WHERE room_id = ?`,
        ...values
      );
    }
  }

  async addStoryEvent(roomId: string, event: {
    phase: StoryPhase;
    type: 'phase_change' | 'point_discussed' | 'character_update';
    data: Record<string, any>;
  }): Promise<void> {
    await this.db!.run(
      `INSERT INTO story_events (room_id, phase, event_type, event_data)
       VALUES (?, ?, ?, ?)`,
      roomId,
      event.phase,
      event.type,
      JSON.stringify(event.data)
    );
  }

  async getStoryEvents(roomId: string, limit = 50): Promise<any[]> {
    return this.db!.all(
      `SELECT * FROM story_events 
       WHERE room_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      roomId,
      limit
    );
  }
}