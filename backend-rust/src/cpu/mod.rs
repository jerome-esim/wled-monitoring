mod shaders;

use crate::types::{BlendMode, ShaderLayer, ShaderParams};
use anyhow::Result;
use rayon::prelude::*;

pub struct CpuShaderEngine {
    strip_count: u32,
    led_count: u32,
}

impl CpuShaderEngine {
    pub fn new(strip_count: u32, led_count: u32) -> Result<Self> {
        Ok(Self {
            strip_count,
            led_count,
        })
    }

    pub fn render_layers(
        &mut self,
        layers: &[ShaderLayer],
        global_params: &ShaderParams,
        time: f32,
        master_brightness: f32,
    ) -> Result<Vec<u8>> {
        // Filter and sort enabled layers
        let mut enabled_layers: Vec<_> = layers.iter().filter(|l| l.enabled).collect();
        enabled_layers.sort_by_key(|l| l.order);

        if enabled_layers.is_empty() {
            // Return black
            return Ok(vec![0u8; (self.strip_count * self.led_count * 3) as usize]);
        }

        // Render each layer
        let layer_buffers: Vec<Vec<[f32; 3]>> = enabled_layers
            .iter()
            .map(|layer| {
                let merged_params = self.merge_params(&layer.params, global_params);
                self.render_single_layer(layer, &merged_params, time)
            })
            .collect();

        // Composite layers
        let composited = if enabled_layers.len() > 1 {
            self.composite_layers(&layer_buffers, &enabled_layers)
        } else {
            layer_buffers[0].clone()
        };

        // Convert to RGB u8 with master brightness
        let rgb_data: Vec<u8> = composited
            .par_iter()
            .flat_map(|color| {
                let r = (color[0] * master_brightness * 255.0).clamp(0.0, 255.0) as u8;
                let g = (color[1] * master_brightness * 255.0).clamp(0.0, 255.0) as u8;
                let b = (color[2] * master_brightness * 255.0).clamp(0.0, 255.0) as u8;
                [r, g, b]
            })
            .collect();

        Ok(rgb_data)
    }

    fn render_single_layer(
        &self,
        layer: &ShaderLayer,
        params: &ShaderParams,
        time: f32,
    ) -> Vec<[f32; 3]> {
        let pixel_count = (self.strip_count * self.led_count) as usize;
        let width = self.strip_count as f32;
        let height = self.led_count as f32;

        // Parallel rendering using Rayon
        (0..pixel_count)
            .into_par_iter()
            .map(|i| {
                let x = (i as u32 % self.strip_count) as f32;
                let y = (i as u32 / self.strip_count) as f32;

                // Normalize coordinates 0.0 - 1.0
                let uv = [x / width, y / height];

                // Call appropriate shader
                match layer.shader_id.as_str() {
                    "zigzag-chaser" => shaders::zigzag_chaser(uv, time, params),
                    "gradient-sweep" => shaders::gradient_sweep(uv, time, params),
                    "lightning-flash" => shaders::lightning_flash(uv, time, params),
                    "right-to-left" => shaders::right_to_left(uv, time, params),
                    _ => [0.0, 0.0, 0.0], // Unknown shader = black
                }
            })
            .collect()
    }

    fn composite_layers(
        &self,
        layer_buffers: &[Vec<[f32; 3]>],
        layers: &[&ShaderLayer],
    ) -> Vec<[f32; 3]> {
        let pixel_count = (self.strip_count * self.led_count) as usize;

        (0..pixel_count)
            .into_par_iter()
            .map(|i| {
                let mut final_color = [0.0, 0.0, 0.0];

                // Composite from bottom to top
                for (layer_idx, layer) in layers.iter().enumerate() {
                    let layer_color = layer_buffers[layer_idx][i];
                    let opacity = layer.opacity;

                    final_color = match layer.blend_mode {
                        BlendMode::Normal => blend_normal(final_color, layer_color, opacity),
                        BlendMode::Add => blend_add(final_color, layer_color, opacity),
                        BlendMode::Multiply => blend_multiply(final_color, layer_color, opacity),
                        BlendMode::Screen => blend_screen(final_color, layer_color, opacity),
                    };
                }

                final_color
            })
            .collect()
    }

    fn merge_params(&self, layer: &ShaderParams, global: &ShaderParams) -> ShaderParams {
        ShaderParams {
            color1: layer.color1.or(global.color1),
            color2: layer.color2.or(global.color2),
            speed: layer.speed.or(global.speed),
            intensity: layer.intensity.or(global.intensity),
            density: layer.density.or(global.density),
            chaser_size: layer.chaser_size.or(global.chaser_size),
            trail_length: layer.trail_length.or(global.trail_length),
            reverse: layer.reverse.or(global.reverse),
            direction: layer.direction.or(global.direction),
            bpm: layer.bpm.or(global.bpm),
        }
    }

    pub fn extract_strip_data(&self, rgb_matrix: &[u8], strip_index: u32) -> Vec<u8> {
        let mut strip_data = Vec::with_capacity((self.led_count * 3) as usize);

        for led in 0..self.led_count {
            let pixel_index = ((led * self.strip_count + strip_index) * 3) as usize;
            strip_data.push(rgb_matrix[pixel_index]);
            strip_data.push(rgb_matrix[pixel_index + 1]);
            strip_data.push(rgb_matrix[pixel_index + 2]);
        }

        strip_data
    }
}

// Blend mode functions
fn blend_normal(base: [f32; 3], blend: [f32; 3], alpha: f32) -> [f32; 3] {
    [
        base[0] * (1.0 - alpha) + blend[0] * alpha,
        base[1] * (1.0 - alpha) + blend[1] * alpha,
        base[2] * (1.0 - alpha) + blend[2] * alpha,
    ]
}

fn blend_add(base: [f32; 3], blend: [f32; 3], alpha: f32) -> [f32; 3] {
    [
        (base[0] + blend[0] * alpha).min(1.0),
        (base[1] + blend[1] * alpha).min(1.0),
        (base[2] + blend[2] * alpha).min(1.0),
    ]
}

fn blend_multiply(base: [f32; 3], blend: [f32; 3], alpha: f32) -> [f32; 3] {
    let multiplied = [base[0] * blend[0], base[1] * blend[1], base[2] * blend[2]];
    blend_normal(base, multiplied, alpha)
}

fn blend_screen(base: [f32; 3], blend: [f32; 3], alpha: f32) -> [f32; 3] {
    let screened = [
        1.0 - (1.0 - base[0]) * (1.0 - blend[0]),
        1.0 - (1.0 - base[1]) * (1.0 - blend[1]),
        1.0 - (1.0 - base[2]) * (1.0 - blend[2]),
    ];
    blend_normal(base, screened, alpha)
}
