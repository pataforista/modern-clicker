# Modern Clicker System

This project adapts PointSolutions clickers to a modern web interface.

## Prerequisites

Since this is a modern web application, you need to install **Node.js**:
1.  Download and install "LTS" version from [nodejs.org](https://nodejs.org/).
2.  Restart your terminal/PowerShell.

## Setup Instructions

### 1. Hardware Setup (Bridge)
1.  Connect an **nRF24L01+** module to an **Arduino** (Pin connections in `firmware/receiver.ino`).
2.  Open `firmware/receiver.ino` in the Arduino IDE.
3.  Upload the sketch to your Arduino.
4.  Note the **COM Port** (e.g., COM3) and update it in `server/index.js` (Line 21).

### 2. Backend Setup (Server)
1.  Open a terminal in the `server` folder:
    ```powershell
    cd server
    npm install
    ```
2.  Start the server:
    ```powershell
    node index.js
    ```
    *If you don't have the hardware yet, you can run the simulator instead:*
    ```powershell
    node simulator.js
    ```

### 3. Frontend Setup (Client)
1.  Open a new terminal in the `client` folder:
    ```powershell
    cd client
    npm install
    ```
2.  Start the user interface:
    ```powershell
    npm run dev
    ```
3.  Open the link shown (usually `http://localhost:5173`) in your browser.

## Features
- **Real-time Chart**: Updates instantly as votes come in.
- **Premium Dark Mode**: Designed for professional presentations.
\t- **Simulator**: Test the UI without needing the physical hardware.
