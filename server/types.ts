export interface ModelInfo {
  username: string;
  model: string;
}

export type ContentType = 'text' | 'markdown-with-image' | 'markdown-with-audio' | 'markdown-with-media';

export interface MessageMetadata {
  // Image metadata
  imageFormat?: string;
  dimensions?: { width: number; height: number };
  
  // Audio metadata
  audioFormat?: string;  // mp3, wav, etc
  duration?: number;     // in seconds
  sampleRate?: number;   // in Hz
  
  // Shared metadata
  size?: number;         // in bytes
  mimeType?: string;     // full MIME type
  transcription?: string; // For audio/speech content
  
  // Additional useful fields
  encoding?: string;       // base64, utf8, etc
  compressed?: boolean;    // if content is compressed
  processingStatus?: 'raw' | 'processed' | 'failed';  // for async processing
  
  // For content verification
  hash?: string;          // content hash for verification
  
  // For chunking large content
  chunkIndex?: number;    // if content is split across messages
  totalChunks?: number;   // total number of chunks
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: ModelInfo;
  timestamp: string;
  roomId: string;
  contentType?: ContentType;  // Optional, defaults to 'text'
  metadata?: MessageMetadata; // Optional for additional data
}

export interface ChatRoom {
  id: string;
  name: string;
  topic: string;
  tags: string[];
  participants: ModelInfo[];
  createdAt: string;
  messageCount: number;
  displayOrder: number;
}

// Simplify phases to match our earlier discussion
export enum StoryPhase {
  SETUP = 'setup',
  ESCALATION = 'escalation', 
  CRISIS = 'crisis',
  RESOLUTION = 'resolution'
}

// Simplify StoryState to remove numerical tracking
export interface StoryState {
  currentPhase: StoryPhase;
  progress: 'beginning' | 'middle' | 'near_completion';
  tension: 'low' | 'medium' | 'high' | 'peak';
  
  // Track participation without counts
  characterStates: Record<string, {
    lastActive: string; // timestamp
    currentGoal: string;
    understanding: 'oblivious' | 'partially_aware' | 'fully_aware';
    relationship: Record<string, 'allied' | 'neutral' | 'opposed'>;
  }>;
  
  // Track plot without complex nesting
  completedBeats: string[];
  currentBeat?: string;
  
  // Topic tracking
  topic: string;
  coveredPoints: string[];
}

// Simplify directive structure
export interface StoryDirective {
  action: 'continue' | 'progress_phase' | 'redirect' | 'conclude';
  guidance: {
    phase?: StoryPhase;
    beat?: string;
    characterPrompts?: Record<string, {
      goal: string;
      suggestion: string;
    }>;
  };
}

// Remove PHASE_DURATIONS - let narrative flow naturally

// Add type for Director's evaluation
export interface SceneEvaluation {
  phase: StoryPhase;
  progress: 'flowing' | 'stalled' | 'needs_direction';
  characterStatus: Record<string, {
    engagement: 'active' | 'passive' | 'absent';
    contribution: 'helping' | 'hindering' | 'neutral';
  }>;
  suggestedAction?: StoryDirective;
}

export interface StoryPlot {
  id: string;
  roomId: string;
  title: string;
  premise: string;
  keyPoints: string[];
  characterArcs: Record<string, {
    role: string;
    goals: string[];
    arc: 'positive' | 'negative' | 'flat';
    relationships: Record<string, 'ally' | 'rival' | 'neutral'>;
  }>;
  sceneSequence: Array<{
    phase: StoryPhase;
    beat: string;
    expectedTension: 'low' | 'medium' | 'high' | 'peak';
    characterGoals: Record<string, string>;
  }>;
  expectedOutcomes: Array<{
    character: string;
    outcome: string;
    probability: 'likely' | 'possible' | 'unlikely';
  }>;
  createdAt: string;
  updatedAt: string;
}