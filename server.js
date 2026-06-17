const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

// Força o servidor a enviar o index.html quando acessar a URL principal
const path = require('path');

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let gameState = {
  videoPlayed: false,
  timerStarted: false,
  startTime: null,
  solved: false
};

io.on("connection", (socket) => {
  // Envia o estado atual para quem acabou de conectar
  socket.emit("updateState", gameState);

  socket.on("startVideo", () => {
    gameState.videoPlayed = true;
    io.emit("playVideo");
  });

  socket.on("startTimer", () => {
    if (!gameState.timerStarted) {
      gameState.timerStarted = true;
      gameState.startTime = Date.now();
      io.emit("startTimer", gameState.startTime);
    }
  });

  socket.on("tryPassword", (pwd) => {
    if (pwd === "142528") {
      gameState.solved = true;
      io.emit("accessGranted");
    } else {
      io.emit("accessDenied");
    }
  });
});

http.listen(process.env.PORT, () => {
  console.log("Servidor rodando!");
});
