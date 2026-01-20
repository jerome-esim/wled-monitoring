mod artnet;
mod cpu;
mod types;
mod websocket;

use artnet::ArtNetSender;
use cpu::CpuShaderEngine;
use tokio::sync::{broadcast, mpsc};
use tokio::time::{interval, Duration, Instant};
use tracing::{error, info};
use types::{ClientMessage, ServerMessage, ShaderLayer, ShaderParams, StripConfig};
use websocket::WebSocketServer;

const TARGET_FPS: u32 = 40;
const FRAME_INTERVAL_MS: u64 = 1000 / TARGET_FPS as u64;

struct AppState {
    strips: Vec<StripConfig>,
    layers: Vec<ShaderLayer>,
    global_params: ShaderParams,
    master_brightness: f32,
    is_playing: bool,
    start_time: Instant,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            strips: Vec::new(),
            layers: Vec::new(),
            global_params: ShaderParams::default(),
            master_brightness: 1.0,
            is_playing: false,
            start_time: Instant::now(),
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter("wled_backend=debug,warn")
        .init();

    info!("🚀 Starting WLED Rust Backend (CPU-accelerated)");

    // Initialize CPU shader engine (13 strips × 250 LEDs)
    info!("Initializing CPU shader engine...");
    let mut cpu_engine = CpuShaderEngine::new(13, 250)?;
    info!("✅ CPU engine ready");

    // Initialize Art-Net sender
    info!("Initializing Art-Net sender...");
    let mut artnet_sender = ArtNetSender::new()?;
    info!("✅ Art-Net sender ready");

    // Create command channel for WebSocket → Engine communication
    let (command_tx, mut command_rx) = mpsc::unbounded_channel();

    // Create broadcast channel for Engine → WebSocket communication (frames, FPS, etc.)
    let (broadcast_tx, _) = broadcast::channel::<ServerMessage>(100);

    // Start WebSocket server
    let ws_server = WebSocketServer::new(command_tx, broadcast_tx.clone());
    let app = ws_server.create_router();

    info!("Starting WebSocket server on 0.0.0.0:3001...");
    tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
            .await
            .expect("Failed to bind WebSocket server");
        axum::serve(listener, app)
            .await
            .expect("Failed to run WebSocket server");
    });
    info!("✅ WebSocket server running on ws://0.0.0.0:3001/ws");

    // Application state
    let mut state = AppState::default();

    // Main render loop
    let mut ticker = interval(Duration::from_millis(FRAME_INTERVAL_MS));
    let mut frame_count = 0u64;
    let mut last_fps_report = Instant::now();

    info!("🎨 Render loop starting at {} FPS", TARGET_FPS);

    loop {
        ticker.tick().await;

        // Process incoming commands (non-blocking)
        while let Ok(cmd) = command_rx.try_recv() {
            match cmd {
                ClientMessage::UpdateLayers { layers } => {
                    info!("Updated {} layers", layers.len());
                    state.layers = layers;
                }
                ClientMessage::UpdateStrips { strips } => {
                    info!("Updated {} strips", strips.len());
                    state.strips = strips;
                }
                ClientMessage::UpdateGlobalParams { params } => {
                    state.global_params = params;
                }
                ClientMessage::SetPlaying { playing } => {
                    state.is_playing = playing;
                    if playing {
                        state.start_time = Instant::now();
                        info!("▶️  Playback started");
                    } else {
                        info!("⏸️  Playback paused");
                    }
                }
                ClientMessage::SetMasterBrightness { brightness } => {
                    state.master_brightness = brightness;
                    info!("💡 Master brightness: {}%", (brightness * 100.0) as u32);
                }
            }
        }

        // Skip rendering if not playing or no strips configured
        if !state.is_playing || state.strips.is_empty() {
            continue;
        }

        // Calculate current time
        let current_time = state.start_time.elapsed().as_secs_f32();

        // Render layers to RGB matrix
        let rgb_matrix = match cpu_engine.render_layers(
            &state.layers,
            &state.global_params,
            current_time,
            state.master_brightness,
        ) {
            Ok(data) => data,
            Err(e) => {
                error!("Render error: {}", e);
                continue;
            }
        };

        // Extract and send data for each strip
        let mut strip_data = Vec::new();
        for strip in &state.strips {
            let data = cpu_engine.extract_strip_data(&rgb_matrix, strip.id - 1); // 0-indexed
            strip_data.push((strip.id, data));
        }

        // Send Art-Net packets (async, non-blocking)
        if let Err(e) = artnet_sender.send_batch(&state.strips, &strip_data).await {
            error!("Art-Net send error: {}", e);
        }

        // Send frame to WebSocket clients for preview (every frame)
        let frame_base64 = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &rgb_matrix,
        );
        let _ = broadcast_tx.send(ServerMessage::FrameUpdate {
            data: frame_base64,
            width: 13,
            height: 250,
        });

        // FPS reporting (every second)
        frame_count += 1;
        if last_fps_report.elapsed().as_secs() >= 1 {
            let fps = frame_count as u32;
            info!("📊 FPS: {} | Layers: {} | Strips: {}", fps, state.layers.len(), state.strips.len());

            // Send FPS to WebSocket clients
            let _ = broadcast_tx.send(ServerMessage::FpsUpdate { fps });

            frame_count = 0;
            last_fps_report = Instant::now();
        }
    }
}
