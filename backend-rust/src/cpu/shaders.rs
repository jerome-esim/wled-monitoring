use crate::types::ShaderParams;

/// Zigzag Chaser shader - moving chasers with trails in zigzag pattern
pub fn zigzag_chaser(uv: [f32; 2], time: f32, params: &ShaderParams) -> [f32; 3] {
    let speed = params.speed.unwrap_or(1.0);
    let color1 = params.color1.unwrap_or([1.0, 0.0, 0.0, 1.0]);
    let color2 = params.color2.unwrap_or([0.0, 0.0, 1.0, 1.0]);
    let density = params.density.unwrap_or(1.0).clamp(1.0, 10.0);
    let chaser_size = params.chaser_size.unwrap_or(0.05);
    let trail_length = params.trail_length.unwrap_or(0.1);
    let reverse = params.reverse.unwrap_or(0.0);

    let num_chasers = density as i32;

    // Convert UV to zigzag position (0.0 - 1.0)
    // Vertical zigzag: down first column, up second column, down third, etc.
    // Each "column" is a LED position (uv[1]), movement is across strips (uv[0])
    let strip_count = 13.0;
    let led_count = 250.0;

    // Which LED column are we in? (0 to 249)
    let col_idx = (uv[1] * led_count).floor() as i32;

    // Position within this column (across strips)
    let strip_pos = if col_idx % 2 == 0 {
        uv[0]  // Even column: go down strips (0.0 -> 1.0)
    } else {
        1.0 - uv[0]  // Odd column: go up strips (1.0 -> 0.0)
    };

    // Linear position along the entire zigzag path (0.0 - 1.0)
    // Each column contributes 1/led_count to the total
    let linear_pos = (col_idx as f32 + strip_pos) / led_count;

    let mut final_color = [0.0, 0.0, 0.0];

    for i in 0..num_chasers {
        let chaser_offset = i as f32 / num_chasers as f32;
        let mut chaser_pos = (time * speed * 0.5 + chaser_offset).fract();

        if reverse > 0.5 {
            chaser_pos = 1.0 - chaser_pos;
        }

        // Distance from chaser head (no wrap around for linear zigzag)
        let dist = (linear_pos - chaser_pos).abs();

        // Head brightness
        if dist < chaser_size {
            let head_brightness = 1.0 - (dist / chaser_size);
            let t = i as f32 / num_chasers.max(1) as f32;
            let chaser_color = mix_color(color1, color2, t);

            final_color[0] = f32::max(final_color[0], chaser_color[0] * head_brightness);
            final_color[1] = f32::max(final_color[1], chaser_color[1] * head_brightness);
            final_color[2] = f32::max(final_color[2], chaser_color[2] * head_brightness);
        }
        // Trail
        else if dist < trail_length {
            let trail_brightness = 1.0 - (dist / trail_length);
            let trail_brightness = trail_brightness * trail_brightness; // Exponential fade
            let t = i as f32 / num_chasers.max(1) as f32;
            let chaser_color = mix_color(color1, color2, t);

            final_color[0] = f32::max(final_color[0], chaser_color[0] * trail_brightness * 0.5);
            final_color[1] = f32::max(final_color[1], chaser_color[1] * trail_brightness * 0.5);
            final_color[2] = f32::max(final_color[2], chaser_color[2] * trail_brightness * 0.5);
        }
    }

    final_color
}

/// Gradient Sweep shader - directional color gradient
pub fn gradient_sweep(uv: [f32; 2], time: f32, params: &ShaderParams) -> [f32; 3] {
    let speed = params.speed.unwrap_or(1.0);
    let color1 = params.color1.unwrap_or([1.0, 0.0, 0.0, 1.0]);
    let color2 = params.color2.unwrap_or([0.0, 0.0, 1.0, 1.0]);
    let direction = params.direction.unwrap_or([1.0, 0.0]);
    let intensity = params.intensity.unwrap_or(1.0);

    // Normalize direction
    let dir_len = (direction[0] * direction[0] + direction[1] * direction[1]).sqrt();
    let dir_norm = if dir_len > 0.0 {
        [direction[0] / dir_len, direction[1] / dir_len]
    } else {
        [1.0, 0.0]
    };

    // Project UV onto direction vector
    let projected = uv[0] * dir_norm[0] + uv[1] * dir_norm[1];

    // Animated position
    let animated_pos = (projected + time * speed * 0.2).fract();

    // Mix colors based on position
    let color = mix_color(color1, color2, animated_pos);

    [
        color[0] * intensity,
        color[1] * intensity,
        color[2] * intensity,
    ]
}

