// Shared types for LED Shader Controller
// Art-Net Constants
export const ARTNET_PORT = 6454;
export const ARTNET_HEADER = 'Art-Net\0';
export const ARTNET_OPCODE_DMX = 0x5000;
export const ARTNET_PROTOCOL_VERSION = 14;
export const MAX_CHANNELS_PER_UNIVERSE = 512;
export const CHANNELS_PER_LED = 3; // RGB
export const MAX_LEDS_PER_UNIVERSE = Math.floor(MAX_CHANNELS_PER_UNIVERSE / CHANNELS_PER_LED); // 170
//# sourceMappingURL=types.js.map