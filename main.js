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

// Finn character sprites
const finnWalkImg = new Image();
finnWalkImg.src = 'finnwalk.png';
const finnLeftImg = new Image();
finnLeftImg.src = 'finnleft.png';

// Jake character sprites
const jakeWalkImg = new Image();
jakeWalkImg.src = 'jakewalk.png';
const jakeLeftImg = new Image();
jakeLeftImg.src = 'jakeleft.png';

// Consol character sprites
const consolWalkImg = new Image();
consolWalkImg.src = 'consol.png';
const consolLeftImg = new Image();
consolLeftImg.src = 'consolleft.png';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const PENGUIN_SIZE = 64;
const WALK_FRAME_SIZE = 46.714; // 327px width / 7 frames = 46.714px per frame
const WALK_FRAMES = 7;

// Finn sprite constants
const FINN_FRAME_SIZE = 63.857; // 894px width / 14 frames = 63.857px per frame
const FINN_FRAMES = 14;
const FINN_SIZE = 100;

// Jake sprite constants
const JAKE_FRAME_SIZE = 37.875; // 303px width / 8 frames = 37.875px per frame
const JAKE_FRAMES = 8;
const JAKE_SIZE = 64;

// Consol sprite constants
const CONSOL_FRAME_SIZE = 26.25; // 210px width / 8 frames = 26.25px per frame
const CONSOL_FRAMES = 8;
const CONSOL_SIZE = 48;

// WebSocket connection
let socket;
let myId = null;
let currentInstance = 0;
let penguins = []; // Now will be dynamic based on connected players
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
let changeCharacterBtn = null;

// Character type for current player
let myCharacterType = 'penguin'; // 'penguin' or 'finn'

