# WLED Monitoring Frontend

Modern React + TypeScript frontend for WLED shader layer management.

## Features

- **Real-time Preview**: See shader effects in real-time via WebSocket
- **Layer Management**: Add, remove, reorder, and configure shader layers
- **All Shader Parameters**: Full control over all shader parameters:
  - Zigzag Chaser
  - Continuous Zigzag Chaser
  - Gradient Sweep
  - Lightning Flash
  - Right to Left
  - Neon Warmup
- **Blend Modes**: Normal, Add, Multiply, Screen
- **Playback Controls**: Play/pause and master brightness control
- **Live FPS Monitoring**: See real-time rendering performance

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Backend Connection

The frontend connects to the backend-rust WebSocket server at `ws://localhost:3001/ws`

Make sure the backend-rust server is running before starting the frontend.

## Usage

1. **Add Layers**: Use the "+ Add Layer" dropdown to add shader layers
2. **Configure Layers**: Click on a layer to expand and edit its parameters
3. **Reorder Layers**: Use ↑/↓ buttons to change layer order
4. **Control Opacity & Blend**: Adjust opacity and blend mode for each layer
5. **Preview**: Watch the real-time preview on the right panel
6. **Play/Pause**: Control the playback with the play/pause button
7. **Adjust Brightness**: Use the master brightness slider

## Architecture

- **React 18** with TypeScript
- **Vite** for fast development and building
- **WebSocket** for real-time communication with backend
- **CSS Variables** for theming
- **Modular Components** for maintainability

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.
