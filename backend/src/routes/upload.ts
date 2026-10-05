import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { dbService } from '../db.js';
import { storageService } from '../storage.js';
import { wsManager } from '../ws.js';
import { resolveRobloxMapThumbnails } from './gallery.js';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit

export async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post('/api/gallery/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Validate Daemon Bearer Token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid Bearer token' });
    }

    const token = authHeader.substring(7).trim();
    if (token !== config.daemonSecret) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Daemon secret token mismatch' });
    }

    // 2. Parse Multipart payload
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/png';
    let originalFilename = 'capture.png';
    let placeId: string | null = null;
    let placeName = 'unknown place';
    let capturedAt = new Date().toISOString();

    for await (const part of parts) {
      if (part.type === 'file') {
        mimeType = part.mimetype;
        originalFilename = part.filename;

        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Unsupported mime type: ${mimeType}. Allowed: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`
          });
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;
        for await (const chunk of part.file) {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE_BYTES) {
            return reply.status(413).send({
              error: 'Payload Too Large',
              message: `Image exceeds maximum allowed size of 15MB`
            });
          }
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
      } else {
        // Form field data
        const fieldName = part.fieldname;
        const fieldValue = String(part.value || '');
        if (fieldName === 'placeId' && fieldValue.trim()) {
          placeId = fieldValue.trim();
        } else if (fieldName === 'placeName' && fieldValue.trim()) {
          placeName = fieldValue.trim();
        } else if (fieldName === 'capturedAt' && fieldValue.trim()) {
          capturedAt = fieldValue.trim();
        }
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'No image file provided in payload' });
    }

    // 3. Generate UUID-based filename
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const id = uuidv4();
    const filename = `${id}.${ext}`;

    // 4. Save to Storage (Cloudflare R2 or Local Disk)
    const { imageUrl, storageKey } = await storageService.saveFile(fileBuffer, filename, mimeType);

    // 5. Save row metadata to SQLite
    const record = {
      id,
      image_url: imageUrl,
      storage_key: storageKey,
      place_id: placeId,
      place_name: placeName,
      file_size_bytes: fileBuffer.length,
      captured_at: capturedAt
    };

    dbService.insertScreenshot(record);

    // Resolve official map thumbnail & icon if placeId is present
    let mapThumbUrl: string | null = null;
    let mapIconUrl: string | null = null;
    if (placeId) {
      try {
        const meta = await resolveRobloxMapThumbnails(placeId);
        mapThumbUrl = meta.thumbnailUrl;
        mapIconUrl = meta.iconUrl;
      } catch (err) {
        // silent fallback
      }
    }

    const broadcastPayload = {
      ...record,
      thumbnail_url: mapThumbUrl,
      icon_url: mapIconUrl
    };

    // 6. Broadcast Realtime Event to WebSocket clients with official map thumbnail attached
    wsManager.broadcastNewScreenshot(broadcastPayload);

    return reply.status(201).send({
      success: true,
      ...broadcastPayload
    });
  });
}