// Inicializar WebSocket
function initWebSocket() {
  socket = io();
  
  socket.on('connect', () => {
    console.log('Conectado al servidor WebSocket');
    
    // Initialize nickname system
    initNickname();
    
    // Randomly assign character type
    const characterTypes = ['penguin', 'finn', 'jake', 'consol'];
    myCharacterType = characterTypes[Math.floor(Math.random() * characterTypes.length)];
    console.log('Assigned character type:', myCharacterType);
    
    // Unirse al juego
    socket.emit('joinGame', {
      x: 200,
      y: 360,
      instance: currentInstance,
      username: `Penguin${Math.floor(Math.random() * 1000)}`,
      nickname: myNickname,
      characterType: myCharacterType
    });
  });

  socket.on('gameState', (data) => {
    console.log('Estado del juego recibido:', data);
    penguins = data.players;
    myId = data.myId;
    
    // Assign our nickname to our own player
    const myPlayer = penguins.find(p => p.id === myId);
    if (myPlayer && myNickname) {
      myPlayer.nickname = myNickname;
    }
    
    draw();
  });

  socket.on('playerJoined', (player) => {
    console.log('New player joined:', player);
    const existingPlayer = penguins.find(p => p.id === player.id);
    if (!existingPlayer) {
      penguins.push(player);
    }
    
    // If it's our own player, assign our nickname
    if (player.id === myId && myNickname) {
      player.nickname = myNickname;
    }
    
    draw();
  });

  socket.on('playerLeft', (data) => {
    console.log('Player left:', data);
    penguins = penguins.filter(p => p.id !== data.id);
    draw();
  });

  socket.on('playerMoved', (moveData) => {
    console.log('Movement received:', moveData);
    const player = penguins.find(p => p.id === moveData.id);
    if (player) {
      console.log('Updating player:', player.username, 'Position:', moveData.x, moveData.y, 'Walking:', moveData.walkingRight, moveData.walkingLeft);
      player.x = moveData.x;
      player.y = moveData.y;
      player.walkingRight = moveData.walkingRight;
      player.walkingLeft = moveData.walkingLeft;
      player.walkFrame = moveData.walkFrame;
      player.walkTime = moveData.walkTime;
      player.lastDir = moveData.lastDir;
      if (moveData.characterType) {
        player.characterType = moveData.characterType;
      }
      
      // Force animation update for other players
      if (moveData.walkingRight || moveData.walkingLeft) {
        // If player is walking, ensure animation updates
        if (player.walkTime === 0) {
          player.walkTime = 1;
        }
      }
    } else {
      console.log('Player not found for movement:', moveData.id);
    }
  });

  socket.on('playerMessage', (messageData) => {
    console.log('Message received:', messageData);
    const player = penguins.find(p => p.id === messageData.id);
    if (player) {
      player.message = messageData.message;
      player.messageTime = messageData.messageTime;
      console.log('Message applied to player:', player.username, 'Message:', player.message);
    } else {
      console.log('Player not found for message:', messageData.id);
    }
  });

  socket.on('instanceChanged', (data) => {
    console.log('Instance changed:', data);
    penguins = data.players;
    currentInstance = data.instance;
    
    // Assign our nickname to our own player
    const myPlayer = penguins.find(p => p.id === myId);
    if (myPlayer && myNickname) {
      myPlayer.nickname = myNickname;
    }
    
    draw();
  });

  socket.on('playerNicknameUpdated', (data) => {
    console.log('Nickname updated:', data);
    const player = penguins.find(p => p.id === data.id);
    if (player) {
      player.nickname = data.nickname;
      draw();
    }
  });

  socket.on('playerCharacterUpdated', (data) => {
    console.log('Character updated:', data);
    const player = penguins.find(p => p.id === data.id);
    if (player) {
      player.characterType = data.characterType;
      draw();
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
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

function drawCharacter(p, isMyPlayer) {
  const characterType = p.characterType || 'penguin';
  let frame = 0;
  let img, frameSize, totalFrames, charSize;
  
  // Determine character properties based on type
  if (characterType === 'finn') {
    frameSize = FINN_FRAME_SIZE;
    totalFrames = FINN_FRAMES;
    charSize = FINN_SIZE;
  } else if (characterType === 'jake') {
    frameSize = JAKE_FRAME_SIZE;
    totalFrames = JAKE_FRAMES;
    charSize = JAKE_SIZE;
  } else if (characterType === 'consol') {
    frameSize = CONSOL_FRAME_SIZE;
    totalFrames = CONSOL_FRAMES;
    charSize = CONSOL_SIZE;
  } else {
    frameSize = WALK_FRAME_SIZE;
    totalFrames = WALK_FRAMES;
    charSize = PENGUIN_SIZE;
  }
  
  // Determine which image and frame to use
  if (characterType === 'finn') {
    if (p.walkingRight) {
      frame = p.walkFrame % totalFrames;
      img = finnWalkImg;
    } else if (p.walkingLeft) {
      frame = p.walkFrame % totalFrames;
      img = finnLeftImg;
    } else {
      // Idle: show frame 0 facing last direction
      img = (p.lastDir === 'left') ? finnLeftImg : finnWalkImg;
      frame = 0;
    }
  } else if (characterType === 'jake') {
    if (p.walkingRight) {
      frame = p.walkFrame % totalFrames;
      img = jakeWalkImg;
    } else if (p.walkingLeft) {
      frame = p.walkFrame % totalFrames;
      img = jakeLeftImg;
    } else {
      // Idle: show frame 0 facing last direction
      img = (p.lastDir === 'left') ? jakeLeftImg : jakeWalkImg;
      frame = 0;
    }
  } else if (characterType === 'consol') {
    if (p.walkingRight) {
      frame = p.walkFrame % totalFrames;
      img = consolWalkImg;
    } else if (p.walkingLeft) {
      frame = p.walkFrame % totalFrames;
      img = consolLeftImg;
    } else {
      // Idle: show frame 0 facing last direction
      img = (p.lastDir === 'left') ? consolLeftImg : consolWalkImg;
      frame = 0;
    }
  } else {
    // Penguin character
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
  }
  
  // Distortion effect for player in DIMENSIONAL
  if (currentInstance === 3 && isMyPlayer && distortionActive) {
    ctx.save();
    const cx = p.x + charSize/2;
    const cy = p.y + charSize/2;
    ctx.translate(cx, cy);
    ctx.rotate((Math.random() - 0.5) * 0.6); // random rotation
    const scale = 1 + (Math.random() - 0.5) * 0.5; // random scale
    ctx.scale(scale, scale);
    
    // Use precise frame calculation for all characters
    if (characterType === 'finn') {
      const actualFrameWidth = 894 / 14; // 63.857px per frame
      ctx.drawImage(
        img,
        frame * actualFrameWidth, 0, actualFrameWidth, 75,
        -charSize/2, -charSize/2, charSize, charSize
      );
    } else if (characterType === 'jake') {
      const actualFrameWidth = 303 / 8; // 37.875px per frame
      ctx.drawImage(
        img,
        frame * actualFrameWidth, 0, actualFrameWidth, 61,
        -charSize/2, -charSize/2, charSize, charSize
      );
    } else if (characterType === 'consol') {
      const actualFrameWidth = 210 / 8; // 26.25px per frame
      ctx.drawImage(
        img,
        frame * actualFrameWidth, 0, actualFrameWidth, 49,
        -charSize/2, -charSize/2, charSize, charSize
      );
    } else {
      // Penguin character
      const actualFrameWidth = 327 / 7; // 46.714px per frame
      ctx.drawImage(
        img,
        frame * actualFrameWidth, 0, actualFrameWidth, 50,
        -charSize/2, -charSize/2, charSize, charSize
      );
    }
    ctx.restore();
  } else {
    // Use precise frame calculation for all characters
    if (characterType === 'finn') {
      const actualFrameWidth = 894 / 14; // 63.857px per frame
      // Adjust position for larger character to center it properly
      const offsetX = (PENGUIN_SIZE - charSize) / 2;
      const offsetY = (PENGUIN_SIZE - charSize) / 2;
      ctx.drawImage(
        img,
        frame * actualFrameWidth, 0, actualFrameWidth, 75,
        p.x + offsetX, p.y + offsetY, charSize, charSize
      );
    } else if (characterType === 'jake') {
      const actualFrameWidth = 303 / 8; // 37.875px per frame
      ctx.drawImage(
        img,
        frame * actualFrameWidth, 0, actualFrameWidth, 61,
        p.x, p.y, charSize, charSize
      );
    } else if (characterType === 'consol') {
      const actualFrameWidth = 210 / 8; // 26.25px per frame
      // Adjust position for smaller character to center it properly
      const offsetX = (PENGUIN_SIZE - charSize) / 2;
      const offsetY = (PENGUIN_SIZE - charSize) / 2;
      ctx.drawImage(
        img,
        frame * actualFrameWidth, 0, actualFrameWidth, 49,
        p.x + offsetX, p.y + offsetY, charSize, charSize
      );
    } else {
      // Penguin character
      const actualFrameWidth = 327 / 7; // 46.714px per frame
      ctx.drawImage(
        img,
        frame * actualFrameWidth, 0, actualFrameWidth, 50,
        p.x, p.y, charSize, charSize
      );
    }
  }
}

function draw() {
  // Background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImgs[currentInstance], 0, 0, canvas.width, canvas.height);

  const now = Date.now();
  const me = penguins.find(p => p.id === myId);
  const PROXIMITY_DIST = 200; // Increased to make messages easier to see
  
  penguins.forEach(p => {
    const isMyPlayer = p.id === myId;
    drawCharacter(p, isMyPlayer);
    
    // Draw nickname above character
    if (p.nickname && p.nickname.length > 0) {
      const characterType = p.characterType || 'penguin';
      let charSize;
      if (characterType === 'finn') {
        charSize = FINN_SIZE;
      } else if (characterType === 'jake') {
        charSize = JAKE_SIZE;
      } else if (characterType === 'consol') {
        charSize = CONSOL_SIZE;
      } else {
        charSize = PENGUIN_SIZE;
      }
      
      ctx.save();
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Adjust position based on character type for proper centering
      let nicknameX, nicknameY;
      if (characterType === 'finn') {
        // Finn is larger, adjust position to center properly
        nicknameX = p.x + 50; // Center of 100px character
        nicknameY = p.y - 15;
      } else {
        // Other characters use standard centering
        nicknameX = p.x + charSize / 2;
        nicknameY = p.y - 15;
      }
      
      // Draw stroke (outline)
      ctx.strokeText(p.nickname, nicknameX, nicknameY);
      // Draw text
      ctx.fillText(p.nickname, nicknameX, nicknameY);
      ctx.restore();
    }
    
    // Show message only if it's the player or if close
    const characterType = p.characterType || 'penguin';
    let charSize;
    if (characterType === 'finn') {
      charSize = FINN_SIZE;
    } else if (characterType === 'jake') {
      charSize = JAKE_SIZE;
    } else if (characterType === 'consol') {
      charSize = CONSOL_SIZE;
    } else {
      charSize = PENGUIN_SIZE;
    }
    
    if (p.id === myId) {
      if (p.message && now - p.messageTime < MESSAGE_DURATION) {
        drawSpeechBubble(p.x + charSize/2, p.y - 10, p.message);
      } else if (p.message && now - p.messageTime >= MESSAGE_DURATION) {
        p.message = '';
      }
    } else {
      // Other players: only show message if player is close
      if (me) {
        const myCharType = me.characterType || 'penguin';
        let myCharSize;
        if (myCharType === 'finn') {
          myCharSize = FINN_SIZE;
        } else if (myCharType === 'jake') {
          myCharSize = JAKE_SIZE;
        } else if (myCharType === 'consol') {
          myCharSize = CONSOL_SIZE;
        } else {
          myCharSize = PENGUIN_SIZE;
        }
        const dx = (p.x + charSize/2) - (me.x + myCharSize/2);
        const dy = (p.y + charSize/2) - (me.y + myCharSize/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < PROXIMITY_DIST && p.message && now - p.messageTime < MESSAGE_DURATION) {
          console.log('Showing message from nearby player:', p.username, 'Message:', p.message, 'Distance:', dist);
          drawSpeechBubble(p.x + charSize/2, p.y - 10, p.message);
        }
        if (p.message && now - p.messageTime >= MESSAGE_DURATION) {
          p.message = '';
        }
      } else {
        // If no local player, show all messages (for debug)
        if (p.message && now - p.messageTime < MESSAGE_DURATION) {
          drawSpeechBubble(p.x + charSize/2, p.y - 10, p.message);
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
    ctx.fillStyle = '#ff7d00';
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
  changeCharacterBtn = document.getElementById('change-character-btn');
  
  // Load saved nickname from localStorage
  const savedNickname = localStorage.getItem('pengcity_nickname');
  if (savedNickname) {
    myNickname = savedNickname;
    nicknameInput.value = savedNickname;
  }
  
  // Set nickname button click handler
  setNicknameBtn.addEventListener('click', setNickname);
  
  // Set character change button click handler
  changeCharacterBtn.addEventListener('click', changeCharacter);
  
  // Update button text based on current character
  changeCharacterBtn.textContent = 'Switch Character';
  
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

function changeCharacter() {
  // Cycle through all characters: penguin -> finn -> jake -> consol -> penguin
  if (myCharacterType === 'penguin') {
    myCharacterType = 'finn';
  } else if (myCharacterType === 'finn') {
    myCharacterType = 'jake';
  } else if (myCharacterType === 'jake') {
    myCharacterType = 'consol';
  } else {
    myCharacterType = 'penguin';
  }
  
  // Update our own player locally
  const myPlayer = penguins.find(p => p.id === myId);
  if (myPlayer) {
    myPlayer.characterType = myCharacterType;
  }
  
  // Notify server about character change
  if (socket) {
    socket.emit('updateCharacter', { characterType: myCharacterType });
  }
  
  // Visual feedback
  changeCharacterBtn.textContent = 'Switch Character';
  
  // Redraw to show the character change immediately
  draw();
  
  console.log('Character changed to:', myCharacterType);
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
                      me.x = canvas.width - WALK_FRAME_SIZE;
        }
        // Notify server of instance change
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
          me.x = canvas.width - WALK_FRAME_SIZE;
        } else {
          // Same instance (shouldn't happen but just in case)
          me.x = 0;
        }
        // Notify server of instance change
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
    if (me.x > canvas.width - PENGUIN_SIZE) {
      if (currentInstance < 4) { // 5 instances total (0-4)
        // Change to next instance
        startFade(currentInstance + 1);
      } else {
        me.x = canvas.width - PENGUIN_SIZE;
      }
    }
    me.walkingRight = true;
    me.walkingLeft = false;
    me.lastDir = 'right';
  }
  
      // Send movement to server
  if (socket) {
    const moveData = {
      x: me.x,
      y: me.y,
      walkingRight: me.walkingRight,
      walkingLeft: me.walkingLeft,
      walkFrame: me.walkFrame,
      walkTime: me.walkTime,
      lastDir: me.lastDir,
      characterType: myCharacterType
    };
    console.log('Sending movement:', moveData);
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
  
      // Send updated state to server
  if (socket) {
    socket.emit('playerMove', {
      x: me.x,
      y: me.y,
      walkingRight: me.walkingRight,
      walkingLeft: me.walkingLeft,
      walkFrame: me.walkFrame,
      walkTime: me.walkTime,
      lastDir: me.lastDir,
      characterType: myCharacterType
    });
  }
  
  draw();
});



// Modify chat to detect if message is for an NPC and respond
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
        
        // Send message to server
        if (socket) {
          socket.emit('sendMessage', { message: msg });
        }
        
        // Send updated movement
        if (socket) {
          socket.emit('playerMove', {
            x: me.x,
            y: me.y,
            walkingRight: me.walkingRight,
            walkingLeft: me.walkingLeft,
            walkFrame: me.walkFrame,
            walkTime: me.walkTime,
            lastDir: me.lastDir,
            characterType: myCharacterType
          });
        }
      }
    }
  }
});

// Walking animation
function updateWalkAnim() {
  // Update local player animation
  const me = penguins.find(p => p.id === myId);
  if (me && (me.walkingRight || me.walkingLeft)) {
    me.walkTime = (me.walkTime || 0) + 1;
    if (me.walkTime % 6 === 0) { // Change frame every 6 ticks (~60ms if setInterval is 100ms)
      const characterType = me.characterType || 'penguin';
      let totalFrames;
      if (characterType === 'finn') {
        totalFrames = FINN_FRAMES;
      } else if (characterType === 'jake') {
        totalFrames = JAKE_FRAMES;
      } else if (characterType === 'consol') {
        totalFrames = CONSOL_FRAMES;
      } else {
        totalFrames = WALK_FRAMES;
      }
      me.walkFrame = ((me.walkFrame || 0) + 1) % totalFrames;
    }
  } else if (me) {
    me.walkFrame = 0;
    me.walkTime = 0;
  }
  
  // Update other players' animations
  penguins.forEach(player => {
    if (player.id !== myId) {
      if (player.walkingRight || player.walkingLeft) {
        player.walkTime = (player.walkTime || 0) + 1;
        if (player.walkTime % 6 === 0) {
          const characterType = player.characterType || 'penguin';
          let totalFrames;
          if (characterType === 'finn') {
            totalFrames = FINN_FRAMES;
          } else if (characterType === 'jake') {
            totalFrames = JAKE_FRAMES;
          } else if (characterType === 'consol') {
            totalFrames = CONSOL_FRAMES;
          } else {
            totalFrames = WALK_FRAMES;
          }
          player.walkFrame = ((player.walkFrame || 0) + 1) % totalFrames;
          console.log(`Animation of ${player.username}: frame ${player.walkFrame}, walking: ${player.walkingRight ? 'right' : 'left'}`);
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

finnWalkImg.onload = () => {
  console.log('Imagen finnwalk.png cargada correctamente');
  draw();
};

finnLeftImg.onload = () => {
  console.log('Imagen finnleft.png cargada correctamente');
  draw();
};

jakeWalkImg.onload = () => {
  console.log('Imagen jakewalk.png cargada correctamente');
  draw();
};

jakeLeftImg.onload = () => {
  console.log('Imagen jakeleft.png cargada correctamente');
  draw();
};

consolWalkImg.onload = () => {
  console.log('Imagen consol.png cargada correctamente');
  draw();
};

consolLeftImg.onload = () => {
  console.log('Imagen consolleft.png cargada correctamente');
  draw();
};

// Redraw every 100ms to update messages and animation
setInterval(() => {
  updateWalkAnim();
  draw();
}, 100);

function resizeGameCanvas() {
  // Desktop: fixed size
  if (window.innerWidth > 900) {
    canvas.width = 900;
    canvas.height = 450;
  } else {
    // Mobile: fill available space between nickname and chat
    const nicknameBar = document.getElementById('nickname-container');
    const chatBar = document.getElementById('chat-bar');
    const nicknameHeight = nicknameBar ? nicknameBar.offsetHeight : 0;
    const chatHeight = chatBar ? chatBar.offsetHeight : 0;
    const availableHeight = window.innerHeight - nicknameHeight - chatHeight - 16; // 16px margin
    let width = window.innerWidth;
    let height = Math.floor(width / 2); // 2:1 aspect ratio
    if (height > availableHeight) {
      height = availableHeight;
      width = Math.floor(height * 2);
      if (width > window.innerWidth) width = window.innerWidth;
    }
    canvas.width = width;
    canvas.height = height;
  }
  draw();
}

window.addEventListener('resize', resizeGameCanvas);
document.addEventListener('DOMContentLoaded', resizeGameCanvas);

// Loading screen functionality
let loadingProgress = 0;
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');

function updateLoadingProgress(progress) {
  loadingProgress = progress;
  if (progressBar) {
    progressBar.style.width = progress + '%';
  }
}

function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      // Remove loading class from body
      document.body.classList.remove('loading');
    }, 500);
  }
}

function simulateLoading() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5; // Random increment between 5-20%
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(hideLoadingScreen, 500);
    }
    updateLoadingProgress(progress);
  }, 200);
}

