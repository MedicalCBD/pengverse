// Load images
const bgImgs = [
  new Image(), // background.png
  new Image(),  // background2.png
  new Image(),  // background3.png
  new Image(),  // background4.png
  new Image()  // background5.png
];
bgImgs[0].src = 'background.png';
bgImgs[1].src = 'background2.png';
bgImgs[2].src = 'background3.png';
bgImgs[3].src = 'background4.png';
bgImgs[4].src = 'background5.png';
const penguinWalkImg = new Image();
penguinWalkImg.src = 'pengwalk.png';
const penguinLeftImg = new Image();
penguinLeftImg.src = 'pengleft.png';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 450;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const PENGUIN_SIZE = 64;
const WALK_FRAME_SIZE = 32;
const WALK_FRAMES = 4;

// WebSocket connection
let socket;
let myId = null;
let currentInstance = 0;
let penguins = []; // Ahora será dinámico basado en jugadores conectados
const speed = 4;
const MESSAGE_DURATION = 5000; // 5 seconds in ms

// Fade effect
let fadeAlpha = 0;
let fading = false;
let fadeDirection = 1; // 1: fade out, -1: fade in
let nextInstance = null;

// Distortion effect variables
let distortionTimer = null;
let distortionActive = false;

// Title effect variables
let titleText = '';
let titleAlpha = 0;
let titleTimer = null;
let titleFadeIn = true;
const TITLE_DURATION = 5000; // 5 seconds

// Nickname variables
let myNickname = '';
let nicknameInput = null;
let setNicknameBtn = null;

// Inicializar WebSocket
function initWebSocket() {
  socket = io();
  
  socket.on('connect', () => {
    console.log('Conectado al servidor WebSocket');
    
    // Initialize nickname system
    initNickname();
    
    // Unirse al juego
    socket.emit('joinGame', {
      x: 200,
      y: 360,
      instance: currentInstance,
      username: `Penguin${Math.floor(Math.random() * 1000)}`,
      nickname: myNickname
    });
  });

  socket.on('gameState', (data) => {
    console.log('Estado del juego recibido:', data);
    penguins = data.players;
    myId = data.myId;
    
    // Asignar nuestro nickname a nuestro propio jugador
    const myPlayer = penguins.find(p => p.id === myId);
    if (myPlayer && myNickname) {
      myPlayer.nickname = myNickname;
    }
    
    draw();
  });

  socket.on('playerJoined', (player) => {
    console.log('Nuevo jugador se unió:', player);
    const existingPlayer = penguins.find(p => p.id === player.id);
    if (!existingPlayer) {
      penguins.push(player);
    }
    
    // Si es nuestro propio jugador, asignar nuestro nickname
    if (player.id === myId && myNickname) {
      player.nickname = myNickname;
    }
    
    draw();
  });

  socket.on('playerLeft', (data) => {
    console.log('Jugador se fue:', data);
    penguins = penguins.filter(p => p.id !== data.id);
    draw();
  });

  socket.on('playerMoved', (moveData) => {
    console.log('Movimiento recibido:', moveData);
    const player = penguins.find(p => p.id === moveData.id);
    if (player) {
      console.log('Actualizando jugador:', player.username, 'Posición:', moveData.x, moveData.y, 'Walking:', moveData.walkingRight, moveData.walkingLeft);
      player.x = moveData.x;
      player.y = moveData.y;
      player.walkingRight = moveData.walkingRight;
      player.walkingLeft = moveData.walkingLeft;
      player.walkFrame = moveData.walkFrame;
      player.walkTime = moveData.walkTime;
      player.lastDir = moveData.lastDir;
      
      // Forzar actualización de animación para otros jugadores
      if (moveData.walkingRight || moveData.walkingLeft) {
        // Si el jugador está caminando, asegurar que la animación se actualice
        if (player.walkTime === 0) {
          player.walkTime = 1;
        }
      }
    } else {
      console.log('Jugador no encontrado para movimiento:', moveData.id);
    }
  });

  socket.on('playerMessage', (messageData) => {
    console.log('Mensaje recibido:', messageData);
    const player = penguins.find(p => p.id === messageData.id);
    if (player) {
      player.message = messageData.message;
      player.messageTime = messageData.messageTime;
      console.log('Mensaje aplicado a jugador:', player.username, 'Mensaje:', player.message);
    } else {
      console.log('Jugador no encontrado para mensaje:', messageData.id);
    }
  });

  socket.on('instanceChanged', (data) => {
    console.log('Instancia cambiada:', data);
    penguins = data.players;
    currentInstance = data.instance;
    
    // Asignar nuestro nickname a nuestro propio jugador
    const myPlayer = penguins.find(p => p.id === myId);
    if (myPlayer && myNickname) {
      myPlayer.nickname = myNickname;
    }
    
    draw();
  });

  socket.on('playerNicknameUpdated', (data) => {
    console.log('Nickname actualizado:', data);
    const player = penguins.find(p => p.id === data.id);
    if (player) {
      player.nickname = data.nickname;
      draw();
    }
  });

  socket.on('disconnect', () => {
    console.log('Desconectado del servidor');
  });
}

