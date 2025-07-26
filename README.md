# PengCity - Multiplayer Game

A multiplayer penguin game using WebSocket API with Socket.IO.

## Features

- **Real-time multiplayer**: Play with other penguins in the same instances
- **5 different zones**: MAIN, SHILLERS CAMP, MUSIC SECTOR, DIMENSIONAL, FLEX ZONE
- **Real-time chat**: Communicate with other players
- **Animations**: Penguins with walking animations
- **Special effects**: Distortion in the DIMENSIONAL zone
- **Music**: Auto-play in MUSIC SECTOR

## Installation

1. Make sure you have Node.js installed
2. Install dependencies:
```bash
npm install
```

## Running the game

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will run on `http://localhost:3000`

## How to play

1. Open `http://localhost:3000` in your browser
2. Use left/right arrows to move
3. Type messages in the chat and press Enter
4. Use the sidebar buttons to change zones
5. Go to the DIMENSIONAL zone to experience special effects

## Controls

- **Left/right arrows**: Move the penguin
- **Chat**: Type messages to communicate with other players
- **Sidebar buttons**: Change zones instantly

## Technologies used

- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **Backend**: Node.js, Express
- **WebSocket**: Socket.IO
- **Assets**: Penguin sprites and backgrounds

## Project structure

```
pengcity/
├── server.js          # WebSocket server
├── main.js           # Game logic (client)
├── index.html        # Main page
├── style.css         # Styles
├── package.json      # Dependencies
└── assets/          # Images and audio
    ├── background*.png
    ├── peng*.png
    └── musicroom.mp3
```

## Multiplayer Features

- **Real-time synchronization**: All players see the same movements
- **Proximity chat**: You only see messages from nearby players
- **Instance switching**: Players can move between zones
- **Connection management**: Automatic handling of disconnections

## Development

To add new features:

1. Modify `server.js` to add new WebSocket events
2. Update `main.js` to handle new client events
3. Add new assets in the corresponding folder

## License

ISC 