use crate::types::{ClientMessage, ServerMessage};
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use tokio::sync::{broadcast, mpsc};
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct WebSocketServer {
    command_tx: mpsc::UnboundedSender<ClientMessage>,
    broadcast_tx: broadcast::Sender<ServerMessage>,
}

impl WebSocketServer {
    pub fn new(
        command_tx: mpsc::UnboundedSender<ClientMessage>,
        broadcast_tx: broadcast::Sender<ServerMessage>,
    ) -> Self {
        Self {
            command_tx,
            broadcast_tx,
        }
    }

    pub fn create_router(self) -> Router {
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        Router::new()
            .route(
                "/ws",
                get(move |ws: WebSocketUpgrade| async move {
                    ws.on_upgrade(move |socket| {
                        handle_socket(socket, self.command_tx.clone(), self.broadcast_tx.clone())
                    })
                }),
            )
            .layer(cors)
    }
}

async fn handle_socket(
    socket: WebSocket,
    command_tx: mpsc::UnboundedSender<ClientMessage>,
    broadcast_tx: broadcast::Sender<ServerMessage>,
) {
    tracing::info!("✅ New WebSocket connection established");

    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Subscribe to broadcast messages
    let mut broadcast_rx = broadcast_tx.subscribe();

    // Spawn task to forward broadcast messages to client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = broadcast_rx.recv().await {
            if let Ok(json) = serde_json::to_string(&msg) {
                if ws_sender.send(Message::Text(json)).await.is_err() {
                    break;
                }
            }
        }
    });

    // Receive messages from client
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            if let Message::Text(text) = msg {
                tracing::info!("📩 Received message: {}", &text[..text.len().min(200)]);

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
    });

    // Wait for either task to finish
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    tracing::info!("WebSocket connection closed");
}
