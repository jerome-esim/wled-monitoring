use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripConfig {
    pub id: u32,
    pub name: String,
    pub universe: u16,
    #[serde(rename = "startChannel")]
    pub start_channel: u16,
    #[serde(rename = "ledCount")]
    pub led_count: u32,
    #[serde(rename = "ipAddress")]
    pub ip_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShaderLayer {
    pub id: String,
    #[serde(rename = "shaderId")]
    pub shader_id: String,
    pub name: String,
    pub enabled: bool,
    pub opacity: f32,
    #[serde(rename = "blendMode")]
    pub blend_mode: BlendMode,
    pub order: i32,
    pub params: ShaderParams,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BlendMode {
    Normal,
    Add,
    Multiply,
    Screen,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShaderParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color1: Option<[f32; 4]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color2: Option<[f32; 4]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intensity: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub density: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "chaserSize")]
    pub chaser_size: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "trailLength")]
    pub trail_length: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reverse: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction: Option<[f32; 2]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bpm: Option<f32>,
}

impl Default for ShaderParams {
    fn default() -> Self {
        Self {
            color1: Some([1.0, 0.0, 0.0, 1.0]),
            color2: Some([0.0, 0.0, 1.0, 1.0]),
            speed: Some(1.0),
            intensity: Some(1.0),
            density: Some(1.0),
            chaser_size: Some(0.05),
            trail_length: Some(0.1),
            reverse: Some(0.0),
            direction: Some([1.0, 0.0]),
            bpm: Some(120.0),
        }
    }
}

// WebSocket messages from frontend
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ClientMessage {
    #[serde(rename_all = "camelCase")]
    UpdateLayers { layers: Vec<ShaderLayer> },
    #[serde(rename_all = "camelCase")]
    UpdateStrips { strips: Vec<StripConfig> },
    #[serde(rename_all = "camelCase")]
    UpdateGlobalParams { params: ShaderParams },
    #[serde(rename_all = "camelCase")]
    SetPlaying { playing: bool },
    #[serde(rename_all = "camelCase")]
    SetMasterBrightness { brightness: f32 },
}

// WebSocket messages to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ServerMessage {
    #[serde(rename_all = "camelCase")]
    FpsUpdate { fps: u32 },
    #[serde(rename_all = "camelCase")]
    FrameUpdate {
        data: String, // base64 encoded RGB data
        width: u32,
        height: u32,
    },
    #[serde(rename_all = "camelCase")]
    Error { message: String },
}
