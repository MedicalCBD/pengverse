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

// Servir archivos estáticos
app.use(express.static(__dirname));

// Ruta específica para el index.html
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

// Generar ID único para jugador
function generatePlayerId() {
  return Math.floor(Math.random() * 1000000) + 1;
}

// Obtener jugadores en una instancia específica
function getPlayersInInstance(instanceId) {
  return Array.from(gameState.players.values())
    .filter(player => player.instance === instanceId);
}

// Broadcast a todos los jugadores en una instancia
function broadcastToInstance(instanceId, event, data) {
  const playersInInstance = getPlayersInInstance(instanceId);
  playersInInstance.forEach(player => {
    io.to(player.socketId).emit(event, data);
  });
}

io.on('connection', (socket) => {
  console.log('Nuevo jugador conectado:', socket.id);

  // Cuando un jugador se une al juego
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
      nickname: playerData.nickname || ''
    };

    gameState.players.set(socket.id, player);
    gameState.instances[player.instance].push(player);

    // Enviar estado actual de la instancia al nuevo jugador
    const playersInInstance = getPlayersInInstance(player.instance);
    socket.emit('gameState', {
      players: playersInInstance,
      myId: playerId
    });

    // Notificar a otros jugadores en la misma instancia
    broadcastToInstance(player.instance, 'playerJoined', player);
    
    console.log(`Jugador ${player.username} se unió a la instancia ${player.instance}`);
  });

  // Cuando un jugador se mueve
  socket.on('playerMove', (moveData) => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    console.log(`Jugador ${player.username} se mueve:`, moveData);

    // Actualizar posición del jugador
    player.x = moveData.x;
    player.y = moveData.y;
    player.walkingRight = moveData.walkingRight;
    player.walkingLeft = moveData.walkingLeft;
    player.walkFrame = moveData.walkFrame;
    player.walkTime = moveData.walkTime;
    player.lastDir = moveData.lastDir;

    // Broadcast a otros jugadores en la misma instancia
    const playersInInstance = getPlayersInInstance(player.instance);
    console.log(`Broadcasting a ${playersInInstance.length - 1} jugadores en instancia ${player.instance}`);
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
          lastDir: player.lastDir
        };
        console.log(`Enviando a ${otherPlayer.username}:`, moveDataToSend);
        io.to(otherPlayer.socketId).emit('playerMoved', moveDataToSend);
      }
    });
  });

  // Cuando un jugador cambia de instancia
  socket.on('changeInstance', (instanceData) => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    const oldInstance = player.instance;
    const newInstance = instanceData.instance;

    // Remover jugador de la instancia anterior
    gameState.instances[oldInstance] = gameState.instances[oldInstance]
      .filter(p => p.socketId !== socket.id);

    // Agregar jugador a la nueva instancia
    player.instance = newInstance;
    player.x = instanceData.x || 0;
    player.y = instanceData.y || 360;
    gameState.instances[newInstance].push(player);

    // Notificar a jugadores en la instancia anterior
    broadcastToInstance(oldInstance, 'playerLeft', { id: player.id });

    // Notificar a jugadores en la nueva instancia
    broadcastToInstance(newInstance, 'playerJoined', player);

    // Enviar estado de la nueva instancia al jugador
    const playersInNewInstance = getPlayersInInstance(newInstance);
    socket.emit('instanceChanged', {
      players: playersInNewInstance,
      instance: newInstance
    });

    console.log(`Jugador ${player.username} cambió de instancia ${oldInstance} a ${newInstance}`);
  });

  // Cuando un jugador envía un mensaje
  socket.on('sendMessage', (messageData) => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    player.message = messageData.message;
    player.messageTime = Date.now();

    // Broadcast a otros jugadores en la misma instancia
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

  // Cuando un jugador actualiza su nickname
  socket.on('updateNickname', (data) => {
    const player = gameState.players.get(socket.id);
    if (player) {
      player.nickname = data.nickname;
      console.log(`Jugador ${player.username} cambió su nickname a: ${data.nickname}`);
      
      // Notificar a otros jugadores en la misma instancia
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

  // Cuando un jugador se desconecta
  socket.on('disconnect', () => {
    const player = gameState.players.get(socket.id);
    if (player) {
      // Remover de la instancia
      gameState.instances[player.instance] = gameState.instances[player.instance]
        .filter(p => p.socketId !== socket.id);
      
      // Remover del estado global
      gameState.players.delete(socket.id);

      // Notificar a otros jugadores
      broadcastToInstance(player.instance, 'playerLeft', { id: player.id });
      
      console.log(`Jugador ${player.username} se desconectó de la instancia ${player.instance}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket ejecutándose en puerto ${PORT}`);
  console.log(`Abre http://localhost:${PORT} en tu navegador`);
}); 