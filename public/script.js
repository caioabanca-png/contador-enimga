const socket = io();

const btnStart = document.getElementById("btn-start");
const btnAdmin = document.getElementById("btn-admin");
const startScreen = document.getElementById("start-screen");

// Agora temos dois vídeos separados
const video1 = document.getElementById("intro-video-1");
const video2 = document.getElementById("intro-video-2");

const enigmaScreen = document.getElementById("enigma-screen");
const timerEl = document.getElementById("timer");
const inputs = document.querySelectorAll(".pwd-input");
const btnSubmit = document.getElementById("btn-submit");

const audiosGlitch = [document.getElementById("audio-glitch2"), document.getElementById("audio-glitch3")];
const audiosDenied = [
  document.getElementById("audio-denied1"), 
  document.getElementById("audio-denied2"), 
  document.getElementById("audio-denied3")
];
const audioGranted = document.getElementById("audio-granted");
const audioUnlock = document.getElementById("audio-unlock");

let countdownInterval;

// -- LÓGICA DE ADMIN (REINICIAR) --
btnAdmin.addEventListener("click", () => {
  let pwd = prompt("Permissão necessária. Digite a senha:");
  if (pwd === "1706") {
    socket.emit("adminReset", pwd);
  } else if (pwd !== null) {
    alert("Acesso Negado.");
  }
});

socket.on("systemReset", () => {
  window.location.reload(); 
});

// -- LÓGICA DA SENHA --
inputs.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && index > 0) inputs[index - 1].focus();
    if (e.key === "Enter") checkPassword();
  });
});

btnStart.addEventListener("click", () => {
  socket.emit("startVideo");
});

btnSubmit.addEventListener("click", checkPassword);

function checkPassword() {
  let pwd = Array.from(inputs).map(i => i.value).join("");
  if(pwd.length === 6) socket.emit("tryPassword", pwd);
}

// -- RECUPERAR ESTADO --
socket.on("updateState", (state) => {
  if (state.solved) {
    ativarSucesso();
  } else if (state.timerStarted) {
    iniciarContador(state.startTime);
  }
});

// -- REPRODUÇÃO E SINCRONIZAÇÃO DE VÍDEO --
socket.on("playVideo", () => {
  startScreen.style.display = "none";
  video1.style.display = "block"; // Mostra apenas o primeiro
  
  video1.play().catch(e => {
    console.error("ERRO: O navegador bloqueou o vídeo porque ninguém clicou nesta tela antes do jogo começar!", e);
  });
  
  // Quando o vídeo 1 acabar
  video1.onended = () => {
    video1.style.display = "none"; // Esconde o 1
    video2.style.display = "block"; // Mostra o 2
    video2.play().catch(e => console.error(e));
  };

  // Quando o vídeo 2 acabar
  video2.onended = () => {
    socket.emit("videoEnded");
  };
});

// -- CRONÔMETRO E GLITCH SINCRONIZADO --
socket.on("startTimer", (startTime) => {
  iniciarContador(startTime);
});

function iniciarContador(startTime) {
  // Esconde os dois vídeos por segurança
  video1.style.display = "none";
  video2.style.display = "none";
  startScreen.style.display = "none";
  enigmaScreen.style.display = "block";
  
  audiosGlitch.forEach(audio => {
    audio.currentTime = 0; 
    audio.play().catch(e => console.warn("Erro ao tocar glitch:", e));
  });
  
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    let now = Date.now();
    let elapsed = now - startTime;
    let remaining = (30 * 60 * 1000) - elapsed;
    
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      timerEl.innerText = "00:00";
      return;
    }

    let minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

// -- SUCESSO E FALHA --
socket.on("accessDenied", () => {
  document.body.classList.add("glitch-active", "error-state");
  
  let randomSound = audiosDenied[Math.floor(Math.random() * audiosDenied.length)];
  randomSound.currentTime = 0; 
  randomSound.play().catch(e => console.warn(e));
  
  setTimeout(() => {
    document.body.classList.remove("glitch-active", "error-state");
    inputs.forEach(i => i.value = "");
    inputs[0].focus();
  }, 2000);
});

socket.on("accessGranted", () => {
  ativarSucesso();
});

function ativarSucesso() {
  clearInterval(countdownInterval);
  document.body.classList.add("success");
  
  startScreen.style.display = "none";
  video1.style.display = "none";
  video2.style.display = "none";
  enigmaScreen.style.display = "block";
  
  audiosGlitch.forEach(a => a.pause());
  
  audioGranted.currentTime = 0;
  audioGranted.play().catch(e => console.warn(e));
  audioGranted.onended = () => {
    audioUnlock.currentTime = 0;
    audioUnlock.play().catch(e => console.warn(e));
  };
}