import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type {
  WSClientEvents,
  WSServerEvents,
  StripConfig,
  StripShaderAssignment,
  ShaderUniforms,
  ShaderConfig,
} from '../../../shared/types.js';
import { ArtNetService } from '../services/artnet.service.js';
import { ShaderService } from '../services/shader.service.js';

export class ArtNetSocketServer {
  private io: SocketIOServer;
  private artnetService: ArtNetService;
  private shaderService: ShaderService;
  private strips: StripConfig[] = [];
  private isPlaying: boolean = false;
  private currentBpm: number = 120;
  private frameCount: number = 0;
  private lastFpsUpdate: number = Date.now();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // In production, specify your frontend URL
        methods: ['GET', 'POST'],
      },
    });

    this.artnetService = new ArtNetService();
    this.shaderService = new ShaderService();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      // Send initial shader library
      socket.emit('shaders:list', this.shaderService.getAllShaders());

      // Handle client events
      socket.on('config:update', (data: StripConfig[]) => {
        this.handleConfigUpdate(data);
      });

      socket.on('shader:apply', (data: StripShaderAssignment) => {
        this.handleShaderApply(data);
      });

      socket.on('params:update', (data: Partial<ShaderUniforms>) => {
        this.handleParamsUpdate(data);
      });

      socket.on('playback:start', () => {
        this.handlePlaybackStart();
      });

      socket.on('playback:stop', () => {
        this.handlePlaybackStop();
      });

      socket.on('bpm:update', (data: { bpm: number }) => {
        this.handleBpmUpdate(data.bpm);
      });

      socket.on('shader:create', (data: ShaderConfig) => {
        this.handleShaderCreate(data);
      });

      socket.on('shader:update', (data: ShaderConfig) => {
        this.handleShaderUpdate(data);
      });

      socket.on('shader:delete', (data: { id: string }) => {
        this.handleShaderDelete(data.id);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private handleConfigUpdate(strips: StripConfig[]): void {
    console.log('Config updated:', strips.length, 'strips');
    this.strips = strips;
    this.io.emit('config:updated', strips);
  }

  private handleShaderApply(assignment: StripShaderAssignment): void {
    console.log('Shader applied:', assignment);
    // This will be handled by the frontend's shader renderer
    this.io.emit('shader:applied', assignment);
  }

  private handleParamsUpdate(params: Partial<ShaderUniforms>): void {
    console.log('Params updated:', params);
    this.io.emit('params:updated', params);
  }

  private handlePlaybackStart(): void {
    console.log('Playback started');
    this.isPlaying = true;
    this.io.emit('playback:state', {
      isPlaying: true,
      bpm: this.currentBpm,
      fps: 0,
      startTime: Date.now(),
    });
  }

  private handlePlaybackStop(): void {
    console.log('Playback stopped');
    this.isPlaying = false;
    this.io.emit('playback:state', {
      isPlaying: false,
      bpm: this.currentBpm,
      fps: 0,
      startTime: 0,
    });
  }

  private handleBpmUpdate(bpm: number): void {
    console.log('BPM updated:', bpm);
    this.currentBpm = bpm;
    this.io.emit('bpm:updated', { bpm });
  }

  private handleShaderCreate(shader: ShaderConfig): void {
    const created = this.shaderService.createShader(shader);
    console.log('Shader created:', created.id);
    this.io.emit('shader:created', created);
    this.io.emit('shaders:list', this.shaderService.getAllShaders());
  }

  private handleShaderUpdate(shader: ShaderConfig): void {
    const updated = this.shaderService.updateShader(shader.id, shader);
    if (updated) {
      console.log('Shader updated:', shader.id);
      this.io.emit('shader:updated', updated);
      this.io.emit('shaders:list', this.shaderService.getAllShaders());
    }
  }

  private handleShaderDelete(id: string): void {
    const deleted = this.shaderService.deleteShader(id);
    if (deleted) {
      console.log('Shader deleted:', id);
      this.io.emit('shader:deleted', { id });
      this.io.emit('shaders:list', this.shaderService.getAllShaders());
    }
  }

  /**
   * Receive rendered pixel data from frontend and send via Art-Net
   */
  async sendRenderedData(stripId: number, rgbData: Uint8Array): Promise<void> {
    const strip = this.strips.find((s) => s.id === stripId);
    if (!strip) {
      console.error('Strip not found:', stripId);
      return;
    }

    try {
      await this.artnetService.sendStripData(strip, rgbData);
      this.frameCount++;

      // Update FPS every second
      const now = Date.now();
      if (now - this.lastFpsUpdate >= 1000) {
        const fps = this.frameCount;
        this.frameCount = 0;
        this.lastFpsUpdate = now;
        this.io.emit('fps:update', { fps });
      }
    } catch (error) {
      console.error('Art-Net error:', error);
      this.io.emit('artnet:error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get shader service for external access
   */
  getShaderService(): ShaderService {
    return this.shaderService;
  }
}
