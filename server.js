const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({length: 4}, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function cleanRoom(code) {
  const room = rooms.get(code);
  if (room && room.players.size === 0) rooms.delete(code);
}

io.on("connection", (socket) => {
  socket.on("createRoom", (reply) => {
    const code = makeCode();
    rooms.set(code, { players: new Map() });
    joinRoom(socket, code, reply);
  });

  socket.on("joinRoom", ({ code }, reply) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) return reply?.({ ok: false, error: "That room does not exist." });
    if (room.players.size >= 2) return reply?.({ ok: false, error: "That room is full." });

    joinRoom(socket, code, reply);
  });

  socket.on("move", ({ x, y }) => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room || !room.players.has(socket.id)) return;

    const player = room.players.get(socket.id);
    player.x = Number(x);
    player.y = Number(y);

    socket.to(code).emit("playerMoved", {
      id: socket.id,
      x: player.x,
      y: player.y
    });
  });

  socket.on("disconnect", () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;

    room.players.delete(socket.id);
    socket.to(code).emit("playerLeft", { id: socket.id });
    cleanRoom(code);
  });
});

function joinRoom(socket, code, reply) {
  const room = rooms.get(code);
  const playerNumber = room.players.size + 1;

  const player = {
    id: socket.id,
    number: playerNumber,
    x: playerNumber === 1 ? 260 : 640,
    y: 300
  };

  room.players.set(socket.id, player);
  socket.join(code);
  socket.data.room = code;

  const others = [...room.players.values()].filter(p => p.id !== socket.id);

  reply?.({
    ok: true,
    roomCode: code,
    playerNumber,
    players: [...room.players.values()]
  });

  socket.to(code).emit("playerJoined", player);
}

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, () => {
  console.log(`Night Shift Prototype 0.2 running on port ${PORT}`);
});