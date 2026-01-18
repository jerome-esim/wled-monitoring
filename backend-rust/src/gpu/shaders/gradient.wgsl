// Gradient Sweep Compute Shader

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
    let uv = vec2<f32>(uv_x, uv_y);

    // Use dot product to get gradient position based on direction vector
    let pos = (dot(uv, uniforms.direction) + uniforms.time * uniforms.speed) % 1.0;

    // Mix between color1 and color2
    let color = mix(uniforms.color1.rgb, uniforms.color2.rgb, pos);

    // Convert to 0-255 range
    output[index] = vec4<f32>(color * 255.0, 255.0);
}
