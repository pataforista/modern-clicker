/*
 * Open Clicker Receiver - "The Holy Grail" Spec Implementation
 * Target: Arduino Nano/Uno + nRF24L01+
 * Specs: 1MBPS, Ch 41, Addr 0x123456, JSON Output
 */

#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>

// --- 1. HARDWARE CONNECTIONS (Arduino Nano/Uno) ---
// VCC:  3.3V (CRITICAL! 5V will burn the nRF24L01)
// GND:  GND
// CE:   Pin 9
// CSN:  Pin 10
// SCK:  Pin 13
// MOSI: Pin 11
// MISO: Pin 12
// IRQ:  Not connected (Optional)
RF24 radio(9, 10); // CE, CSN 

// --- 2. RF CONFIGURATION ---
// Reading Pipe Address: 0x123456 (Promiscuous Sniffer Base)
// Note: RF24 expects correct byte order. 0x123456 might be 0x563412 depending on endianness logic.
// We will use the explicit byte array to be safe.
const uint64_t pipeAddress = 0x123456LL; 

void setup() {
  Serial.begin(115200);
  
  if (!radio.begin()) {
    Serial.println("{\"error\": \"Radio hardware not responding\"}");
    while (1) {} 
  }

  // --- SPECIFIC SETTINGS ---
  
  // Data Rate: 1MBPS
  radio.setDataRate(RF24_1MBPS);
  
  // Channel: 41 (2441 MHz)
  radio.setChannel(41);
  
  // CRC Length: 16-bit
  radio.setCRCLength(RF24_CRC_16);
  
  // Auto-Ack: Disabled (Receiver only)
  radio.setAutoAck(false);
  
  // Dynamic Payload: Enabled
  radio.enableDynamicPayloads();
  
  // Address Width: 5 Bytes (Default, but good to be explicit if library supports it easily)
  radio.setAddressWidth(5);
  
  // Open Reading Pipe
  radio.openReadingPipe(1, pipeAddress);
  
  radio.startListening();
  
  // Debug info
  Serial.println("{\"status\": \"started\", \"mode\": \"sniffer\", \"channel\": 41}");
}

// --- 4. DECODING ALGORITHM (The Secret Sauce) ---
// This function attempts to de-obfuscate valid packets
// For now, it implements the placeholder logic for XOR/BitSwap 
// which can be calibrated with "Hot Deduction" output.
void processPacket(uint8_t* data, uint8_t len) {
  // Packet Layout:
  // Byte 0-2: Device ID
  // Byte 3: Command/Vote
  // Byte 4: Checksum
  
  // [TODO] Implement Bit Swap if needed (e.g. data[i] = reverseBits(data[i]))
  // [TODO] Implement XOR Masking: data[i] = data[i] ^ MASK
  
  // Extract ID (Bytes 0-2) - Assuming Big Endian for display
  unsigned long id = 0;
  id |= (unsigned long)data[0] << 16;
  id |= (unsigned long)data[1] << 8;
  id |= (unsigned long)data[2];
  
  char idStr[7];
  sprintf(idStr, "%06lX", id);
  
  // Extract Vote Byte (Byte 3)
  uint8_t voteByte = data[3];
  
  // --- 5. KEYMAP ---
  char key = '?';
  switch (voteByte) {
    case 0x31: key = 'A'; break; // 1
    case 0x32: key = 'B'; break; // 2
    case 0x33: key = 'C'; break; // 3
    case 0x34: key = 'D'; break; // 4
    case 0x35: key = 'E'; break; // 5
    case 0x36: key = 'F'; break; // 6
    case 0x37: key = 'G'; break; // 7
    case 0x38: key = 'H'; break; // 8
    case 0x39: key = 'I'; break; // 9
    case 0x30: key = 'J'; break; // 0
    default: 
      // output raw for debug if not known
      // key remains '?'
      break;
  }
  
  // Send JSON Output
  Serial.print("{\"id\": \"");
  Serial.print(idStr);
  Serial.print("\", \"key\": \"");
  Serial.print(key);
  Serial.print("\", \"raw_vote\": \"0x");
  Serial.print(voteByte, HEX);
  Serial.println("\"}");
}

void loop() {
  if (radio.available()) {
    uint8_t len = radio.getDynamicPayloadSize();
    
    // Safety check size (Specs say useful payload is 7-12 bytes)
    if (len < 4 || len > 32) {
      // Flush invalid
      uint8_t dump[32];
      radio.read(&dump, len);
      return;
    }
    
    uint8_t payload[32];
    radio.read(&payload, len);
    
    processPacket(payload, len);
  }
}
