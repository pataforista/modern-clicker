import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { startSimulator } from "./simulator.js";
import * as HID from 'node-hid';
import localtunnel from 'localtunnel';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';


const TP_DEVICES = [
  { vid: 0x2058, pids: [0x1004, 0x1005, 12, 11] },
  { vid: 0x04d8, pids: [0xfeaf, 0x000b] } // Models RRRF-03 and variants
];


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
})).refine(v => /^[A-J?]$/.test(v.key), { message: "key must be A-J or ?" })
  .refine(v => v.id.length > 0 && v.id.length <= 32, { message: "id invalid length" });

const app = express();
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: false }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: env.CLIENT_ORIGIN }
});

// State
let serialState = { mode: "official", connected: false, lastError: null, tunnelUrl: null };
const TUNNEL_TIMEOUT_MS = Number(process.env.TUNNEL_TIMEOUT_MS ?? 15000);

let stopSim = null;
let currentPort = null;
let hidDevice = null;

const dataDir = path.join(process.cwd(), 'data');
const usersFile = path.join(dataDir, 'users.json');

function normalizeUsername(input) {
  return String(input ?? '').trim().toLowerCase();
}

function hashPin(pin) {
  return createHash('sha256').update(String(pin)).digest('hex');
}

function generateParticipantId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function loadUsers() {
  try {
    if (!existsSync(usersFile)) {
      return {};
    }
    const data = JSON.parse(readFileSync(usersFile, 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function saveUsers() {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(usersFile, JSON.stringify(registeredUsers, null, 2), 'utf8');
}

const registeredUsers = loadUsers();

// Session State (Source of Truth)
let sessionState = {
  status: "STOPPED", // RUNNING | PAUSED | STOPPED | TESTING
  votesById: new Map(), // id -> key
  lastVoteTs: null,
  participants: {}, // id -> {id, name, number}
  questions: []    // list of {id, text, options, correctAnswer}
};
const recentMobileVoteIds = new Set();
const MAX_RECENT_MOBILE_VOTES = 2000;

// --- Helpers ---

function emitStatus(extra = {}) {
  // Convert Map to size for transmission
  const payload = {
    ...serialState,
    session: {
      status: sessionState.status,
      votes: sessionState.votesById.size,
      lastVoteTs: sessionState.lastVoteTs,
      participants: sessionState.participants,
      questions: sessionState.questions
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

app.post("/vote/mobile", (req, res) => {
  const { id, key, name, voteId } = req.body;
  if (!id || !key) return res.status(400).json({ error: "Missing id or key" });

  if (voteId && recentMobileVoteIds.has(voteId)) {
    return res.json({ ok: true, deduped: true });
  }

  // If a name is provided, automatically add to participants list if not exists
  if (name && !sessionState.participants[id]) {
    sessionState.participants[id] = { id, name, number: 'WEB' };
  }

  const vote = {
    id: String(id),
    key: String(key).toUpperCase(),
    ts: Date.now(),
    source: "mobile"
  };

  if (sessionState.status !== "RUNNING" && sessionState.status !== "TESTING") {
    return res.status(400).json({ error: "La sesión no esta activa" });
  }

  acceptVote(vote);

  if (voteId) {
    recentMobileVoteIds.add(voteId);
    if (recentMobileVoteIds.size > MAX_RECENT_MOBILE_VOTES) {
      const first = recentMobileVoteIds.values().next().value;
      if (first) recentMobileVoteIds.delete(first);
    }
  }

  res.json({ ok: true });
});

app.post('/users/register', (req, res) => {
  const rawUsername = String(req.body?.username ?? '').trim();
  const username = normalizeUsername(rawUsername);
  const pin = String(req.body?.pin ?? '').trim();

  if (!username || username.length < 3 || username.length > 24) {
    return res.status(400).json({ error: 'El usuario debe tener entre 3 y 24 caracteres.' });
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    return res.status(400).json({ error: 'El usuario solo puede contener letras, números, punto, guion o guion bajo.' });
  }

  if (pin && (pin.length < 4 || pin.length > 12)) {
    return res.status(400).json({ error: 'El PIN debe tener entre 4 y 12 caracteres.' });
  }

  if (registeredUsers[username]) {
    return res.status(409).json({ error: 'Ese nombre de usuario ya está registrado.' });
  }

  const id = generateParticipantId();
  const now = new Date().toISOString();

  registeredUsers[username] = {
    username,
    displayName: rawUsername,
    id,
    pinHash: pin ? hashPin(pin) : null,
    createdAt: now,
    lastLoginAt: now
  };

  saveUsers();

  return res.json({
    ok: true,
    user: { id, username, displayName: rawUsername }
  });
});

app.post('/users/login', (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const pin = String(req.body?.pin ?? '').trim();

  if (!username) {
    return res.status(400).json({ error: 'Debes indicar un nombre de usuario.' });
  }

  const user = registeredUsers[username];

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (user.pinHash && user.pinHash !== hashPin(pin)) {
    return res.status(401).json({ error: 'PIN inválido.' });
  }

  user.lastLoginAt = new Date().toISOString();
  saveUsers();

  return res.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName
    }
  });
});


app.post("/sync/participants", (req, res) => {
  sessionState.participants = req.body.participants || {};
  emitStatus({ note: "Participantes sincronizados" });
  res.json({ ok: true });
});

app.post("/sync/questions", (req, res) => {
  sessionState.questions = req.body.questions || [];
  emitStatus({ note: "Preguntas sincronizadas" });
  res.json({ ok: true });
});

app.post("/hw/scan", (req, res) => {
  if (serialState.connected && currentPort) {
    currentPort.write("SCAN\n");
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: "Serial not connected" });
  }
});

app.post("/hw/channel", (req, res) => {
  const { channel } = req.body;
  if (serialState.connected && currentPort) {
    currentPort.write(`CH:${channel}\n`);
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: "Serial not connected" });
  }
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
      lastVoteTs: sessionState.lastVoteTs,
      participants: sessionState.participants,
      questions: sessionState.questions
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

  const connect = () => {
    attempt += 1;
    serialState.mode = "serial";

    currentPort = new SerialPort({
      path: env.SERIAL_PATH,
      baudRate: env.SERIAL_BAUD,
      autoOpen: false
    });

    currentPort.open((err) => {
      if (err) {
        serialState.connected = false;
        serialState.lastError = err.message;
        console.error(`Serial Open Failed (Attempt ${attempt}): ${err.message}`);
        emitStatus({ note: `serial open failed (attempt ${attempt})` });

        if (env.ALLOW_SIM_FALLBACK && !stopSim) {
          console.log("Falling back to SIMULATOR due to Serial failure.");
          serialState.mode = "simulator";
          stopSim = startSimulator({
            emitVote: (v) => acceptVote(v),
            emitStatus: (s) => {
              if (s.connected !== undefined) serialState.connected = s.connected;
              emitStatus();
            }
          });
        }

        const backoffMs = Math.min(5000, 250 * attempt);
        setTimeout(connect, backoffMs);
        return;
      }

      console.log("Serial Port Connected!");
      serialState.connected = true;
      serialState.lastError = null;

      if (stopSim) {
        stopSim();
        stopSim = null;
      }

      emitStatus({ note: "serial connected" });

      const parser = currentPort.pipe(new ReadlineParser({ delimiter: "\n" }));

      parser.on("data", (line) => {
        const trimmed = String(line).trim();
        if (!trimmed || trimmed.length > 512) return;

        try {
          const obj = JSON.parse(trimmed);

          if (obj.status === "scan_results") {
            io.emit("scan_results", obj);
            return;
          }

          if (obj.status === "channel_changed") {
            emitStatus({ note: `Canal cambiado a ${obj.channel}` });
            return;
          }

          const parsed = VoteSchema.parse(obj);
          acceptVote(parsed);
        } catch {
          // Invalid packet ignored.
        }
      });

      currentPort.on("close", () => {
        console.log("Serial Port Closed");
        serialState.connected = false;
        serialState.lastError = "serial closed";
        emitStatus();
        const backoffMs = Math.min(5000, 250 * attempt);
        setTimeout(connect, backoffMs);
      });

      currentPort.on("error", (e) => {
        console.error("Serial Port Error:", e.message);
        serialState.connected = false;
        serialState.lastError = e.message;
        emitStatus({ note: "serial error" });
        try { currentPort.close(); } catch { }
      });
    });
  };

  connect();
}

function startOfficialReceiver() {
  const devices = HID.devices();
  const found = devices.find((d) =>
    TP_DEVICES.some(tp => tp.vid === d.vendorId && tp.pids.includes(d.productId))
  );

  if (!found || !found.path) {
    console.log("Official USB Receiver not found. Trying Serial/Arduino...");
    startSerialWithRetry();
    return;
  }



  try {
    hidDevice = new HID.HID(found.path);
    serialState.mode = "official";
    serialState.connected = true;
    serialState.lastError = null;
    console.log("Official TurningPoint USB Receiver Connected!");
    emitStatus({ note: "Receptor oficial conectado" });

    hidDevice.on("data", (data) => {
      if (data.length >= 5) {

        const id = data.slice(0, 3).toString("hex").toUpperCase();
        const voteByte = data[4];
        const keyMap = { 0x31: "A", 0x32: "B", 0x33: "C", 0x34: "D", 0x35: "E", 0x36: "F" };
        const key = keyMap[voteByte] || "?";

        if (id !== "000000") {
          acceptVote({ id, key, ts: Date.now(), source: "official" });
        }
      }
    });

    hidDevice.on("error", (err) => {
      console.error("HID Error:", err);
      serialState.connected = false;
      serialState.lastError = err.message;
      emitStatus({ note: "Error en receptor oficial. Reintentando..." });
      setTimeout(startOfficialReceiver, 2000);
    });
  } catch (e) {
    console.error("Failed to open HID Device:", e.message);
    serialState.connected = false;
    serialState.lastError = e.message;
    startSerialWithRetry();
  }
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
    startOfficialReceiver();
  }

  server.listen(env.PORT, async () => {
    console.log(`Server listening on port ${env.PORT}`);
    emitStatus({ note: `listening on ${env.PORT}` });

    // Open public tunnel
    try {
      console.log("Opening public tunnel for mobile voting...");
      const tunnel = await Promise.race([
        localtunnel({
          port: env.PORT,
          subdomain: `clicker-session-${Math.random().toString(36).substring(2, 7)}`
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${TUNNEL_TIMEOUT_MS}ms`)), TUNNEL_TIMEOUT_MS);
        })
      ]);
      serialState.tunnelUrl = tunnel.url;
      console.log(`Public Tunnel URL: ${tunnel.url}`);
      emitStatus({ note: "Túnel público activo" });

      tunnel.on('close', () => {
        serialState.tunnelUrl = null;
        emitStatus({ note: "Túnel cerrado" });
      });
    } catch (e) {
      console.error("Failed to open public tunnel:", e.message);
      emitStatus({ note: "No se pudo abrir túnel público" });
    }
  });
}


start();
