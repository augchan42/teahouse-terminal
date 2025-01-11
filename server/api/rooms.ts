import { Router, Request, Response } from 'express';
import { createRoom, listRooms, getRoomMessages, clearRoomMessages, addMessageToRoom } from '../store';
import { ChatRoom, ChatMessage } from '../types';

const router = Router();

// List rooms
router.get('/', async (req: Request, res: Response) => {
  try {
    const tags = req.query.tags ? String(req.query.tags).split(',') : undefined;
    const rooms = await listRooms(tags);
    res.json({ rooms });
  } catch (error) {
    console.error('Error listing rooms:', error);
    res.status(500).json({ error: 'Failed to list rooms' });
  }
});

// Get room history
router.get('/:roomId/history', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const messages = await getRoomMessages(roomId);
    res.json({ messages });
  } catch (error) {
    console.error('Error getting room history:', error);
    res.status(500).json({ error: 'Failed to get room history' });
  }
});

// Send message to room
router.post('/:roomId/message', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { content, sender } = req.body;
    
    const message = await addMessageToRoom(roomId, {
      content,
      sender,
      timestamp: new Date().toISOString(),
      roomId
    });
    
    res.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, topic, tags, creator, displayOrder } = req.body;
    
    const room = await createRoom({
      name,
      topic,
      tags,
      participants: [creator],
      createdAt: new Date().toISOString(),
      messageCount: 0,
      displayOrder
    });
    
    res.json({ room });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Clear room messages
router.delete('/:roomId/messages', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    await clearRoomMessages(roomId);
    res.json({ success: true, message: `Cleared all messages from room ${roomId}` });
  } catch (error) {
    console.error('Error clearing room messages:', error);
    res.status(500).json({ error: 'Failed to clear room messages' });
  }
});

export default router; 