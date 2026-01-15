import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { ArtNetSocketServer } from './sockets/artnet.socket.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize WebSocket server
const socketServer = new ArtNetSocketServer(httpServer);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all shaders
app.get('/api/shaders', (req, res) => {
  const shaders = socketServer.getShaderService().getAllShaders();
  res.json(shaders);
});

// Get shader by ID
app.get('/api/shaders/:id', (req, res) => {
  const shader = socketServer.getShaderService().getShader(req.params.id);
  if (shader) {
    res.json(shader);
  } else {
    res.status(404).json({ error: 'Shader not found' });
  }
});

// Endpoint to receive rendered pixel data from frontend
app.post('/api/artnet/send', async (req, res) => {
  try {
    const { stripId, rgbData } = req.body;

    if (!stripId || !rgbData) {
      return res.status(400).json({ error: 'Missing stripId or rgbData' });
    }

    // Convert array to Uint8Array
    const data = new Uint8Array(rgbData);

    await socketServer.sendRenderedData(stripId, data);

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending Art-Net data:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Endpoint to receive batched rendered pixel data from frontend
app.post('/api/artnet/send-batch', async (req, res) => {
  try {
    const { strips } = req.body;

    if (!strips || !Array.isArray(strips)) {
      return res.status(400).json({ error: 'Missing or invalid strips array' });
    }

    // Process all strips in parallel
    const promises = strips.map(async ({ stripId, rgbData }: any) => {
      if (!stripId || !rgbData) {
        return;
      }

      // Convert array to Uint8Array
      const data = new Uint8Array(rgbData);

      await socketServer.sendRenderedData(stripId, data);
    });

    await Promise.all(promises);

    res.json({ success: true, count: strips.length });
  } catch (error) {
    console.error('Error sending batched Art-Net data:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
🎨 LED Shader Controller Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server running on port ${PORT}
WebSocket available for real-time communication
Art-Net service initialized

Endpoints:
  GET  /health
  GET  /api/shaders
  GET  /api/shaders/:id
  POST /api/artnet/send

Press Ctrl+C to stop
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
