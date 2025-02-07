export const POSTGRES_STORY_SCHEMA = `
  CREATE TABLE IF NOT EXISTS story_states (
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE PRIMARY KEY,
    template TEXT CHECK (template IN ('IASIP', 'SILICON_VALLEY', 'OFFICE')),
    current_scene INTEGER CHECK (current_scene >= 0 AND current_scene <= 3),
    progress TEXT CHECK (progress IN ('ongoing', 'ready_to_advance')),
    character_states JSONB NOT NULL DEFAULT '{}',
    covered_points JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS story_plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    premise TEXT NOT NULL,
    template TEXT CHECK (template IN ('IASIP', 'SILICON_VALLEY', 'OFFICE')),
    character_arcs JSONB NOT NULL DEFAULT '{}',
    scenes JSONB NOT NULL DEFAULT '[]',
    expected_outcomes JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id)
  );

  CREATE INDEX IF NOT EXISTS idx_story_states_room_id ON story_states(room_id);
  CREATE INDEX IF NOT EXISTS idx_story_plots_room_id ON story_plots(room_id);
  CREATE INDEX IF NOT EXISTS idx_story_plots_created_at ON story_plots(created_at);
`;