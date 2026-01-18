// Layer Compositing Compute Shader
// Composes multiple layers with blend modes

struct CompositeUniforms {
    width: f32,
    height: f32,
    layer_count: u32,
    _padding: u32,

    // Up to 8 layers
    opacities: array<f32, 8>,
    blend_modes: array<u32, 8>, // 0=normal, 1=add, 2=multiply, 3=screen
}

@group(0) @binding(0)
var<storage, read> layer0: array<vec4<f32>>;

@group(0) @binding(1)
var<storage, read> layer1: array<vec4<f32>>;

@group(0) @binding(2)
var<storage, read> layer2: array<vec4<f32>>;

@group(0) @binding(3)
var<storage, read> layer3: array<vec4<f32>>;

@group(0) @binding(4)
var<storage, read> layer4: array<vec4<f32>>;

@group(0) @binding(5)
var<storage, read> layer5: array<vec4<f32>>;

@group(0) @binding(6)
var<storage, read> layer6: array<vec4<f32>>;

@group(0) @binding(7)
var<storage, read> layer7: array<vec4<f32>>;

@group(0) @binding(8)
var<storage, read_write> output: array<vec4<f32>>;

@group(0) @binding(9)
var<uniform> uniforms: CompositeUniforms;

fn blend_normal(base: vec3<f32>, blend: vec3<f32>, alpha: f32) -> vec3<f32> {
    return mix(base, blend, alpha);
}

fn blend_add(base: vec3<f32>, blend: vec3<f32>, alpha: f32) -> vec3<f32> {
    return base + blend * alpha;
}

fn blend_multiply(base: vec3<f32>, blend: vec3<f32>, alpha: f32) -> vec3<f32> {
    return mix(base, base * blend, alpha);
}

fn blend_screen(base: vec3<f32>, blend: vec3<f32>, alpha: f32) -> vec3<f32> {
    let result = vec3<f32>(1.0) - (vec3<f32>(1.0) - base) * (vec3<f32>(1.0) - blend);
    return mix(base, result, alpha);
}

fn apply_blend(base: vec3<f32>, blend: vec3<f32>, alpha: f32, mode: u32) -> vec3<f32> {
    if (mode == 0u) {
        return blend_normal(base, blend, alpha);
    } else if (mode == 1u) {
        return blend_add(base, blend, alpha);
    } else if (mode == 2u) {
        return blend_multiply(base, blend, alpha);
    } else if (mode == 3u) {
        return blend_screen(base, blend, alpha);
    }
    return base;
}

fn get_layer_color(layer_index: u32, pixel_index: u32) -> vec4<f32> {
    if (layer_index == 0u) {
        return layer0[pixel_index];
    } else if (layer_index == 1u) {
        return layer1[pixel_index];
    } else if (layer_index == 2u) {
        return layer2[pixel_index];
    } else if (layer_index == 3u) {
        return layer3[pixel_index];
    } else if (layer_index == 4u) {
        return layer4[pixel_index];
    } else if (layer_index == 5u) {
        return layer5[pixel_index];
    } else if (layer_index == 6u) {
        return layer6[pixel_index];
    } else if (layer_index == 7u) {
        return layer7[pixel_index];
    }
    return vec4<f32>(0.0);
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

    // Start with black
    var final_color = vec3<f32>(0.0);

    // Composite layers from bottom to top (order 0 to N)
    for (var i = 0u; i < uniforms.layer_count; i++) {
        let layer_color_rgba = get_layer_color(i, index);
        let layer_color = layer_color_rgba.rgb / 255.0; // Convert from 0-255 to 0-1
        let layer_alpha = layer_color_rgba.a / 255.0;

        let opacity = uniforms.opacities[i] * layer_alpha;
        let blend_mode = uniforms.blend_modes[i];

        final_color = apply_blend(final_color, layer_color, opacity, blend_mode);
    }

    // Convert back to 0-255 range
    output[index] = vec4<f32>(final_color * 255.0, 255.0);
}
