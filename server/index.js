import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { startSimulator } from "./simulator.js";

const env = {
  PORT: Number(process.env.PORT ?? 3001),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  SERIAL_PATH: process.env.SERIAL_PATH ?? "COM3",
  SERIAL_BAUD: Number(process.env.SERIAL_BAUD ?? 115200),
  SIMULATOR: (process.env.SIMULATOR ?? "false").toLowerCase() === "true",
  ALLOW_SIM_FALLBACK: (process.env.ALLOW_SIM_FALLBACK ?? "false").toLowerCase() === "true"
};

// Zod Schema for incoming Serial Data
// Expected: {"id": "...", "key": "..."}
const VoteSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(v => String(v).trim()),
  key: z.string().transform(v => String(v).trim().toUpperCase())
}).transform(v => ({
  id: v.id,
  key: v.key,
  ts: Date.now(),
  source: "serial"
})).refine(v => /^[A-E]$/.test(v.key), { message: "key must be A-E" })
  .refine(v => v.id.length > 0 && v.id.length <= 32, { message: "id invalid length" });

const app = express();
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: false }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: env.CLIENT_ORIGIN }
});

// State
let serialState = { mode: env.SIMULATOR ? "simulator" : "serial", connected: false, lastError: null };
let stopSim = null;

// Session State (Source of Truth)
let sessionState = {
  status: "STOPPED", // RUNNING | PAUSED | STOPPED | TESTING
  votesById: new Map(), // id -> key
  lastVoteTs: null
};

// --- Helpers ---

function emitStatus(extra = {}) {
  // Convert Map to size for transmission
  const payload = {
    ...serialState,
    session: {
      status: sessionState.status,
      votes: sessionState.votesById.size,
      lastVoteTs: sessionState.lastVoteTs
    },
    ...extra
  };
  io.emit("status", payload);
}

function acceptVote(vote) {
  if (sessionState.status !== "RUNNING" && sessionState.status !== "TESTING") return;

  if (sessionState.status === "TESTING") {
    // In testing mode, we just broadcast, we don't store.
    io.emit("vote", { ...vote, isUpdate: false });
    return;
  }

  const prev = sessionState.votesById.get(vote.id);
  sessionState.votesById.set(vote.id, vote.key);
  sessionState.lastVoteTs = vote.ts;

  io.emit("vote", {
    ...vote,
    isUpdate: prev != null && prev !== vote.key
  });

  // Keep all dashboards synchronized with canonical vote totals.
  emitStatus();
}

// --- API Endpoints ---

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    mode: serialState.mode,
    serialConnected: serialState.connected,
    session: { status: sessionState.status, votes: sessionState.votesById.size }
  });
});

app.post("/session/start", (req, res) => {
  sessionState.status = "RUNNING";
  emitStatus();
  res.json({ ok: true });
});

app.post("/session/pause", (req, res) => {
  sessionState.status = "PAUSED";
  emitStatus();
  res.json({ ok: true });
});

app.post("/session/reset", (req, res) => {
  sessionState.votesById.clear();
  sessionState.lastVoteTs = null;
  sessionState.status = "STOPPED";
  emitStatus();
  res.json({ ok: true });
});

app.post("/session/test", (req, res) => {
  sessionState.status = "TESTING";
  emitStatus();
  res.json({ ok: true });
});

// --- Socket.IO ---

io.on("connection", (socket) => {
  console.log("Client connected");

  // Send initial status
  socket.emit("status", {
    ...serialState,
    session: {
      status: sessionState.status,
      votes: sessionState.votesById.size,
      lastVoteTs: sessionState.lastVoteTs
    }
  });

  // Re-broadcast all current votes to new client (Snapshoting)
  // This ensures a refreshed page gets the current state
  if (sessionState.votesById.size > 0) {
    const allVotes = [];
    for (const [id, key] of sessionState.votesById.entries()) {
      allVotes.push({ id, key, ts: Date.now(), source: 'snapshot', isUpdate: false });
    }
    socket.emit("snapshot", allVotes);
  }
});

// --- Serial / Simulator Logic ---

function startSerialWithRetry() {
  let attempt = 0;
  let port = null;

  const connect = () => {
    attempt += 1;
    serialState.mode = "serial";

    port = new SerialPort({
      path: env.SERIAL_PATH,
      baudRate: env.SERIAL_BAUD,
      autoOpen: false
    });

    port.open((err) => {
      if (err) {
        serialState.connected = false;
        serialState.lastError = err.message;
        console.error(`Serial Open Failed (Attempt ${attempt}): ${err.message}`);
        emitStatus({ note: `serial open failed (attempt ${attempt})` });

        // Fallback Logic
        if (env.ALLOW_SIM_FALLBACK && !stopSim) {
          console.log("Falling back to SIMULATOR due to Serial failure.");
          serialState.mode = "simulator";
          stopSim = startSimulator({
            emitVote: (v) => acceptVote(v),
            emitStatus: (s) => {
              // merge simulator status into our app state
              if (s.connected !== undefined) serialState.connected = s.connected;
              emitStatus();
            }
          });
        }

        const backoffMs = Math.min(5000, 250 * attempt);
        setTimeout(connect, backoffMs);
        return;
      }

      // Connected!
      console.log("Serial Port Connected!");
      serialState.connected = true;
      serialState.lastError = null;

      // If we were simulating, stop it now
      if (stopSim) {
        stopSim();
        stopSim = null;
      }

      emitStatus({ note: "serial connected" });

      const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

      parser.on("data", (line) => {
        const trimmed = String(line).trim();
        if (!trimmed) return;
        if (trimmed.length > 512) return; // guardrail

        try {
          // Expecting JSON from Arduino: {"id": "...", "key": "..."}
          const obj = JSON.parse(trimmed);
          const parsed = VoteSchema.parse(obj);
          acceptVote(parsed);
        } catch (e) {
          // console.log("Invalid Packet:", trimmed);
        }
      });

      port.on("close", () => {
        console.log("Serial Port Closed");
        serialState.connected = false;
        serialState.lastError = "serial closed";
        emitStatus();
        const backoffMs = Math.min(5000, 250 * attempt);
        setTimeout(connect, backoffMs);
      });

      port.on("error", (e) => {
        console.error("Serial Port Error:", e.message);
        serialState.connected = false;
        serialState.lastError = e.message;
        emitStatus({ note: "serial error" });
        try { port.close(); } catch { }
      });
    });
  };

  connect();
}

function start() {
  if (env.SIMULATOR) {
    console.log("Starting in FORCED SIMULATOR mode");
    serialState.mode = "simulator";
    stopSim = startSimulator({
      emitVote: (v) => acceptVote(v),
      emitStatus: (s) => {
        if (s.connected !== undefined) serialState.connected = s.connected;
        emitStatus();
      }
    });
  } else {
    startSerialWithRetry();
  }

  server.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
    emitStatus({ note: `listening on ${env.PORT}` });
  });
}

start();
