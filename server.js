const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

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

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}!`);
});