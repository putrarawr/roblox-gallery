import type { WebSocket } from 'ws';
import type { ScreenshotRecord } from './db.js';

class WebSocketManager {
  private clients: Set<WebSocket> = new Set();

  public registerClient(socket: WebSocket) {
    this.clients.add(socket);
    console.log(`[WS] Client connected. Total active clients: ${this.clients.size}`);

    socket.send(
      JSON.stringify({
        type: 'connection_established',
        timestamp: new Date().toISOString(),
        clientsCount: this.clients.size
      })
    );

    socket.on('message', (message: Buffer | string) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch {
        // ignore non-json messages
      }
    });

    socket.on('close', () => {
      this.clients.delete(socket);
      console.log(`[WS] Client disconnected. Total active clients: ${this.clients.size}`);
    });

    socket.on('error', (err: Error) => {
      console.error('[WS] Socket error:', err);
      this.clients.delete(socket);
    });
  }

  public broadcastNewScreenshot(screenshot: ScreenshotRecord) {
    const payload = JSON.stringify({
      type: 'new_screenshot',
      data: screenshot
    });

    let sentCount = 0;
    for (const client of this.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(payload);
        sentCount++;
      }
    }
    console.log(`[WS] Broadcasted new screenshot (${screenshot.id}) to ${sentCount} clients.`);
  }

  public getActiveCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