/// Lightning Flash shader - BPM-synced lightning effect
pub fn lightning_flash(uv: [f32; 2], time: f32, params: &ShaderParams) -> [f32; 3] {
    let bpm = params.bpm.unwrap_or(120.0);
    let color1 = params.color1.unwrap_or([1.0, 1.0, 1.0, 1.0]);
    let intensity = params.intensity.unwrap_or(1.0);

    // Beat timing
    let beat_duration = 60.0 / bpm;
    let beat_phase = (time / beat_duration).fract();

    // Lightning only happens at the start of each beat
    let flash_duration = 0.15; // 15% of beat

    if beat_phase > flash_duration {
        return [0.0, 0.0, 0.0]; // Dark between flashes
    }

    // Flash intensity (quick rise, exponential decay)
    let flash_t = beat_phase / flash_duration;
    let flash_intensity = if flash_t < 0.1 {
        // Quick rise
        flash_t / 0.1
    } else {
        // Exponential decay
        let decay_t = (flash_t - 0.1) / 0.9;
        (1.0 - decay_t * decay_t).max(0.0)
    };

    // Add some noise/variation based on position
    let noise_val = simple_noise(uv[0] * 10.0 + time, uv[1] * 10.0);
    let variation = 0.7 + noise_val * 0.3;

    let final_intensity = flash_intensity * variation * intensity;

    [
        color1[0] * final_intensity,
        color1[1] * final_intensity,
        color1[2] * final_intensity,
    ]
}

/// Right to Left shader - Each strip lights up from right to left
pub fn right_to_left(uv: [f32; 2], time: f32, params: &ShaderParams) -> [f32; 3] {
    let speed = params.speed.unwrap_or(1.0);
    let color1 = params.color1.unwrap_or([0.0, 1.0, 1.0, 1.0]); // Cyan par défaut
    let color2 = params.color2.unwrap_or([1.0, 0.0, 1.0, 1.0]); // Magenta par défaut
    let trail_length = params.trail_length.unwrap_or(0.2);

    // Position qui se déplace de droite (1.0) vers gauche (0.0)
    let wave_pos = (time * speed * 0.3).fract();

    // uv[1] = position sur la LED (0.0 = LED 0, 1.0 = LED 249)
    // On inverse pour aller de droite à gauche
    let led_pos = 1.0 - uv[1];

    // Distance de la vague
    let dist = (led_pos - wave_pos).abs();

    // Intensité basée sur la distance
    let intensity = if dist < trail_length {
        1.0 - (dist / trail_length)
    } else {
        0.0
    };

    // Mélange des couleurs basé sur la position
    let color = mix_color(color1, color2, led_pos);

    [
        color[0] * intensity,
        color[1] * intensity,
        color[2] * intensity,
    ]
}

/// Neon Warmup shader - Neons that heat up with flickering effect
pub fn neon_warmup(uv: [f32; 2], time: f32, params: &ShaderParams) -> [f32; 3] {
    let width = 13.0; // Number of strips
    let speed = params.speed.unwrap_or(0.5);
    let neon_color = params.color1.unwrap_or([0.0, 0.8, 1.0, 1.0]); // Cyan by default
    let background_color = params.color2.unwrap_or([0.0, 0.0, 0.0, 1.0]); // Black
    let num_active = params.density.unwrap_or(3.0).clamp(1.0, 12.0);

    // Duration parameters
    let warmup_duration = 0.5;
    let on_duration = 2.0;
    let off_duration = 0.3;

    let current_col = (uv[0] * width).floor();

    let mut max_intensity: f32 = 0.0;

    // Total cycle duration
    let total_duration = warmup_duration + on_duration + off_duration;

    // For each active neon
    let num_neons = num_active as i32;

    for i in 0..num_neons {
        let fi = i as f32;

        // Time for this neon (staggered)
        let t = time * speed + fi * total_duration * 0.5;
        let cycle = (t / total_duration).floor();
        let time_in_cycle = t % total_duration;

        // Active column for this cycle (random based on cycle number)
        let active_col = (simple_random(cycle + fi * 100.0) * width).floor();

        if (current_col - active_col).abs() < 0.5 {
            let intensity = if time_in_cycle < warmup_duration {
                // Warmup phase - flickering
                let warmup_progress = time_in_cycle / warmup_duration;
                let flicker = if simple_random((time * 30.0 + fi).floor()) > 0.5 {
                    1.0
                } else {
                    0.0
                };
                warmup_progress * flicker

            } else if time_in_cycle < (warmup_duration + on_duration) {
                // ON phase - stable
                1.0

            } else {
                // OFF phase - fade out
                let off_progress = (time_in_cycle - warmup_duration - on_duration) / off_duration;
                1.0 - off_progress
            };

            max_intensity = max_intensity.max(intensity);
        }
    }

    if max_intensity > 0.0 {
        // Mix background and neon color
        [
            background_color[0] * (1.0 - max_intensity) + neon_color[0] * max_intensity,
            background_color[1] * (1.0 - max_intensity) + neon_color[1] * max_intensity,
            background_color[2] * (1.0 - max_intensity) + neon_color[2] * max_intensity,
        ]
    } else {
        [background_color[0], background_color[1], background_color[2]]
    }
}

// Helper functions

fn mix_color(color1: [f32; 4], color2: [f32; 4], t: f32) -> [f32; 3] {
    let t = t.clamp(0.0, 1.0);
    [
        color1[0] * (1.0 - t) + color2[0] * t,
        color1[1] * (1.0 - t) + color2[1] * t,
        color1[2] * (1.0 - t) + color2[2] * t,
    ]
}

// Simple noise function (basic pseudo-random)
fn simple_noise(x: f32, y: f32) -> f32 {
    let x = x.sin() * 43758.5453;
    let y = y.cos() * 12345.6789;
    ((x + y).sin() * 0.5 + 0.5).fract()
}

// Simple random function (single parameter)
fn simple_random(x: f32) -> f32 {
    (x.sin() * 43758.5453).fract()
}
