use crate::types::{BlendMode, ShaderLayer, ShaderParams};
use anyhow::Result;
use bytemuck::{Pod, Zeroable};
use std::collections::HashMap;
use wgpu::util::DeviceExt;

// Shader uniforms aligned to 16 bytes for GPU
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
    bpm: f32,
    direction: [f32; 2],

    _padding: [f32; 4], // Align to 16 bytes
}

pub struct ComputeShader {
    pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
}

pub struct GpuShaderEngine {
    device: wgpu::Device,
    queue: wgpu::Queue,
    strip_count: u32,
    led_count: u32,

    // Buffers
    output_buffer: wgpu::Buffer,
    staging_buffer: wgpu::Buffer,
    uniform_buffer: wgpu::Buffer,

    // Shaders
    shaders: HashMap<String, ComputeShader>,

    // Layer rendering
    layer_buffers: Vec<wgpu::Buffer>,
    composite_pipeline: Option<wgpu::ComputePipeline>,
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

        let pixel_count = strip_count * led_count;
        let buffer_size = (pixel_count * 4) as u64; // RGBA

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

        // Uniform buffer
        let uniform_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Uniform Buffer"),
            size: std::mem::size_of::<ShaderUniforms>() as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let mut engine = Self {
            device,
            queue,
            strip_count,
            led_count,
            output_buffer,
            staging_buffer,
            uniform_buffer,
            shaders: HashMap::new(),
            layer_buffers: Vec::new(),
            composite_pipeline: None,
        };

        // Compile built-in shaders
        engine.compile_builtin_shaders()?;

        Ok(engine)
    }

    fn compile_builtin_shaders(&mut self) -> Result<()> {
        // Zigzag Chaser shader
        self.compile_shader("zigzag-chaser", include_str!("shaders/zigzag_chaser.wgsl"))?;

        // Gradient shader
        self.compile_shader("gradient-sweep", include_str!("shaders/gradient.wgsl"))?;

        // Lightning shader
        self.compile_shader("lightning-flash", include_str!("shaders/lightning.wgsl"))?;

        Ok(())
    }

    pub fn compile_shader(&mut self, shader_id: &str, wgsl_source: &str) -> Result<()> {
        let shader_module = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("Shader: {}", shader_id)),
            source: wgpu::ShaderSource::Wgsl(wgsl_source.into()),
        });

        // Create bind group layout
        let bind_group_layout = self.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some(&format!("Bind Group Layout: {}", shader_id)),
            entries: &[
                // Output buffer (storage)
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Uniform buffer
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        let pipeline_layout = self.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some(&format!("Pipeline Layout: {}", shader_id)),
            bind_group_layouts: &[&bind_group_layout],
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

        self.shaders.insert(
            shader_id.to_string(),
            ComputeShader {
                pipeline: compute_pipeline,
                bind_group_layout,
            },
        );

        Ok(())
    }

    pub async fn render_layers(
        &mut self,
        layers: &[ShaderLayer],
        global_params: &ShaderParams,
        time: f32,
        master_brightness: f32,
    ) -> Result<Vec<u8>> {
        // Filter enabled layers
        let enabled_layers: Vec<_> = layers.iter().filter(|l| l.enabled).collect();

        if enabled_layers.is_empty() {
            // Return black
            return Ok(vec![0u8; (self.strip_count * self.led_count * 3) as usize]);
        }

        // For now: render first enabled layer only
        // TODO: Implement multi-layer compositing
        let layer = enabled_layers[0];
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
            bpm: merged_params.bpm.unwrap_or(120.0),
            direction: merged_params.direction.unwrap_or([1.0, 0.0]),
            _padding: [0.0; 4],
        };

        // Upload uniforms to GPU
        self.queue.write_buffer(&self.uniform_buffer, 0, bytemuck::bytes_of(&uniforms));

        // Get shader pipeline
        let shader = self.shaders.get(&layer.shader_id)
            .ok_or_else(|| anyhow::anyhow!("Shader not found: {}", layer.shader_id))?;

        // Create bind group
        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Shader Bind Group"),
            layout: &shader.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: self.output_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: self.uniform_buffer.as_entire_binding(),
                },
            ],
        });

        // Create command encoder
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Compute Encoder"),
        });

        // Dispatch compute shader
        {
            let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Compute Pass"),
                timestamp_writes: None,
            });

            compute_pass.set_pipeline(&shader.pipeline);
            compute_pass.set_bind_group(0, &bind_group, &[]);

            // Dispatch workgroups (8x8 threads per workgroup)
            let workgroup_x = (self.strip_count + 7) / 8;
            let workgroup_y = (self.led_count + 7) / 8;
            compute_pass.dispatch_workgroups(workgroup_x, workgroup_y, 1);
        }

        // Copy output to staging buffer
        encoder.copy_buffer_to_buffer(
            &self.output_buffer,
            0,
            &self.staging_buffer,
            0,
            (self.strip_count * self.led_count * 4) as u64,
        );

        // Submit commands
        self.queue.submit(Some(encoder.finish()));

        // Read back data from staging buffer
        let buffer_slice = self.staging_buffer.slice(..);
        let (sender, receiver) = futures_intrusive::channel::shared::oneshot_channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            sender.send(result).unwrap();
        });

        self.device.poll(wgpu::Maintain::Wait);
        receiver.receive().await.ok_or_else(|| anyhow::anyhow!("Failed to map buffer"))??;

        let data = buffer_slice.get_mapped_range();
        let rgba_data: Vec<u8> = data.to_vec();
        drop(data);
        self.staging_buffer.unmap();

        // Convert RGBA to RGB and apply master brightness
        let mut rgb_data = Vec::with_capacity((self.strip_count * self.led_count * 3) as usize);
        for i in 0..(self.strip_count * self.led_count) as usize {
            let r = (rgba_data[i * 4] as f32 * master_brightness) as u8;
            let g = (rgba_data[i * 4 + 1] as f32 * master_brightness) as u8;
            let b = (rgba_data[i * 4 + 2] as f32 * master_brightness) as u8;
            rgb_data.push(r);
            rgb_data.push(g);
            rgb_data.push(b);
        }

        Ok(rgb_data)
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
