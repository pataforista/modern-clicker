/*
 * Open Clicker Receiver - "The Holy Grail" Spec Implementation
 * Target: Arduino Nano/Uno + nRF24L01+
 * Specs: 1MBPS, Ch 41, Addr 0x123456, JSON Output
 */

#include <RF24.h>
#include <SPI.h>
#include <nRF24L01.h>


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
// Note: RF24 expects correct byte order. 0x123456 might be 0x563412 depending
// on endianness logic. We will use the explicit byte array to be safe.
const uint64_t pipeAddress = 0x123456LL;
int activeChannel = 41;

int pickBestCommonChannel(const int *noise, int noiseLen) {
  const int preferred[] = {41, 1, 10, 80};
  int bestChannel = preferred[0];
  int bestNoise = 999;

  for (int i = 0; i < 4; i++) {
    int ch = preferred[i];
    if (ch < 0 || ch >= noiseLen)
      continue;
    if (noise[ch] < bestNoise) {
      bestNoise = noise[ch];
      bestChannel = ch;
    }
  }

  return bestChannel;
}
void setup() {
  Serial.begin(115200);

  if (!radio.begin()) {
    Serial.println("{\"error\": \"Radio hardware not responding\"}");
    while (1) {
    }
  }

  // --- SPECIFIC SETTINGS ---

  // Data Rate: 1MBPS
  radio.setDataRate(RF24_1MBPS);

  // Channel: 41 (2441 MHz)
  radio.setChannel(activeChannel);

  // CRC Length: 16-bit
  radio.setCRCLength(RF24_CRC_16);

  // Auto-Ack: Enabled (Needed for clickers to "lock" to this channel)
  radio.setAutoAck(true);

  // Dynamic Payload: Enabled
  radio.enableDynamicPayloads();

  // Enable ACK Payloads for bidirectional feedback
  radio.enableAckPayload();

  // Address Width: 5 Bytes (More stable for some models)
  radio.setAddressWidth(5);

  // Open Reading Pipe (Using full 5-byte address for stability)
  // Standard TurningPoint broadcast/response address often translates to
  // 0x123456
  radio.openReadingPipe(1, 0x123456LL);

  radio.startListening();

  // Debug info
  Serial.print("{\"status\": \"started\", \"mode\": \"base\", \"channel\": ");
  Serial.print(activeChannel);
  Serial.println(", \"addr\": \"123456\"}");
}

// --- 4. DECODING ALGORITHM (The Secret Sauce) ---
// This function attempts to de-obfuscate valid packets
// For now, it implements the placeholder logic for XOR/BitSwap
// which can be calibrated with "Hot Deduction" output.
void processPacket(uint8_t *data, uint8_t len) {
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
  case 0x31:
    key = 'A';
    break; // 1
  case 0x32:
    key = 'B';
    break; // 2
  case 0x33:
    key = 'C';
    break; // 3
  case 0x34:
    key = 'D';
    break; // 4
  case 0x35:
    key = 'E';
    break; // 5
  case 0x36:
    key = 'F';
    break; // 6
  case 0x37:
    key = 'G';
    break; // 7
  case 0x38:
    key = 'H';
    break; // 8
  case 0x39:
    key = 'I';
    break; // 9
  case 0x30:
    key = 'J';
    break; // 0
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
  // --- 1. HANDLE COMMANDS FROM PC ---
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    if (input.startsWith("CH:")) {
      int newChannel = input.substring(3).toInt();
      if (newChannel >= 0 && newChannel <= 125) {
        activeChannel = newChannel;
        radio.setChannel(newChannel);
        Serial.print("{\"status\": \"channel_changed\", \"channel\": ");
        Serial.print(newChannel);
        Serial.println("}");
      }
    } else if (input == "SCAN") {
      // Simple Noise Scanner
      radio.stopListening();
      int noise[126];
      Serial.print("{\"status\": \"scan_results\", \"noise\": [");
      for (int i = 0; i < 126; i++) {
        radio.setChannel(i);
        delay(2);
        int count = 0;
        for (int j = 0; j < 10; j++) {
          if (radio.testCarrier())
            count++;
        }
        noise[i] = count;
        Serial.print(count);
        if (i < 125)
          Serial.print(",");
      }
      int recommended = pickBestCommonChannel(noise, 126);
      Serial.print("], \"recommended\": ");
      Serial.print(recommended);
      Serial.print(", \"active_channel\": ");
      Serial.print(activeChannel);
      Serial.println("}");

      radio.setChannel(activeChannel); // Return to current active channel
      radio.startListening();
    }
  }

  // --- 2. RECEIVE PACKETS ---
  if (radio.available()) {
    uint8_t len = radio.getDynamicPayloadSize();

    // Safety check size (Specs say useful payload is 7-12 bytes)
    if (len < 4 || len > 32) {
      uint8_t dump[32];
      radio.read(&dump, len);
      return;
    }

    uint8_t payload[32];
    radio.read(&payload, len);

    // Send ACK Payload IMMEDIATELY to confirm to the clicker
    // This makes the LED turn green on the device
    uint8_t ackData[1] = {0x01};
    radio.writeAckPayload(1, &ackData, 1);

    processPacket(payload, len);
  }
}
