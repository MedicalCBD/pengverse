const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve static files
app.use(express.static(__dirname));

// Specific route for index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rutas de debug para verificar archivos
app.get('/debug', (req, res) => {
  res.json({
    message: 'Server is running',
    files: [
      'index.html',
      'main.js',
      'server.js',
      'style.css',
      'background.png',
      'pengwalk.png',
      'pengleft.png'
    ]
  });
});

// Route to check specific files
app.get('/check/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, filename);
  const fs = require('fs');
  
  if (fs.existsSync(filePath)) {
    res.json({ exists: true, filename });
  } else {
    res.json({ exists: false, filename });
  }
});

// Almacenar el estado del juego
const gameState = {
  players: new Map(), // socketId -> playerData
  instances: {
    0: [], // MAIN
    1: [], // SHILLERS CAMP
    2: [], // MUSIC SECTOR
    3: [], // DIMENSIONAL
    4: []  // FLEX ZONE
  }
};

// Generate unique ID for player
function generatePlayerId() {
  return Math.floor(Math.random() * 1000000) + 1;
}

// Get players in a specific instance
function getPlayersInInstance(instanceId) {
  return Array.from(gameState.players.values())
    .filter(player => player.instance === instanceId);
}

// Broadcast to all players in an instance
function broadcastToInstance(instanceId, event, data) {
  const playersInInstance = getPlayersInInstance(instanceId);
  playersInInstance.forEach(player => {
    io.to(player.socketId).emit(event, data);
  });
}

io.on('connection', (socket) => {
      console.log('New player connected:', socket.id);

  // When a player joins the game
  socket.on('joinGame', (playerData) => {
    const playerId = generatePlayerId();
    const player = {
      id: playerId,
      socketId: socket.id,
      x: playerData.x || 200,
      y: playerData.y || 360,
      instance: playerData.instance || 0,
      message: '',
      messageTime: 0,
      walkingRight: false,
      walkingLeft: false,
      walkFrame: 0,
      walkTime: 0,
      lastDir: 'right',
      username: playerData.username || `Penguin${playerId}`,
      nickname: playerData.nickname || '',
      characterType: playerData.characterType || 'penguin'
    };

    gameState.players.set(socket.id, player);
    gameState.instances[player.instance].push(player);

    // Send current instance state to the new player
    const playersInInstance = getPlayersInInstance(player.instance);
    socket.emit('gameState', {
      players: playersInInstance,
      myId: playerId
    });

    // Notify other players in the same instance
    broadcastToInstance(player.instance, 'playerJoined', player);
    
    console.log(`Player ${player.username} joined instance ${player.instance}`);
  });

  // When a player moves
  socket.on('playerMove', (moveData) => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    console.log(`Player ${player.username} moves:`, moveData);

    // Update player position
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

    // Broadcast to other players in the same instance
    const playersInInstance = getPlayersInInstance(player.instance);
    console.log(`Broadcasting to ${playersInInstance.length - 1} players in instance ${player.instance}`);
    playersInInstance.forEach(otherPlayer => {
      if (otherPlayer.socketId !== socket.id) {
        const moveDataToSend = {
          id: player.id,
          x: player.x,
          y: player.y,
          walkingRight: player.walkingRight,
          walkingLeft: player.walkingLeft,
          walkFrame: player.walkFrame,
          walkTime: player.walkTime,
          lastDir: player.lastDir,
          characterType: player.characterType
        };
        console.log(`Sending to ${otherPlayer.username}:`, moveDataToSend);
        io.to(otherPlayer.socketId).emit('playerMoved', moveDataToSend);
      }
    });
  });

  // When a player changes instance
  socket.on('changeInstance', (instanceData) => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    const oldInstance = player.instance;
    const newInstance = instanceData.instance;

    // Remove player from previous instance
    gameState.instances[oldInstance] = gameState.instances[oldInstance]
      .filter(p => p.socketId !== socket.id);

    // Add player to new instance
    player.instance = newInstance;
    player.x = instanceData.x || 0;
    player.y = instanceData.y || 360;
    gameState.instances[newInstance].push(player);

    // Notify players in previous instance
    broadcastToInstance(oldInstance, 'playerLeft', { id: player.id });

    // Notify players in new instance
    broadcastToInstance(newInstance, 'playerJoined', player);

    // Send new instance state to player
    const playersInNewInstance = getPlayersInInstance(newInstance);
    socket.emit('instanceChanged', {
      players: playersInNewInstance,
      instance: newInstance
    });

    console.log(`Player ${player.username} changed from instance ${oldInstance} to ${newInstance}`);
  });

  // When a player sends a message
  socket.on('sendMessage', (messageData) => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    player.message = messageData.message;
    player.messageTime = Date.now();

    // Broadcast to other players in the same instance
    const playersInInstance = getPlayersInInstance(player.instance);
    playersInInstance.forEach(otherPlayer => {
      if (otherPlayer.socketId !== socket.id) {
        io.to(otherPlayer.socketId).emit('playerMessage', {
          id: player.id,
          message: player.message,
          messageTime: player.messageTime
        });
      }
    });
  });

  // When a player updates their nickname
  socket.on('updateNickname', (data) => {
    const player = gameState.players.get(socket.id);
    if (player) {
      player.nickname = data.nickname;
      console.log(`Player ${player.username} changed nickname to: ${data.nickname}`);
      
      // Notify other players in the same instance
      const playersInInstance = getPlayersInInstance(player.instance);
      playersInInstance.forEach(otherPlayer => {
        if (otherPlayer.socketId !== socket.id) {
          io.to(otherPlayer.socketId).emit('playerNicknameUpdated', {
            id: player.id,
            nickname: data.nickname
          });
        }
      });
    }
  });

  // When a player updates their character
  socket.on('updateCharacter', (data) => {
    const player = gameState.players.get(socket.id);
    if (player) {
      player.characterType = data.characterType;
      console.log(`Player ${player.username} changed character to: ${data.characterType}`);
      
      // Notify other players in the same instance
      const playersInInstance = getPlayersInInstance(player.instance);
      playersInInstance.forEach(otherPlayer => {
        if (otherPlayer.socketId !== socket.id) {
          io.to(otherPlayer.socketId).emit('playerCharacterUpdated', {
            id: player.id,
            characterType: data.characterType
          });
        }
      });
    }
  });

  // When a player disconnects
  socket.on('disconnect', () => {
    const player = gameState.players.get(socket.id);
    if (player) {
      // Remove from instance
      gameState.instances[player.instance] = gameState.instances[player.instance]
        .filter(p => p.socketId !== socket.id);
      
      // Remover del estado global
      gameState.players.delete(socket.id);

      // Notify other players
      broadcastToInstance(player.instance, 'playerLeft', { id: player.id });
      
      console.log(`Player ${player.username} disconnected from instance ${player.instance}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser`);
}); 