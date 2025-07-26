# PengCity - Multiplayer Game

Un juego multiplayer de pinguinos usando WebSocket API con Socket.IO.

## Características

- **Multiplayer en tiempo real**: Juega con otros pinguinos en las mismas instancias
- **5 zonas diferentes**: MAIN, SHILLERS CAMP, MUSIC SECTOR, DIMENSIONAL, FLEX ZONE
- **Chat en tiempo real**: Comunícate con otros jugadores
- **Animaciones**: Pinguinos con animaciones de caminata
- **Efectos especiales**: Distorsión en la zona DIMENSIONAL
- **Música**: Reproducción automática en MUSIC SECTOR

## Instalación

1. Asegúrate de tener Node.js instalado
2. Instala las dependencias:
```bash
npm install
```

## Ejecutar el juego

### Desarrollo (con auto-reload)
```bash
npm run dev
```

### Producción
```bash
npm start
```

El servidor se ejecutará en `http://localhost:3000`

## Cómo jugar

1. Abre `http://localhost:3000` en tu navegador
2. Usa las flechas izquierda/derecha para moverte
3. Escribe mensajes en el chat y presiona Enter
4. Usa los botones de la barra lateral para cambiar de zona
5. Ve a la zona DIMENSIONAL para experimentar efectos especiales

## Controles

- **Flechas izquierda/derecha**: Mover el pinguino
- **Chat**: Escribe mensajes para comunicarte con otros jugadores
- **Botones de la barra lateral**: Cambiar de zona instantáneamente

## Tecnologías utilizadas

- **Frontend**: HTML5 Canvas, JavaScript vanilla
- **Backend**: Node.js, Express
- **WebSocket**: Socket.IO
- **Assets**: Sprites de pinguinos y fondos

## Estructura del proyecto

```
pengcity/
├── server.js          # Servidor WebSocket
├── main.js           # Lógica del juego (cliente)
├── index.html        # Página principal
├── style.css         # Estilos
├── package.json      # Dependencias
└── assets/          # Imágenes y audio
    ├── background*.png
    ├── peng*.png
    └── musicroom.mp3
```

## Multiplayer Features

- **Sincronización en tiempo real**: Todos los jugadores ven los mismos movimientos
- **Chat por proximidad**: Solo ves mensajes de jugadores cercanos
- **Cambio de instancias**: Los jugadores pueden moverse entre zonas
- **Gestión de conexiones**: Manejo automático de desconexiones

## Desarrollo

Para agregar nuevas características:

1. Modifica `server.js` para agregar nuevos eventos WebSocket
2. Actualiza `main.js` para manejar los nuevos eventos del cliente
3. Agrega nuevos assets en la carpeta correspondiente

## Licencia

ISC 