function startDistortionLoop() {
  stopDistortionLoop();
  if (currentInstance !== 3) return;
  const me = penguins.find(p => p.id === myId);
  if (!me) return;
  distortionTimer = setInterval(() => {
    if (currentInstance !== 3) return;
    distortionActive = true;
    setTimeout(() => { distortionActive = false; }, 500);
  }, 5000);
}

function stopDistortionLoop() {
  if (distortionTimer) clearInterval(distortionTimer);
  distortionTimer = null;
  distortionActive = false;
}

function draw() {
  // Background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImgs[currentInstance], 0, 0, canvas.width, canvas.height);

  const now = Date.now();
  const me = penguins.find(p => p.id === myId);
  const PROXIMITY_DIST = 200; // Aumentado para que sea más fácil ver mensajes
  
  penguins.forEach(p => {
    let frame = 0;
    let img = penguinWalkImg;
    
    if (p.id === myId) {
      if (p.walkingRight) {
        frame = p.walkFrame;
        img = penguinWalkImg;
      } else if (p.walkingLeft) {
        frame = p.walkFrame;
        img = penguinLeftImg;
      } else {
        // Idle: show frame 0 facing last direction
        img = (p.lastDir === 'left') ? penguinLeftImg : penguinWalkImg;
        frame = 0;
      }
    } else {
      // Other penguins: use their actual walking state and direction
      if (p.walkingRight) {
        frame = p.walkFrame;
        img = penguinWalkImg;
        if (p.walkFrame > 0) {
          console.log(`${p.username} caminando derecha, frame: ${p.walkFrame}, usando pengwalk.png`);
        }
      } else if (p.walkingLeft) {
        frame = p.walkFrame;
        img = penguinLeftImg;
        if (p.walkFrame > 0) {
          console.log(`${p.username} caminando izquierda, frame: ${p.walkFrame}, usando pengleft.png`);
        }
      } else {
        // Idle: show frame 0 facing last direction
        img = (p.lastDir === 'left') ? penguinLeftImg : penguinWalkImg;
        frame = 0;
      }
    }
    
    // Distortion effect for player in DIMENSIONAL
    if (currentInstance === 3 && p.id === myId && distortionActive) {
      ctx.save();
      const cx = p.x + PENGUIN_SIZE/2;
      const cy = p.y + PENGUIN_SIZE/2;
      ctx.translate(cx, cy);
      ctx.rotate((Math.random() - 0.5) * 0.6); // random rotation
      const scale = 1 + (Math.random() - 0.5) * 0.5; // random scale
      ctx.scale(scale, scale);
      ctx.drawImage(
        img,
        frame * WALK_FRAME_SIZE, 0, WALK_FRAME_SIZE, WALK_FRAME_SIZE,
        -PENGUIN_SIZE/2, -PENGUIN_SIZE/2, PENGUIN_SIZE, PENGUIN_SIZE
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        img,
        frame * WALK_FRAME_SIZE, 0, WALK_FRAME_SIZE, WALK_FRAME_SIZE,
        p.x, p.y, PENGUIN_SIZE, PENGUIN_SIZE
      );
    }
    
    // Draw nickname above penguin
    if (p.nickname && p.nickname.length > 0) {
      ctx.save();
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = '#00fff5';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      const nicknameX = p.x + PENGUIN_SIZE / 2;
      const nicknameY = p.y - 5;
      
      // Draw stroke
      ctx.strokeText(p.nickname, nicknameX, nicknameY);
      // Draw text
      ctx.fillText(p.nickname, nicknameX, nicknameY);
      ctx.restore();
    }
    
    // Show message only if it's the player or if close
    if (p.id === myId) {
      if (p.message && now - p.messageTime < MESSAGE_DURATION) {
        drawSpeechBubble(p.x + PENGUIN_SIZE/2, p.y - 10, p.message);
      } else if (p.message && now - p.messageTime >= MESSAGE_DURATION) {
        p.message = '';
      }
    } else {
      // Other players: only show message if player is close
      if (me) {
        const dx = (p.x + PENGUIN_SIZE/2) - (me.x + PENGUIN_SIZE/2);
        const dy = (p.y + PENGUIN_SIZE/2) - (me.y + PENGUIN_SIZE/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < PROXIMITY_DIST && p.message && now - p.messageTime < MESSAGE_DURATION) {
          console.log('Mostrando mensaje de jugador cercano:', p.username, 'Mensaje:', p.message, 'Distancia:', dist);
          drawSpeechBubble(p.x + PENGUIN_SIZE/2, p.y - 10, p.message);
        }
        if (p.message && now - p.messageTime >= MESSAGE_DURATION) {
          p.message = '';
        }
      } else {
        // Si no hay jugador local, mostrar todos los mensajes (para debug)
        if (p.message && now - p.messageTime < MESSAGE_DURATION) {
          drawSpeechBubble(p.x + PENGUIN_SIZE/2, p.y - 10, p.message);
        }
        if (p.message && now - p.messageTime >= MESSAGE_DURATION) {
          p.message = '';
        }
      }
    }
  });

  // Fade effect
  if (fading) {
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  
  // Title effect
  if (titleText && titleAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.font = '48px "Press Start 2P", monospace';
    ctx.fillStyle = '#00fff5';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = canvas.width / 2;
    const y = canvas.height / 2 - 100; // Mover 100px hacia arriba
    
    // Draw stroke
    ctx.strokeText(titleText, x, y);
    // Draw text
    ctx.fillText(titleText, x, y);
    
    ctx.restore();
  }
}

function drawSpeechBubble(x, y, text) {
  ctx.font = '16px Arial';
  const padding = 8;
  const textWidth = ctx.measureText(text).width;
  const width = textWidth + padding * 2;
  const height = 24;

  // Bubble
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  roundRect(ctx, x - width/2, y - height, width, height, 8, true, true);

  // Text
  ctx.fillStyle = '#222';
  ctx.fillText(text, x - textWidth/2, y - height/2 + 4);
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function showInstanceTitle(instanceId) {
  const titles = {
    0: 'MAIN',
    1: 'SHILLERS CAMP',
    2: 'MUSIC SECTOR',
    3: 'DIMENSIONAL',
    4: 'FLEX ZONE'
  };
  
  titleText = titles[instanceId] || '';
  titleAlpha = 0;
  titleFadeIn = true;
  
  // Clear any existing timer
  if (titleTimer) {
    clearTimeout(titleTimer);
  }
  
  // Start fade in
  titleTimer = setInterval(() => {
    if (titleFadeIn) {
      titleAlpha += 0.05;
      if (titleAlpha >= 1) {
        titleAlpha = 1;
        titleFadeIn = false;
        
        // Start fade out after 3 seconds
        setTimeout(() => {
          titleFadeIn = false;
        }, 3000);
      }
    } else {
      titleAlpha -= 0.05;
      if (titleAlpha <= 0) {
        titleAlpha = 0;
        if (titleTimer) {
          clearInterval(titleTimer);
          titleTimer = null;
        }
      }
    }
    draw();
  }, 50);
}

function initNickname() {
  nicknameInput = document.getElementById('nickname-input');
  setNicknameBtn = document.getElementById('set-nickname-btn');
  
  // Load saved nickname from localStorage
  const savedNickname = localStorage.getItem('pengcity_nickname');
  if (savedNickname) {
    myNickname = savedNickname;
    nicknameInput.value = savedNickname;
  }
  
  // Set nickname button click handler
  setNicknameBtn.addEventListener('click', setNickname);
  
  // Enter key handler for input
  nicknameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      setNickname();
    }
  });
}

