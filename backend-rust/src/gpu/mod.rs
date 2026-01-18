use crate::types::{BlendMode, ShaderLayer, ShaderParams};
use anyhow::Result;
use bytemuck::{Pod, Zeroable};
use std::collections::HashMap;
use wgpu::util::DeviceExt;

#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
struct ShaderUniforms {
    time: f32,
    width: f32,
    height: f32,
    speed: f32,
    color1: [f32; 4],
    color2: [f32; 4],
    intensity: f32,
    density: f32,
    chaser_size: f32,
    trail_length: f32,
    reverse: f32,
    direction: [f32; 2],
    bpm: f32,
    _padding: [f32; 2], // Align to 16 bytes
}

pub struct GpuShaderEngine {
    device: wgpu::Device,
    queue: wgpu::Queue,
    strip_count: u32,
    led_count: u32,
    output_buffer: wgpu::Buffer,
    staging_buffer: wgpu::Buffer,
    pipelines: HashMap<String, wgpu::ComputePipeline>,
}

impl GpuShaderEngine {
    pub async fn new(strip_count: u32, led_count: u32) -> Result<Self> {
        // Initialize wgpu
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| anyhow::anyhow!("Failed to find suitable GPU adapter"))?;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("LED Shader Device"),
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::default(),
                    memory_hints: wgpu::MemoryHints::Performance,
                },
                None,
            )
            .await?;

        let buffer_size = (strip_count * led_count * 4) as u64; // RGBA

        // Output buffer (GPU)
        let output_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Output Buffer"),
            size: buffer_size,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        // Staging buffer (CPU-readable)
        let staging_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Staging Buffer"),
            size: buffer_size,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        Ok(Self {
            device,
            queue,
            strip_count,
            led_count,
            output_buffer,
            staging_buffer,
            pipelines: HashMap::new(),
        })
    }

    pub fn compile_shader(&mut self, shader_id: &str, wgsl_source: &str) -> Result<()> {
        let shader_module = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("Shader: {}", shader_id)),
            source: wgpu::ShaderSource::Wgsl(wgsl_source.into()),
        });

        let pipeline_layout = self.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some(&format!("Pipeline Layout: {}", shader_id)),
            bind_group_layouts: &[],
            push_constant_ranges: &[],
        });

        let compute_pipeline = self.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some(&format!("Compute Pipeline: {}", shader_id)),
            layout: Some(&pipeline_layout),
            module: &shader_module,
            entry_point: "main",
            compilation_options: Default::default(),
            cache: None,
        });

        self.pipelines.insert(shader_id.to_string(), compute_pipeline);
        Ok(())
    }

    pub async fn render_layers(
        &mut self,
        layers: &[ShaderLayer],
        global_params: &ShaderParams,
        time: f32,
        master_brightness: f32,
    ) -> Result<Vec<u8>> {
        // For now, simple implementation: render first enabled layer
        // TODO: Implement proper layer compositing with blend modes

        let enabled_layer = layers.iter().find(|l| l.enabled);

        if let Some(layer) = enabled_layer {
            // Merge layer params with global params
            let merged_params = self.merge_params(&layer.params, global_params);

            // Create uniforms
            let uniforms = ShaderUniforms {
                time,
                width: self.strip_count as f32,
                height: self.led_count as f32,
                speed: merged_params.speed.unwrap_or(1.0),
                color1: merged_params.color1.unwrap_or([1.0, 0.0, 0.0, 1.0]),
                color2: merged_params.color2.unwrap_or([0.0, 0.0, 1.0, 1.0]),
                intensity: merged_params.intensity.unwrap_or(1.0),
                density: merged_params.density.unwrap_or(1.0),
                chaser_size: merged_params.chaser_size.unwrap_or(0.05),
                trail_length: merged_params.trail_length.unwrap_or(0.1),
                reverse: merged_params.reverse.unwrap_or(0.0),
                direction: merged_params.direction.unwrap_or([1.0, 0.0]),
                bpm: merged_params.bpm.unwrap_or(120.0),
                _padding: [0.0; 2],
            };

            // For simple demo: create CPU-side render
            // TODO: Replace with actual compute shader dispatch
            let rgb_data = self.render_cpu_fallback(&uniforms, master_brightness);
            Ok(rgb_data)
        } else {
            // No enabled layers - return black
            Ok(vec![0u8; (self.strip_count * self.led_count * 3) as usize])
        }
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

    // Temporary CPU fallback - will be replaced with compute shaders
    fn render_cpu_fallback(&self, uniforms: &ShaderUniforms, master_brightness: f32) -> Vec<u8> {
        let total_pixels = (self.strip_count * self.led_count) as usize;
        let mut rgb_data = vec![0u8; total_pixels * 3];

        // Simple gradient effect as fallback
        for strip in 0..self.strip_count {
            for led in 0..self.led_count {
                let pixel_index = ((led * self.strip_count + strip) * 3) as usize;
                let t = (led as f32 / self.led_count as f32 + uniforms.time * uniforms.speed * 0.1) % 1.0;

                let r = (uniforms.color1[0] * (1.0 - t) + uniforms.color2[0] * t) * 255.0 * master_brightness;
                let g = (uniforms.color1[1] * (1.0 - t) + uniforms.color2[1] * t) * 255.0 * master_brightness;
                let b = (uniforms.color1[2] * (1.0 - t) + uniforms.color2[2] * t) * 255.0 * master_brightness;

                rgb_data[pixel_index] = r as u8;
                rgb_data[pixel_index + 1] = g as u8;
                rgb_data[pixel_index + 2] = b as u8;
            }
        }

        rgb_data
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
