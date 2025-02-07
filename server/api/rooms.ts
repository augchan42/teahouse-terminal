import { Router, Request, Response } from 'express';
import { createRoom, listRooms, getRoomMessages, clearRoomMessages, addMessageToRoom, updateRoomTopic, addParticipant } from '../store';
import { getRoomParticipants } from '../db/story/store';
import { ModelInfo } from '../types';
import storyRouter from './story';  // Import the story router

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

// Update room topic
router.patch('/:roomId/topic', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { topic } = req.body;
    
    const updatedRoom = await updateRoomTopic(roomId, topic );
    res.json({ room: updatedRoom });
  } catch (error) {
    console.error('Error updating room topic:', error);
    res.status(500).json({ error: 'Failed to update room topic' });
  }
});

// Get room participants
router.get('/:roomId/participants', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const participants = await getRoomParticipants(roomId);
    res.json({ participants });
  } catch (error) {
    console.error('Error getting room participants:', error);
    res.status(500).json({ error: 'Failed to get room participants' });
  }
});

// Join room
router.post('/:roomId/join', async (req: Request<{ roomId: string }, any, { modelInfo: ModelInfo }>, res: Response) => {
  try {
    const { roomId } = req.params;
    const { modelInfo } = req.body;
    
    await addParticipant(roomId, modelInfo);
    res.json({ success: true });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ 
      error: 'Failed to join room',
      details: error instanceof Error ? error.message : String(error),
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined
    });
  }
});

router.use('/:roomId/story', storyRouter);

export default router; 