function setNickname() {
  const newNickname = nicknameInput.value.trim();
  if (newNickname.length > 0 && newNickname.length <= 15) {
    myNickname = newNickname;
    localStorage.setItem('pengcity_nickname', myNickname);
    
    // Update our own player locally
    const myPlayer = penguins.find(p => p.id === myId);
    if (myPlayer) {
      myPlayer.nickname = myNickname;
    }
    
    // Notify server about nickname change
    if (socket) {
      socket.emit('updateNickname', { nickname: myNickname });
    }
    
    // Visual feedback
    setNicknameBtn.textContent = '✓ Set!';
    setTimeout(() => {
      setNicknameBtn.textContent = 'Set Nickname';
    }, 1000);
    
    // Redraw to show the nickname immediately
    draw();
  }
}

function startFade(toInstance) {
  fading = true;
  fadeAlpha = 0;
  fadeDirection = 1;
  nextInstance = toInstance;
  fadeStep();
}

function handleMusic() {
  const audio = document.getElementById('music-audio');
  if (!audio) return;
  if (currentInstance === 2) {
    if (audio.paused) {
      audio.currentTime = 0;
      audio.play();
    }
  } else {
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

function fadeStep() {
  if (!fading) return;
  if (fadeDirection === 1) {
    fadeAlpha += 0.05;
    if (fadeAlpha >= 1) {
      fadeAlpha = 1;
              // Store the previous instance before changing
        const previousInstance = currentInstance;
        // Change instance
        currentInstance = nextInstance;
        // Place player at the correct edge based on direction
        const me = penguins.find(p => p.id === myId);
        if (me) {
          if (nextInstance > previousInstance) {
            // Moving right: appear at left edge
            me.x = 0;
          } else if (nextInstance < previousInstance) {
            // Moving left: appear at right edge
            me.x = CANVAS_WIDTH - WALK_FRAME_SIZE;
          }
        // Notificar al servidor del cambio de instancia
        socket.emit('changeInstance', {
          instance: currentInstance,
          x: me.x,
          y: me.y
        });
      }
      fadeDirection = -1;
      handleMusic();
      if (currentInstance === 3) startDistortionLoop(); else stopDistortionLoop();
      
      // Show instance title
      showInstanceTitle(currentInstance);
    }
  } else {
    fadeAlpha -= 0.05;
    if (fadeAlpha <= 0) {
      fadeAlpha = 0;
      fading = false;
      nextInstance = null;
    }
  }
  draw();
  if (fading) setTimeout(fadeStep, 16);
}

// Sidebar button logic
function goToInstance(idx) {
  if (currentInstance === idx) return;
  fading = true;
  fadeAlpha = 0;
  fadeDirection = 1;
  nextInstance = idx;
  fadeStepSidebar();
}

function fadeStepSidebar() {
  if (!fading) return;
  if (fadeDirection === 1) {
    fadeAlpha += 0.05;
    if (fadeAlpha >= 1) {
      fadeAlpha = 1;
      // Store the previous instance before changing
      const previousInstance = currentInstance;
      // Change instance
      currentInstance = nextInstance;
      // Place player at the correct edge based on direction
      const me = penguins.find(p => p.id === myId);
      if (me) {
        if (nextInstance > previousInstance) {
          // Moving right: appear at left edge
          me.x = 0;
        } else if (nextInstance < previousInstance) {
          // Moving left: appear at right edge
          me.x = CANVAS_WIDTH - WALK_FRAME_SIZE;
        } else {
          // Same instance (shouldn't happen but just in case)
          me.x = 0;
        }
        // Notificar al servidor del cambio de instancia
        socket.emit('changeInstance', {
          instance: currentInstance,
          x: me.x,
          y: me.y
        });
      }
      fadeDirection = -1;
      handleMusic();
      if (currentInstance === 3) startDistortionLoop(); else stopDistortionLoop();
      
      // Show instance title
      showInstanceTitle(currentInstance);
    }
  } else {
    fadeAlpha -= 0.05;
    if (fadeAlpha <= 0) {
      fadeAlpha = 0;
      fading = false;
      nextInstance = null;
    }
  }
  draw();
  if (fading) setTimeout(fadeStepSidebar, 16);
}

// Update logic for moving right/left between instances
window.addEventListener('keydown', e => {
  if (fading || !socket) return;
  const me = penguins.find(p => p.id === myId);
  if (!me) return;
  
  if (e.key === 'ArrowLeft') {
    if (currentInstance === 0) {
      // Can't go further left
      if (me.x > 0) {
        me.x -= speed;
        if (me.x < 0) me.x = 0;
      }
    } else {
      me.x -= speed;
      if (me.x < 0) {
        // Change to previous instance
        startFade(currentInstance - 1);
      }
    }
    me.walkingLeft = true;
    me.walkingRight = false;
    me.lastDir = 'left';
  } else if (e.key === 'ArrowRight') {
    me.x += speed;
    if (me.x > CANVAS_WIDTH - PENGUIN_SIZE) {
      if (currentInstance < 4) { // 5 instances total (0-4)
        // Change to next instance
        startFade(currentInstance + 1);
      } else {
        me.x = CANVAS_WIDTH - PENGUIN_SIZE;
      }
    }
    me.walkingRight = true;
    me.walkingLeft = false;
    me.lastDir = 'right';
  }
  
  // Enviar movimiento al servidor
  if (socket) {
    const moveData = {
      x: me.x,
      y: me.y,
      walkingRight: me.walkingRight,
      walkingLeft: me.walkingLeft,
      walkFrame: me.walkFrame,
      walkTime: me.walkTime,
      lastDir: me.lastDir
    };
    console.log('Enviando movimiento:', moveData);
    socket.emit('playerMove', moveData);
  }
  
  draw();
});

window.addEventListener('keyup', e => {
  const me = penguins.find(p => p.id === myId);
  if (!me) return;
  
  if (e.key === 'ArrowRight') {
    me.walkingRight = false;
    me.walkFrame = 0;
    me.walkTime = 0;
  }
  if (e.key === 'ArrowLeft') {
    me.walkingLeft = false;
    me.walkFrame = 0;
    me.walkTime = 0;
  }
  
          // Enviar estado actualizado al servidor
        if (socket) {
          socket.emit('playerMove', {
            x: me.x,
            y: me.y,
            walkingRight: me.walkingRight,
            walkingLeft: me.walkingLeft,
            walkFrame: me.walkFrame,
            walkTime: me.walkTime,
            lastDir: me.lastDir
          });
        }
  
  draw();
});



// Modifica el chat para detectar si el mensaje es para un NPC y responder
const chatInput = document.getElementById('chat-input');
chatInput.addEventListener('keydown', async e => {
  if (e.key === 'Enter') {
    const msg = chatInput.value.trim();
    if (msg) {
      const me = penguins.find(p => p.id === myId);
      if (me) {
        me.message = msg;
        me.messageTime = Date.now();
        chatInput.value = '';
        draw();
        me.walkingRight = false;
        me.walkingLeft = false;
        me.walkFrame = 0;
        me.walkTime = 0;
        
        // Enviar mensaje al servidor
        if (socket) {
          socket.emit('sendMessage', { message: msg });
        }
        
        // Enviar movimiento actualizado
        if (socket) {
          socket.emit('playerMove', {
            x: me.x,
            y: me.y,
            walkingRight: me.walkingRight,
            walkingLeft: me.walkingLeft,
            walkFrame: me.walkFrame,
            walkTime: me.walkTime,
            lastDir: me.lastDir
          });
        }
      }
    }
  }
});

// Walking animation
function updateWalkAnim() {
  // Actualizar animación del jugador local
  const me = penguins.find(p => p.id === myId);
  if (me && (me.walkingRight || me.walkingLeft)) {
    me.walkTime = (me.walkTime || 0) + 1;
    if (me.walkTime % 6 === 0) { // Change frame every 6 ticks (~60ms if setInterval is 100ms)
      me.walkFrame = ((me.walkFrame || 0) + 1) % WALK_FRAMES;
    }
  } else if (me) {
    me.walkFrame = 0;
    me.walkTime = 0;
  }
  
  // Actualizar animaciones de otros jugadores
  penguins.forEach(player => {
    if (player.id !== myId) {
      if (player.walkingRight || player.walkingLeft) {
        player.walkTime = (player.walkTime || 0) + 1;
        if (player.walkTime % 6 === 0) {
          player.walkFrame = ((player.walkFrame || 0) + 1) % WALK_FRAMES;
          console.log(`Animación de ${player.username}: frame ${player.walkFrame}, walking: ${player.walkingRight ? 'right' : 'left'}`);
        }
      } else {
        player.walkFrame = 0;
        player.walkTime = 0;
      }
    }
  });
}

// Redraw when images load
bgImgs[0].onload = bgImgs[1].onload = bgImgs[2].onload = bgImgs[3].onload = bgImgs[4].onload = draw;

penguinWalkImg.onload = () => {
  console.log('Imagen pengwalk.png cargada correctamente');
  draw();
};

penguinLeftImg.onload = () => {
  console.log('Imagen pengleft.png cargada correctamente');
  draw();
};

// Redraw every 100ms to update messages and animation
setInterval(() => {
  updateWalkAnim();
  draw();
}, 100);

// Attach event listeners after DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  const btnMain = document.getElementById('btn-main');
  const btnShillers = document.getElementById('btn-shillers');
  const btnMusic = document.getElementById('btn-music');
  const btnDimensional = document.getElementById('btn-dimensional');
  const btnZone5 = document.getElementById('btn-zone5');
  if (btnMain) btnMain.onclick = () => goToInstance(0);
  if (btnShillers) btnShillers.onclick = () => goToInstance(1);
  if (btnMusic) btnMusic.onclick = () => goToInstance(2);
  if (btnDimensional) btnDimensional.onclick = () => goToInstance(3);
  if (btnZone5) btnZone5.onclick = () => goToInstance(4);
  
  // Inicializar WebSocket
  initWebSocket();
  
  handleMusic();
}); 