// Start loading simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Add loading class to body
  document.body.classList.add('loading');
  simulateLoading();
});

// Attach event listeners after DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  // Dropdown functionality
  const dropdownBtn = document.getElementById('dropdown-btn');
  const dropdown = document.querySelector('.dropdown');
  
  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
  
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
  
  // Social media buttons
  const btnTwitter = document.getElementById('btn-twitter');
  const btnTelegram = document.getElementById('btn-telegram');
  const btnBuy = document.getElementById('btn-buy');
  if (btnTwitter) btnTwitter.onclick = () => window.open('https://x.com/absventuretime', '_blank');
  if (btnTelegram) btnTelegram.onclick = () => window.open('https://t.me/AbsventureTime', '_blank');
  if (btnBuy) btnBuy.onclick = () => window.open('https://dexscreener.com/moonshot/new/abstract', '_blank');

  // Mobile movement controls
  const btnMobileLeft = document.getElementById('mobile-left');
  const btnMobileRight = document.getElementById('mobile-right');
  function emitMove() {
    const me = penguins.find(p => p.id === myId);
    if (!me || !socket) return;
    socket.emit('playerMove', {
      x: me.x,
      y: me.y,
      walkingRight: me.walkingRight,
      walkingLeft: me.walkingLeft,
      walkFrame: me.walkFrame,
      walkTime: me.walkTime,
      lastDir: me.lastDir,
      characterType: myCharacterType
    });
  }
  if (btnMobileLeft) {
    btnMobileLeft.addEventListener('touchstart', e => {
      e.preventDefault();
      const me = penguins.find(p => p.id === myId);
      if (me) {
        me.walkingLeft = true;
        me.walkingRight = false;
        me.lastDir = 'left';
        emitMove();
      }
    });
    btnMobileLeft.addEventListener('touchend', e => {
      e.preventDefault();
      const me = penguins.find(p => p.id === myId);
      if (me) {
        me.walkingLeft = false;
        emitMove();
      }
    });
  }
  if (btnMobileRight) {
    btnMobileRight.addEventListener('touchstart', e => {
      e.preventDefault();
      const me = penguins.find(p => p.id === myId);
      if (me) {
        me.walkingRight = true;
        me.walkingLeft = false;
        me.lastDir = 'right';
        emitMove();
      }
    });
    btnMobileRight.addEventListener('touchend', e => {
      e.preventDefault();
      const me = penguins.find(p => p.id === myId);
      if (me) {
        me.walkingRight = false;
        emitMove();
      }
    });
  }

  // Inicializar WebSocket
  initWebSocket();
  
  handleMusic();
}); 