// Zigzag Chaser Compute Shader
// Port of the original ISF shader to WGSL

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

    var color = vec3<f32>(0.0, 0.0, 0.0);

    let current_col = f32(x);
    let num_chasers = i32(clamp(uniforms.density, 1.0, 10.0));
    let total_cells = uniforms.width * uniforms.height;

    let chaser_size_cells = uniforms.chaser_size * uniforms.height;
    let trail_length_cells = uniforms.trail_length * uniforms.height;
    let total_length = chaser_size_cells + trail_length_cells;

    // Process each chaser
    for (var c = 0; c < 10; c++) {
        if (c >= num_chasers) {
            break;
        }

        let offset = (f32(c) / uniforms.density) * total_cells;
        let animated_pos = uniforms.time * uniforms.speed * 50.0;
        let global_pos = (animated_pos + offset) % total_cells;

        // Check pixels for this chaser (head + trail)
        for (var i = 0.0; i < 200.0; i += 1.0) {
            if (i > total_length * 1.5) {
                break;
            }

            // Global position of this pixel in the chaser
            let pixel_global_pos = (global_pos - (i / uniforms.height) * uniforms.height) % total_cells;

            // Which column for this pixel
            let pixel_column = floor(pixel_global_pos / uniforms.height);
            let pos_in_column = pixel_global_pos % uniforms.height;

            // Only if we're on the correct column
            if (abs(pixel_column - current_col) < 0.5) {
                // Direction for this column (zigzag)
                var column_goes_down = (u32(pixel_column) % 2u) == 0u;

                // Apply reverse if needed
                if (uniforms.reverse > 0.5) {
                    column_goes_down = !column_goes_down;
                }

                // Y position of this pixel
                var pixel_y: f32;
                if (column_goes_down) {
                    pixel_y = (uniforms.height - pos_in_column - 1.0) / uniforms.height;
                } else {
                    pixel_y = pos_in_column / uniforms.height;
                }

                // Distance to this pixel
                let dist_y = abs(uv_y - pixel_y);
                let dist_cells = dist_y * uniforms.height;

                // Calculate intensity
                if (dist_cells < 1.0) {
                    var pixel_intensity = 0.0;

                    if (i < chaser_size_cells) {
                        // Head - full brightness
                        pixel_intensity = 1.0;
                    } else {
                        // Trail - fading
                        let trail_pos = i - chaser_size_cells;
                        pixel_intensity = 1.0 - (trail_pos / trail_length_cells);
                        pixel_intensity *= 0.5;
                    }

                    color += uniforms.color1.rgb * pixel_intensity;
                }
            }
        }
    }

    color = clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));

    // Convert to 0-255 range
    output[index] = vec4<f32>(color * 255.0, 255.0);
}
