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

    const totalChannels = strip.ledCount * CHANNELS_PER_LED;
    const startChannel = (strip.startChannel || 1) - 1; // Convert to 0-based index

    let currentUniverse = strip.universe;
    let channelInUniverse = startChannel;
    let dataOffset = 0;

    while (dataOffset < totalChannels) {
      // How many channels can we write in this universe?
      const channelsAvailable = MAX_CHANNELS_PER_UNIVERSE - channelInUniverse;
      const channelsToWrite = Math.min(channelsAvailable, totalChannels - dataOffset);

      // Create buffer for this universe (full 512 channels)
      const universeBuffer = Buffer.alloc(MAX_CHANNELS_PER_UNIVERSE);

      // Copy the data at the correct offset
      const dataSlice = rgbData.slice(dataOffset, dataOffset + channelsToWrite);
      universeBuffer.set(dataSlice, channelInUniverse);

      // Generate and send packet
      const packet = this.generatePacket(currentUniverse, universeBuffer);
      await this.send(strip.ipAddress, packet);

      // Move to next universe
      dataOffset += channelsToWrite;
      currentUniverse++;
      channelInUniverse = 0; // Start at beginning of next universe
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
