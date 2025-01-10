export type ModelInfo = {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: string;
  username?: string;
  roomId?: string;
}; 

