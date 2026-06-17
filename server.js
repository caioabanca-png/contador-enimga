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
  solved: false,
  currentPwd: "" // Guarda a senha sendo digitada em tempo real
};

let gameState = { ...defaultState };

io.on("connection", (socket) => {
  socket.emit("updateState", gameState);
  // Atualiza também os dígitos caso a tela conecte atrasada
  socket.emit("updatePassword", gameState.currentPwd);

  socket.on("startVideo", () => {
    if (!gameState.videoPlayed) {
      gameState.videoPlayed = true;
      io.emit("playVideo");
    }
  });

  socket.on("videoEnded", () => {
    if (!gameState.timerStarted) {
      gameState.timerStarted = true;
      gameState.startTime = Date.now();
      io.emit("startTimer", gameState.startTime);
    }
  });

  // Recebe o dígito de uma TV e espalha para as outras
  socket.on("syncPassword", (pwd) => {
    gameState.currentPwd = pwd;
    // Envia para todas as TVs (exceto a que enviou para não bugar o teclado)
    socket.broadcast.emit("updatePassword", pwd); 
  });

  socket.on("tryPassword", (pwd) => {
    if (pwd === "142528" && !gameState.solved) {
      gameState.solved = true;
      io.emit("accessGranted");
    } else if (!gameState.solved) {
      // Limpa os dígitos de todas as telas se errar
      gameState.currentPwd = "";
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