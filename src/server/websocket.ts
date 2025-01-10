import { WebSocket } from 'ws';

type Connection = {
  ws: WebSocket;
  username: string;
};

// Map to store room-specific connections
export const connections = new Map<string, Connection[]>(); 