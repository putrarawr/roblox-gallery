import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbService } from '../db.js';
import { storageService } from '../storage.js';

export async function galleryRoutes(fastify: FastifyInstance) {
  // Query gallery items with pagination and placeId filter
  fastify.get('/api/gallery/items', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      limit?: string;
      cursor?: string;
      placeId?: string;
    };

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const cursor = query.cursor;
    const placeId = query.placeId;

    const result = dbService.listScreenshots({ limit, cursor, placeId });
    return reply.send(result);
  });

  // Get list of unique Roblox games/places captured
  fastify.get('/api/gallery/places', async (request: FastifyRequest, reply: FastifyReply) => {
    const places = dbService.getUniquePlaces();
    return reply.send({ places });
  });

  // Get gallery metrics & statistics
  fastify.get('/api/gallery/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = dbService.getStats();
    return reply.send(stats);
  });

  // Delete a screenshot
  fastify.delete('/api/gallery/items/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const deleted = dbService.deleteScreenshot(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Not Found', message: 'Screenshot not found' });
    }

    // Delete asset from storage
    await storageService.deleteFile(deleted.storage_key);

    return reply.send({ success: true, id });
  });
}
