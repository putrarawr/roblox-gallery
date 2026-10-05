import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbService } from '../db.js';
import { storageService } from '../storage.js';

export interface PlaceThumbnailInfo {
  thumbnailUrl: string | null;
  iconUrl: string | null;
  universeId: number | null;
}

const placeThumbnailCache = new Map<string, PlaceThumbnailInfo>();

export async function resolveRobloxMapThumbnails(placeId: string): Promise<PlaceThumbnailInfo> {
  if (placeThumbnailCache.has(placeId)) {
    return placeThumbnailCache.get(placeId)!;
  }

  try {
    // 1. Get universeId
    const uRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
      signal: AbortSignal.timeout(3500)
    });
    if (!uRes.ok) {
      const empty = { thumbnailUrl: null, iconUrl: null, universeId: null };
      placeThumbnailCache.set(placeId, empty);
      return empty;
    }
    const { universeId } = await uRes.json() as { universeId?: number };
    if (!universeId) {
      const empty = { thumbnailUrl: null, iconUrl: null, universeId: null };
      placeThumbnailCache.set(placeId, empty);
      return empty;
    }

    // 2. Fetch 16:9 thumbnail and 1:1 icon in parallel
    const [tRes, iRes] = await Promise.all([
      fetch(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&defaults=true&size=768x432&format=Png`, {
        signal: AbortSignal.timeout(3500)
      }),
      fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`, {
        signal: AbortSignal.timeout(3500)
      })
    ]);

    let thumbnailUrl: string | null = null;
    let iconUrl: string | null = null;

    if (tRes.ok) {
      const tData = await tRes.json() as { data?: Array<{ thumbnails?: Array<{ imageUrl?: string }> }> };
      thumbnailUrl = tData.data?.[0]?.thumbnails?.[0]?.imageUrl || null;
    }

    if (iRes.ok) {
      const iData = await iRes.json() as { data?: Array<{ imageUrl?: string }> };
      iconUrl = iData.data?.[0]?.imageUrl || null;
    }

    const result: PlaceThumbnailInfo = { thumbnailUrl, iconUrl, universeId };
    placeThumbnailCache.set(placeId, result);
    return result;
  } catch {
    return { thumbnailUrl: null, iconUrl: null, universeId: null };
  }
}

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

  // Get list of unique Roblox games/places captured (enriched with official map thumbnails)
  fastify.get('/api/gallery/places', async (request: FastifyRequest, reply: FastifyReply) => {
    const places = dbService.getUniquePlaces();

    const enrichedPlaces = await Promise.all(
      places.map(async (place) => {
        if (place.place_id && place.place_id.trim() !== '') {
          const meta = await resolveRobloxMapThumbnails(place.place_id);
          return {
            ...place,
            thumbnail_url: meta.thumbnailUrl,
            icon_url: meta.iconUrl
          };
        }
        return {
          ...place,
          thumbnail_url: null,
          icon_url: null
        };
      })
    );

    return reply.send({ places: enrichedPlaces });
  });

  // Dedicated endpoint to resolve Roblox map thumbnail & icon by placeId
  fastify.get('/api/roblox/thumbnail/:placeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { placeId } = request.params as { placeId: string };
    if (!placeId) {
      return reply.status(400).send({ error: 'placeId is required' });
    }
    const meta = await resolveRobloxMapThumbnails(placeId);
    return reply.send(meta);
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
