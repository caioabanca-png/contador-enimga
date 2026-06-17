const socket = io();

const btnStart = document.getElementById("btn-start");
const btnAdmin = document.getElementById("btn-admin");
const startScreen = document.getElementById("start-screen");
const video = document.getElementById("intro-video");
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
  video.style.display = "block";
  video.src = "/video1.mp4";
  
  // TENTA tocar com som primeiro. Se o navegador bloquear, roda mutado na TV secundária
  video.play().catch(e => {
    console.warn("Autoplay bloqueado nesta TV. Rodando vídeo sem som para manter sincronia visual.");
    video.muted = true; 
    video.play().catch(err => console.error("Erro fatal no vídeo:", err));
  });
  
  video.onended = () => {
    if (video.src.includes("video1.mp4")) {
      video.src = "/video2.mp4";
      video.play().catch(e => console.warn(e));
    } else {
      socket.emit("videoEnded");
    }
  };
});

// -- CRONÔMETRO E GLITCH SINCRONIZADO --
socket.on("startTimer", (startTime) => {
  iniciarContador(startTime);
});

function iniciarContador(startTime) {
  video.style.display = "none";
  startScreen.style.display = "none";
  enigmaScreen.style.display = "block";
  
  // Garante que todas as TVs comecem o ruído do zero no exato mesmo milissegundo
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
  // Adiciona o glitch E o fundo vermelho vivo
  document.body.classList.add("glitch-active", "error-state");
  
  let randomSound = audiosDenied[Math.floor(Math.random() * audiosDenied.length)];
  randomSound.currentTime = 0; // Sincroniza o áudio de erro
  randomSound.play().catch(e => console.warn(e));
  
  setTimeout(() => {
    // Tira o glitch e o vermelho, voltando ao verde hacker
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
  video.style.display = "none";
  enigmaScreen.style.display = "block";
  
  audiosGlitch.forEach(a => a.pause());
  
  audioGranted.currentTime = 0;
  audioGranted.play().catch(e => console.warn(e));
  audioGranted.onended = () => {
    audioUnlock.currentTime = 0;
    audioUnlock.play().catch(e => console.warn(e));
  };
}