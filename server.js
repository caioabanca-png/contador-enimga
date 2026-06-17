const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Estado inicial do jogo
let defaultState = {
  videoPlayed: false,
  timerStarted: false,
  startTime: null,
  solved: false
};

let gameState = { ...defaultState };

io.on("connection", (socket) => {
  // Manda o estado atual para quem conectar
  socket.emit("updateState", gameState);

  socket.on("startVideo", () => {
    // TRAVA: Só reproduz se o vídeo ainda não tiver sido iniciado por ninguém
    if (!gameState.videoPlayed) {
      gameState.videoPlayed = true;
      io.emit("playVideo");
    }
  });

  socket.on("startTimer", () => {
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

  // FUNÇÃO ADMIN: Reseta o servidor e avisa todas as TVs para recarregarem
  socket.on("adminReset", (pwd) => {
    if (pwd === "1706") {
      gameState = { ...defaultState }; // Zera a memória do servidor
      io.emit("systemReset"); // Avisa todos os clientes
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}!`);
});