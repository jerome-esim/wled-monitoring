use crate::types::ClientMessage;
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    routing::get,
    Router,
};
use tokio::sync::mpsc;
use tower_http::cors::{Any, CorsLayer};

pub struct WebSocketServer {
    command_tx: mpsc::UnboundedSender<ClientMessage>,
}

impl WebSocketServer {
    pub fn new(command_tx: mpsc::UnboundedSender<ClientMessage>) -> Self {
        Self { command_tx }
    }

    pub fn create_router(self) -> Router {
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        Router::new()
            .route("/ws", get(move |ws: WebSocketUpgrade| async move {
                ws.on_upgrade(move |socket| handle_socket(socket, self.command_tx.clone()))
            }))
            .layer(cors)
    }
}

async fn handle_socket(mut socket: WebSocket, command_tx: mpsc::UnboundedSender<ClientMessage>) {
    tracing::info!("✅ New WebSocket connection established");

    // Receive messages from client
    while let Some(Ok(msg)) = socket.recv().await {
        if let Message::Text(text) = msg {
            tracing::info!("📩 Received message: {}", &text[..text.len().min(200)]); // Log first 200 chars

            match serde_json::from_str::<ClientMessage>(&text) {
                Ok(cmd) => {
                    tracing::info!("✅ Parsed command: {:?}", cmd);
                    if command_tx.send(cmd).is_err() {
                        tracing::error!("Failed to send command to engine");
                        break;
                    }
                }
                Err(e) => {
                    tracing::error!("❌ Failed to parse message: {}", e);
                    tracing::error!("   Raw message: {}", text);
                }
            }
        }
    }
    tracing::info!("WebSocket connection closed");
}
