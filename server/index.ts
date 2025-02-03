import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { initializeStore } from "./store";
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import roomsRouter from './api/rooms';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://pix.coffee'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

app.use(express.json());

// Mount the rooms router at /api/rooms
app.use('/api/rooms', roomsRouter);

// Add a catch-all route handler for debugging
app.use((req: Request, res: Response, _next: NextFunction) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

async function startServer() {
  try {
    await initializeStore();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(console.error); 