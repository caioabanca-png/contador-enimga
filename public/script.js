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
let decodeInterval; 
let isInitiator = false; // Descobre qual tela clicou no Iniciar

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

function emitPassword() {
  let pwd = Array.from(inputs).map(i => i.value || " ").join("");
  socket.emit("syncPassword", pwd);
}

inputs.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
    emitPassword(); 
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

socket.on("updatePassword", (pwd) => {
  for(let i = 0; i < 6; i++) {
    let char = pwd[i];
    if(char) {
      inputs[i].value = (char !== " ") ? char : "";
    } else {
      inputs[i].value = "";
    }
  }
});

btnStart.addEventListener("click", () => {
  isInitiator = true; // Avisa que esta tela foi a mestre que iniciou
  socket.emit("startVideo");
});

btnSubmit.addEventListener("click", checkPassword);

function checkPassword() {
  let pwd = Array.from(inputs).map(i => i.value).join("");
  if(pwd.length === 6) socket.emit("tryPassword", pwd);
}

socket.on("updateState", (state) => {
  if (state.solved) {
    ativarSucesso();
  } else if (state.timerStarted) {
    iniciarContador(state.startTime);
  }
});

// -- REPRODUÇÃO DE VÍDEO --
socket.on("playVideo", () => {
  startScreen.style.display = "none";
  video1.style.display = "block"; 
  
  // Se esta TV NÃO foi a que clicou em INICIAR, o vídeo roda mudo.
  if (!isInitiator) {
    video1.muted = true;
    video2.muted = true;
  }
  
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

// -- CRONÔMETRO --
socket.on("startTimer", (startTime) => {
  iniciarContador(startTime);
});

function iniciarContador(startTime) {
  video1.style.display = "none";
  video2.style.display = "none";
  startScreen.style.display = "none";
  enigmaScreen.style.display = "block";
  
  document.body.classList.add("enigma-mode");
  setTimeout(() => { inputs[0].focus(); }, 100);

  document.addEventListener("click", () => {
    if (document.body.classList.contains("enigma-mode")) {
      let firstEmpty = Array.from(inputs).find(i => !i.value);
      if (firstEmpty) firstEmpty.focus();
      else inputs[5].focus();
    }
  });

  // Dá o play no áudio de fundo. (Requer o clique prévio na TV)
  audiosGlitch.forEach(audio => {
    audio.currentTime = 0; 
    audio.play().catch(e => console.warn("Clique na TV para o áudio funcionar!", e));
  });
  
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
socket.on("accessDenied", (soundIndex) => {
  document.body.classList.add("glitch-active", "error-state");
  
  // Pega exatamente o mesmo som sorteado no servidor
  let syncSound = audiosDenied[soundIndex];
  syncSound.currentTime = 0; 
  syncSound.play().catch(e => console.warn(e));
  
  setTimeout(() => {
    document.body.classList.remove("glitch-active", "error-state");
    inputs.forEach(i => i.value = "");
    inputs[0].focus();
  }, 2000);
});

socket.on("accessGranted", () => {
  ativarSucesso(); // O nome da função foi corrigido aqui!
});

function ativarSucesso() {
  clearInterval(countdownInterval);
  clearInterval(decodeInterval); 
  
  document.body.classList.remove("enigma-mode");
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