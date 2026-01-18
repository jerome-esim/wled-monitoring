use crate::types::StripConfig;
use anyhow::Result;
use socket2::{Domain, Protocol, Socket, Type};
use std::net::{SocketAddr, UdpSocket};

const ARTNET_PORT: u16 = 6454;
const ARTNET_HEADER: &[u8] = b"Art-Net\0";
const ARTNET_OPCODE_DMX: u16 = 0x5000;
const ARTNET_PROTOCOL_VERSION: u16 = 14;
const MAX_CHANNELS_PER_UNIVERSE: usize = 512;

pub struct ArtNetSender {
    socket: UdpSocket,
    sequence: u8,
}

impl ArtNetSender {
    pub fn new() -> Result<Self> {
        // Create UDP socket with SO_REUSEADDR for better performance
        let socket = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))?;
        socket.set_reuse_address(true)?;
        socket.bind(&"0.0.0.0:0".parse::<SocketAddr>().unwrap().into())?;

        let std_socket: UdpSocket = socket.into();
        std_socket.set_nonblocking(false)?;

        Ok(Self {
            socket: std_socket,
            sequence: 0,
        })
    }

    pub fn send_strip_data(&mut self, strip: &StripConfig, rgb_data: &[u8]) -> Result<()> {
        let expected_len = (strip.led_count * 3) as usize;
        if rgb_data.len() != expected_len {
            anyhow::bail!(
                "Invalid RGB data length. Expected {}, got {}",
                expected_len,
                rgb_data.len()
            );
        }

        let total_channels = rgb_data.len();
        let start_channel = (strip.start_channel.saturating_sub(1)) as usize;

        let mut current_universe = strip.universe;
        let mut channel_in_universe = start_channel;
        let mut data_offset = 0;

        while data_offset < total_channels {
            // How many channels can we write in this universe?
            let channels_available = MAX_CHANNELS_PER_UNIVERSE - channel_in_universe;
            let channels_to_write = channels_available.min(total_channels - data_offset);

            // Create full 512-channel universe buffer
            let mut universe_buffer = vec![0u8; MAX_CHANNELS_PER_UNIVERSE];

            // Copy data at the correct offset
            universe_buffer[channel_in_universe..channel_in_universe + channels_to_write]
                .copy_from_slice(&rgb_data[data_offset..data_offset + channels_to_write]);

            // Generate and send Art-Net packet
            let packet = self.create_artnet_packet(current_universe, &universe_buffer);
            let addr = format!("{}:{}", strip.ip_address, ARTNET_PORT);
            self.socket.send_to(&packet, addr)?;

            // Move to next universe
            data_offset += channels_to_write;
            current_universe += 1;
            channel_in_universe = 0; // Start at beginning of next universe
        }

        // Increment sequence number
        self.sequence = self.sequence.wrapping_add(1);

        Ok(())
    }

    fn create_artnet_packet(&self, universe: u16, channel_data: &[u8]) -> Vec<u8> {
        let mut packet = Vec::with_capacity(18 + channel_data.len());

        // Header: "Art-Net" + 0x00
        packet.extend_from_slice(ARTNET_HEADER);

        // OpCode: 0x5000 (ArtDmx) - Little Endian
        packet.extend_from_slice(&ARTNET_OPCODE_DMX.to_le_bytes());

        // Protocol Version: 14 - Big Endian
        packet.extend_from_slice(&ARTNET_PROTOCOL_VERSION.to_be_bytes());

        // Sequence
        packet.push(self.sequence);

        // Physical: 0
        packet.push(0);

        // Universe: 15-bit value - Little Endian
        packet.extend_from_slice(&universe.to_le_bytes());

        // Length: number of DMX channels - Big Endian
        let length = channel_data.len() as u16;
        packet.extend_from_slice(&length.to_be_bytes());

        // DMX Data
        packet.extend_from_slice(channel_data);

        packet
    }

    pub async fn send_batch(&mut self, strips: &[StripConfig], strip_data: &[(u32, Vec<u8>)]) -> Result<()> {
        for (strip_id, data) in strip_data {
            if let Some(strip) = strips.iter().find(|s| s.id == *strip_id) {
                self.send_strip_data(strip, data)?;
            }
        }
        Ok(())
    }
}
