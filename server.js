const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let defaultState = {
  videoPlayed: false,
  timerStarted: false,
  startTime: null,
  solved: false
};

let gameState = { ...defaultState };

io.on("connection", (socket) => {
  socket.emit("updateState", gameState);

  socket.on("startVideo", () => {
    if (!gameState.videoPlayed) {
      gameState.videoPlayed = true;
      io.emit("playVideo");
    }
  });

  // O servidor agora escuta o fim do vídeo para iniciar o cronômetro globalmente
  socket.on("videoEnded", () => {
    if (!gameState.timerStarted) {
      gameState.timerStarted = true;
      gameState.startTime = Date.now();
      io.emit("startTimer", gameState.startTime);
    }
  });

  socket.on("tryPassword", (pwd) => {
    if (pwd === "142528" && !gameState.solved) {
      gameState.solved = true;
      io.emit("accessGranted");
    } else if (!gameState.solved) {
      io.emit("accessDenied");
    }
  });

  socket.on("adminReset", (pwd) => {
    if (pwd === "1706") {
      gameState = { ...defaultState }; 
      io.emit("systemReset"); 
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}!`);
});