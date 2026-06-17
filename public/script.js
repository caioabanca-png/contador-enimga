const socket = io();

const btnStart = document.getElementById("btn-start");
const btnAdmin = document.getElementById("btn-admin");
const startScreen = document.getElementById("start-screen");

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
let decodeInterval; // Variável da animação de decodificação hacker

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

// -- LÓGICA DE DIGITAÇÃO AND SINCRONIZAÇÃO --
function emitPassword() {
  let pwd = Array.from(inputs).map(i => i.value || " ").join("");
  socket.emit("syncPassword", pwd);
}

inputs.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
    emitPassword(); // Envia para a rede a cada dígito modificado
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && index > 0) {
      inputs[index - 1].focus();
      inputs[index - 1].value = '';
      emitPassword();
    }
    if (e.key === "Enter") checkPassword();
  });
});

// Atualiza a tela em tempo real com o que foi digitado em outra TV
socket.on("updatePassword", (pwd) => {
  for(let i = 0; i < 6; i++) {
    let char = pwd[i];
    if(char) {
      inputs[i].value = (char !== " ") ? char : "";
    }
  }
});

btnStart.addEventListener("click", () => {
  socket.emit("startVideo");
});

btnSubmit.addEventListener("click", checkPassword);

function checkPassword() {
  let pwd = Array.from(inputs).map(i => i.value).join("");
  if(pwd.length === 6) socket.emit("tryPassword", pwd);
}

// -- RECUPERAR ESTADO AO CONECTAR --
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
  video1.style.display = "block"; 
  
  video1.play().catch(e => console.error("Erro autoplay vídeo 1:", e));
  
  video1.onended = () => {
    video1.style.display = "none"; 
    video2.style.display = "block"; 
    video2.play().catch(e => console.error("Erro autoplay vídeo 2:", e));
  };

  video2.onended = () => {
    socket.emit("videoEnded");
  };
});

// -- CRONÔMETRO E ELEMENTOS VISUAIS --
socket.on("startTimer", (startTime) => {
  iniciarContador(startTime);
});

function iniciarContador(startTime) {
  video1.style.display = "none";
  video2.style.display = "none";
  startScreen.style.display = "none";
  enigmaScreen.style.display = "block";
  
  // Ativa o modo de piscar neon verde leve nas TVs
  document.body.classList.add("enigma-mode");
  
  // Foca automaticamente no primeiro campo de texto do código
  setTimeout(() => { inputs[0].focus(); }, 100);

  // Mantém o foco ativo caso cliquem fora da área de texto sem querer
  document.addEventListener("click", () => {
    if (document.body.classList.contains("enigma-mode")) {
      let firstEmpty = Array.from(inputs).find(i => !i.value);
      if (firstEmpty) firstEmpty.focus();
      else inputs[5].focus();
    }
  });

  // Inicializa e sincroniza os ruídos de fundo (glitch)
  audiosGlitch.forEach(audio => {
    audio.currentTime = 0; 
    audio.play().catch(e => console.warn(e));
  });
  
  // -- EFEITO DE DECODIFICAÇÃO HACKER (NÚMEROS GIRANDO NO CAMPO VAZIO) --
  clearInterval(decodeInterval);
  decodeInterval = setInterval(() => {
    inputs.forEach(input => {
      if (!input.value) {
        input.placeholder = Math.floor(Math.random() * 10);
      } else {
        input.placeholder = ""; 
      }
    });
  }, 80); 
  
  // -- CONTAGEM REGRESSIVA DOS 30 MINUTOS --
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
  // Transforma o fundo verde em vermelho vivo instantaneamente e gera a distorção visual
  document.body.classList.add("glitch-active", "error-state");
  
  let randomSound = audiosDenied[Math.floor(Math.random() * audiosDenied.length)];
  randomSound.currentTime = 0; 
  randomSound.play().catch(e => console.warn(e));
  
  setTimeout(() => {
    // Retorna ao verde padrão e reseta os inputs após 2 segundos
    document.body.classList.remove("glitch-active", "error-state");
    inputs.forEach(i => i.value = "");
    inputs[0].focus();
    emitPassword(); // Limpa o estado nos outros terminais também
  }, 2000);
});

socket.on("accessGranted", () => {
  ativarSucesso();
});

function activarSucesso() {
  clearInterval(countdownInterval);
  clearInterval(decodeInterval); // Interrompe a decodificação hacker
  
  document.body.classList.remove("enigma-mode");
  document.body.classList.add("success"); // Transforma o fundo em branco total
  
  startScreen.style.display = "none";
  video1.style.display = "none";
  video2.style.display = "none";
  enigmaScreen.style.display = "block";
  
  // Desliga os áudios de glitch de fundo
  audiosGlitch.forEach(a => a.pause());
  
  // Toca os efeitos de vitória em sequência
  audioGranted.currentTime = 0;
  audioGranted.play().catch(e => console.warn(e));
  audioGranted.onended = () => {
    audioUnlock.currentTime = 0;
    audioUnlock.play().catch(e => console.warn(e));
  };
}