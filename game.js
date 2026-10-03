const socket = io();

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const roomInput = document.getElementById("roomInput");
const message = document.getElementById("message");
const role = document.getElementById("role");
const roomCode = document.getElementById("roomCode");
const connection = document.getElementById("connection");

const players = {
  1: { el: document.getElementById("player1"), x: 260, y: 300 },
  2: { el: document.getElementById("player2"), x: 640, y: 300 }
};

let myNumber = null;
let myId = null;
let connected = false;
const keys = new Set();
const speed = 4;

socket.on("connect", () => {
  connected = true;
  message.textContent = "";
});

socket.on("disconnect", () => {
  connected = false;
  connection.textContent = "Disconnected";
});

function setMessage(text) {
  message.textContent = text;
}

function startGame(data) {
  myNumber = data.playerNumber;
  myId = socket.id;
  menu.hidden = true;
  game.hidden = false;
  role.textContent = myNumber === 1 ? "YOU ARE PARENT A" : "YOU ARE PARENT B";
  roomCode.textContent = data.roomCode;
  connection.textContent = data.players.length === 2 ? "2 PLAYERS CONNECTED" : "WAITING FOR PLAYER 2…";

  for (const p of data.players) {
    const n = p.number;
    if (players[n]) {
      players[n].x = p.x;
      players[n].y = p.y;
      draw(n);
    }
  }
}

createBtn.addEventListener("click", () => {
  if (!connected) return setMessage("Connecting… try again in a moment.");
  socket.emit("createRoom", (data) => {
    if (!data.ok) return setMessage(data.error || "Could not create room.");
    startGame(data);
  });
});

joinBtn.addEventListener("click", () => {
  const code = roomInput.value.trim().toUpperCase();
  if (code.length !== 4) return setMessage("Enter the 4-character room code.");
  socket.emit("joinRoom", { code }, (data) => {
    if (!data.ok) return setMessage(data.error || "Could not join room.");
    startGame(data);
  });
});

roomInput.addEventListener("input", () => {
  roomInput.value = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,4);
});

socket.on("playerJoined", (p) => {
  const n = p.number;
  if (!players[n]) return;
  players[n].x = p.x;
  players[n].y = p.y;
  draw(n);
  connection.textContent = "2 PLAYERS CONNECTED";
});

socket.on("playerMoved", (p) => {
  const otherNumber = p.id === myId ? myNumber : (myNumber === 1 ? 2 : 1);
  if (!players[otherNumber]) return;
  players[otherNumber].x = p.x;
  players[otherNumber].y = p.y;
  draw(otherNumber);
});

socket.on("playerLeft", () => {
  connection.textContent = "PLAYER 2 LEFT — ROOM OPEN";
});

function draw(n) {
  const p = players[n];
  p.el.style.left = `${p.x / 10}%`;
  p.el.style.top = `${p.y / 6}%`;
}

function move(dx, dy) {
  if (!myNumber) return;
  const p = players[myNumber];
  p.x = Math.max(45, Math.min(955, p.x + dx));
  p.y = Math.max(75, Math.min(525, p.y + dy));
  draw(myNumber);
  socket.emit("move", { x: p.x, y: p.y });
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
});

window.addEventListener("keyup", (e) => keys.delete(e.key));

setInterval(() => {
  if (!myNumber) return;
  let dx = 0, dy = 0;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy -= speed;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy += speed;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= speed;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += speed;
  if (dx || dy) move(dx, dy);
}, 50);

document.querySelectorAll("[data-key]").forEach(btn => {
  const key = btn.dataset.key;
  const press = e => { e.preventDefault(); keys.add(key); };
  const release = e => { e.preventDefault(); keys.delete(key); };
  btn.addEventListener("pointerdown", press);
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointercancel", release);
  btn.addEventListener("pointerleave", release);
});

draw(1);
draw(2);