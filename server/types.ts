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