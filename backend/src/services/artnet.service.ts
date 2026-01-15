import dgram from 'dgram';
import {
  ARTNET_PORT,
  ARTNET_OPCODE_DMX,
  ARTNET_PROTOCOL_VERSION,
  MAX_CHANNELS_PER_UNIVERSE,
  CHANNELS_PER_LED,
  type StripConfig,
} from '../../../shared/types.js';

export class ArtNetService {
  private socket: dgram.Socket;
  private sequence: number = 0;

  constructor() {
    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', (err) => {
      console.error('Art-Net socket error:', err);
    });
  }

  /**
   * Generate an Art-Net DMX packet
   */
  generatePacket(universe: number, channelData: Uint8Array): Buffer {
    // Art-Net packet structure
    const packet = Buffer.alloc(18 + channelData.length);
    let offset = 0;

    // Header: "Art-Net" + 0x00
    packet.write('Art-Net', offset, 'ascii');
    offset += 7;
    packet.writeUInt8(0x00, offset);
    offset += 1;

    // OpCode: 0x5000 (ArtDmx) - Little Endian
    packet.writeUInt16LE(ARTNET_OPCODE_DMX, offset);
    offset += 2;

    // Protocol Version: 14 - Big Endian
    packet.writeUInt16BE(ARTNET_PROTOCOL_VERSION, offset);
    offset += 2;

    // Sequence: increment for each packet
    packet.writeUInt8(this.sequence, offset);
    this.sequence = (this.sequence + 1) % 256;
    offset += 1;

    // Physical: 0
    packet.writeUInt8(0, offset);
    offset += 1;

    // Universe: 15-bit value - Little Endian
    packet.writeUInt16LE(universe, offset);
    offset += 2;

    // Length: number of DMX channels - Big Endian (must be even)
    const length = channelData.length % 2 === 0 ? channelData.length : channelData.length + 1;
    packet.writeUInt16BE(length, offset);
    offset += 2;

    // DMX Data
    packet.set(channelData, offset);

    return packet;
  }

  /**
   * Send RGB data for a strip to its Art-Net universe
   */
  async sendStripData(strip: StripConfig, rgbData: Uint8Array): Promise<void> {
    if (rgbData.length !== strip.ledCount * CHANNELS_PER_LED) {
      throw new Error(
        `Invalid RGB data length. Expected ${strip.ledCount * CHANNELS_PER_LED}, got ${rgbData.length}`
      );
    }

    // Calculate how many universes we need
    const totalChannels = strip.ledCount * CHANNELS_PER_LED;
    const universesNeeded = Math.ceil(totalChannels / MAX_CHANNELS_PER_UNIVERSE);

    for (let i = 0; i < universesNeeded; i++) {
      const universeOffset = i * MAX_CHANNELS_PER_UNIVERSE;
      const channelsInThisUniverse = Math.min(
        MAX_CHANNELS_PER_UNIVERSE,
        totalChannels - universeOffset
      );

      // Extract the data for this universe
      const universeData = rgbData.slice(
        universeOffset,
        universeOffset + channelsInThisUniverse
      );

      // Pad to even number of channels if needed
      const paddedData = Buffer.alloc(
        universeData.length % 2 === 0 ? universeData.length : universeData.length + 1
      );
      paddedData.set(universeData);

      // Generate packet
      const packet = this.generatePacket(strip.universe + i, paddedData);

      // Send to the strip's IP address
      await this.send(strip.ipAddress, packet);
    }
  }

  /**
   * Send a raw Art-Net packet to an IP address
   */
  private send(ipAddress: string, packet: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.send(packet, 0, packet.length, ARTNET_PORT, ipAddress, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Send data to multiple strips in parallel
   */
  async sendMultipleStrips(
    strips: StripConfig[],
    stripDataMap: Map<number, Uint8Array>
  ): Promise<void> {
    const promises = strips.map((strip) => {
      const data = stripDataMap.get(strip.id);
      if (data) {
        return this.sendStripData(strip, data);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
  }

  /**
   * Close the UDP socket
   */
  close(): void {
    this.socket.close();
  }
}
