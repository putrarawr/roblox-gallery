import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { uploadRoutes } from './routes/upload.js';
import { galleryRoutes } from './routes/gallery.js';
import { wsManager } from './ws.js';

const fastify = Fastify({
  logger: true
});

async function main() {
  // 1. CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow any origin for mobile LAN access and webapp
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // 2. Multipart handler for file upload streams
  await fastify.register(multipart, {
    limits: {
      fileSize: 15 * 1024 * 1024 // 15 MB
    }
  });

  // 3. WebSocket plugin for realtime synchronization
  await fastify.register(websocket);

  // 4. Serve local static uploads with immutable caching
  await fastify.register(fastifyStatic, {
    root: config.localUploadDir,
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  });

  // WebSocket endpoint
  fastify.register(async function (fastifyInstance) {
    fastifyInstance.get('/ws', { websocket: true }, (socket, req) => {
      wsManager.registerClient(socket);
    });
  });

  // Health check
  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'roblox-sync-gallery-backend',
      timestamp: new Date().toISOString(),
      storageDriver: config.storageDriver,
      activeWsClients: wsManager.getActiveCount()
    };
  });

  // Register API Routes
  await fastify.register(uploadRoutes);
  await fastify.register(galleryRoutes);

  // Start Server
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log('=====================================================');
    console.log(`🚀 Roblox Sync Gallery Backend listening on:`);
    console.log(`   - Local      : http://localhost:${config.port}`);
    console.log(`   - Network    : http://${config.host}:${config.port}`);
    console.log(`   - WebSocket  : ws://${config.host}:${config.port}/ws`);
    console.log(`   - Storage    : ${config.storageDriver.toUpperCase()}`);
    console.log('=====================================================');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
