// Lightning Flash Compute Shader

struct Uniforms {
    time: f32,
    width: f32,
    height: f32,
    speed: f32,

    color1: vec4<f32>,
    color2: vec4<f32>,

    intensity: f32,
    density: f32,
    chaser_size: f32,
    trail_length: f32,

    reverse: f32,
    bpm: f32,
    direction: vec2<f32>,

    _padding: vec4<f32>,
}

@group(0) @binding(0)
var<storage, read_write> output: array<vec4<f32>>;

@group(0) @binding(1)
var<uniform> uniforms: Uniforms;

// Simple hash function for pseudo-random
fn hash(n: f32) -> f32 {
    return fract(sin(n) * 43758.5453123);
}

// Noise function
fn noise(x: f32) -> f32 {
    let i = floor(x);
    let f = fract(x);
    return mix(hash(i), hash(i + 1.0), smoothstep(0.0, 1.0, f));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let width = u32(uniforms.width);
    let height = u32(uniforms.height);

    let x = global_id.x;
    let y = global_id.y;

    if (x >= width || y >= height) {
        return;
    }

    let index = y * width + x;
    let uv_x = f32(x) / uniforms.width;
    let uv_y = f32(y) / uniforms.height;

    // BPM-synced trigger
    let beat = fract(uniforms.time * uniforms.bpm / 60.0);
    var trigger = 0.0;
    if (beat < 0.1) {
        trigger = 1.0;
    }

    // Random lightning position
    let lightning_time = floor(uniforms.time * uniforms.bpm / 60.0);
    let random_x = hash(lightning_time * 3.14159);

    // Distance from lightning center
    var dist = abs(uv_x - random_x);

    // Lightning bolt with noise
    let noise_offset = noise(uv_y * 20.0 + uniforms.time * 10.0) * 0.05;
    dist += noise_offset;

    // Lightning width and intensity
    var lightning = smoothstep(0.15, 0.0, dist) * trigger * uniforms.intensity;

    // Add some vertical variation
    let vertical_noise = noise(uv_y * 15.0 + lightning_time);
    lightning *= vertical_noise * 0.5 + 0.5;

    // Flash effect (full screen white flash)
    let flash = trigger * uniforms.intensity * 0.3 * exp(-beat * 10.0);

    let final_color = uniforms.color1.rgb * (lightning + flash);
    let alpha = lightning + flash;

    // Convert to 0-255 range
    output[index] = vec4<f32>(final_color * 255.0, alpha * 255.0);
}
