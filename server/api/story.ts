import { Router, Request as ExpressRequest } from 'express';
import { createStoryState, getStoryState, updateStoryState, addStoryEvent, 
  getStoryEvents, createStoryPlot, getStoryPlot, updateStoryPlot } 
  from '../db/story/store';

const router = Router({ mergeParams: true }); 

// Add interface for params
interface StoryRequestParams {
  roomId: string;
}

// Story State routes
router.post('/state', async (req: ExpressRequest<StoryRequestParams>, res) => {
  try {
    await createStoryState(req.params.roomId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create story state' });
  }
});

router.get('/state', async (req: ExpressRequest<StoryRequestParams>, res) => {
  try {
    const state = await getStoryState(req.params.roomId);
    res.json({ state });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get story state' });
  }
});

router.patch('/state', async (req: ExpressRequest<StoryRequestParams>, res) => {
  try {
    await updateStoryState(req.params.roomId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update story state' });
  }
});

// Story Events routes
router.post('/events', async (req: ExpressRequest<StoryRequestParams>, res) => {
  try {
    await addStoryEvent(req.params.roomId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add story event' });
  }
});

router.get('/events', async (req: ExpressRequest<StoryRequestParams>, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const events = await getStoryEvents(req.params.roomId, limit);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get story events' });
  }
});

// Story Plot routes
router.post('/plot', async (req: ExpressRequest<StoryRequestParams>, res) => {
  try {
    const plot = await createStoryPlot({ ...req.body, roomId: req.params.roomId });
    res.json({ plot });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create story plot' });
  }
});

router.get('/plot', async (req: ExpressRequest<StoryRequestParams>, res) => {
  try {
    const plot = await getStoryPlot(req.params.roomId);
    res.json({ plot });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get story plot' });
  }
});

router.patch('/plot', async (req: ExpressRequest<StoryRequestParams>, res) => {
  try {
    await updateStoryPlot(req.params.roomId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update story plot' });
  }
});

export default router; 