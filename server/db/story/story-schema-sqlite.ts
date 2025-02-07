export const SQLITE_STORY_SCHEMA = `
  CREATE TABLE IF NOT EXISTS story_states (
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE PRIMARY KEY,
    current_scene INTEGER CHECK (current_scene >= 0 AND current_scene <= 3),
    progress TEXT CHECK (progress IN ('ongoing', 'ready_to_advance')),
    character_states TEXT NOT NULL DEFAULT '{}',
    covered_points TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS story_plots (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    premise TEXT NOT NULL,
    template TEXT CHECK (template IN ('IASIP', 'SILICON_VALLEY', 'OFFICE')),
    character_arcs TEXT NOT NULL DEFAULT '{}',
    scenes TEXT NOT NULL DEFAULT '[]',
    expected_outcomes TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id)
  );

  CREATE INDEX IF NOT EXISTS idx_story_states_room_id ON story_states(room_id);
  CREATE INDEX IF NOT EXISTS idx_story_plots_room_id ON story_plots(room_id);
  CREATE INDEX IF NOT EXISTS idx_story_plots_created_at ON story_plots(created_at);
`;