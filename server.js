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
  currentPwd: "",
  errorIndex: -1 // Adicionado para controlar a sequência dos sons de erro
};

let gameState = { ...defaultState };

io.on("connection", (socket) => {
  socket.emit("updateState", gameState);
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

  socket.on("syncPassword", (pwd) => {
    gameState.currentPwd = pwd;
    socket.broadcast.emit("updatePassword", pwd); 
  });

  socket.on("tryPassword", (pwd) => {
    if (pwd === "142528" && !gameState.solved) {
      gameState.solved = true;
      io.emit("accessGranted");
    } else if (!gameState.solved) {
      gameState.currentPwd = "";
      // Avança para o próximo som na sequência (0, 1 ou 2)
      gameState.errorIndex = (gameState.errorIndex + 1) % 3;
      io.emit("accessDenied", gameState.errorIndex);
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