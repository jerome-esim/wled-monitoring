# LED Shader Controller

Une application web pour contrôler 12 strips LED (3000 LEDs totales) via Art-Net avec application de shaders GLSL personnalisés, destinée à des performances DJ live.

## 🎨 Fonctionnalités

- **Contrôle de 12 strips LED** (250 LEDs chacune) via protocole Art-Net
- **Éditeur de shaders GLSL** avec preview temps réel
- **Bibliothèque de shaders** avec catégorisation
- **Canvas interactif** pour positionner visuellement les strips
- **Contrôle BPM** pour synchronisation DJ
- **Interface temps réel** via WebSocket
- **3 shaders de base** inclus : Rainbow Wave, Strobe BPM, Gradient Sweep

## 🏗️ Architecture

```
led-controller/
├── frontend/          # React + TypeScript + Three.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/        # Layout des strips
│   │   │   ├── ShaderEditor/  # Editeur GLSL
│   │   │   ├── ShaderLibrary/ # Liste shaders
│   │   │   └── Controls/      # UI contrôles
│   │   ├── hooks/
│   │   │   └── useSocket.ts   # WebSocket client
│   │   ├── services/
│   │   │   └── shaderEngine.ts # Rendu Three.js
│   │   └── store/
│   │       └── appStore.ts    # Zustand state
│   └── package.json
│
├── backend/           # Node.js + Express
│   ├── src/
│   │   ├── services/
│   │   │   ├── artnet.service.ts  # Génération Art-Net
│   │   │   └── shader.service.ts  # Gestion shaders
│   │   ├── sockets/
│   │   │   └── artnet.socket.ts   # WebSocket server
│   │   └── index.ts
│   └── package.json
│
└── shared/            # Types partagés
    └── types.ts
```

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- ESP32 avec firmware WLED
- Réseau local 192.168.x.x

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Le serveur démarre sur `http://localhost:3001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'interface web s'ouvre sur `http://localhost:5173`

## 📝 Configuration

### Configuration des Strips

Par défaut, le projet charge "Live Setup Jerome" avec 6 strips :

```typescript
{
  name: "Live Setup Jerome",
  strips: [
    {
      id: 1,
      name: "Strip 1",
      universe: 0,
      startChannel: 1,
      ledCount: 250,
      position: { x: 50, y: 50 },
      orientation: "horizontal",
      ipAddress: "192.168.1.10"
    },
    // ... 5 autres strips
  ]
}
```

### Variables d'environnement

**Backend** (`.env`):
```
PORT=3001
ARTNET_PORT=6454
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`.env` - optionnel):
```
VITE_SOCKET_URL=http://localhost:3001
```

## 🎮 Utilisation

### 1. Créer un shader

1. Cliquez sur "+ New" dans la bibliothèque de shaders
2. Éditez le code GLSL dans l'éditeur Monaco
3. Utilisez les uniforms disponibles :
   - `time` : Temps écoulé
   - `bpm` : BPM actuel
   - `resolution` : Taille du strip (vec2)
   - `color1`, `color2` : Couleurs paramétrables (vec4)
   - `speed` : Vitesse d'animation

### 2. Appliquer un shader

1. Sélectionnez un shader dans la bibliothèque
2. Cliquez sur un strip dans le canvas
3. Le shader s'applique automatiquement

### 3. Contrôler la lecture

- **Play/Stop** : Lance/arrête l'envoi Art-Net
- **BPM** : Ajustez pour synchroniser avec la musique
- **Speed** : Contrôle la vitesse des animations
- **Colors** : Modifie les couleurs primaires/secondaires

## 📡 Protocole Art-Net

### Spécifications

- **Version** : Art-Net 4
- **Port UDP** : 6454
- **Fréquence** : 40 FPS minimum
- **Canaux par LED** : 3 (RGB)
- **LEDs par univers** : 170 max (512 canaux / 3)

### Structure des paquets

```
Header: "Art-Net" + 0x00
OpCode: 0x5000 (ArtDmx)
Protocol Version: 14
Sequence: increment
Physical: 0
Universe: 0-15
Length: nombre de canaux
Data: [R1, G1, B1, R2, G2, B2, ...]
```

Pour 250 LEDs, 2 univers Art-Net sont nécessaires.

## 🎨 Exemples de Shaders

### Rainbow Wave

```glsl
precision highp float;
uniform float time;
uniform float speed;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float wave = sin(uv.x * 10.0 + time * speed) * 0.5 + 0.5;
  vec3 rainbow = vec3(
    sin(time + uv.x * 3.14159),
    sin(time + uv.x * 3.14159 + 2.0),
    sin(time + uv.x * 3.14159 + 4.0)
  ) * 0.5 + 0.5;
  gl_FragColor = vec4(rainbow * wave, 1.0);
}
```

### Strobe BPM

```glsl
precision highp float;
uniform float time;
uniform float bpm;
uniform vec4 color1;

void main() {
  float beat = mod(time * bpm / 60.0, 1.0);
  float strobe = step(0.5, beat);
  gl_FragColor = vec4(color1.rgb * strobe, 1.0);
}
```

## 🔧 API WebSocket

### Events Client → Server

```typescript
{ event: 'config:update', data: StripConfig[] }
{ event: 'shader:apply', data: StripShaderAssignment }
{ event: 'params:update', data: Partial<ShaderUniforms> }
{ event: 'playback:start' }
{ event: 'playback:stop' }
{ event: 'bpm:update', data: { bpm: number } }
```

### Events Server → Client

```typescript
{ event: 'fps:update', data: { fps: number } }
{ event: 'artnet:error', data: { message: string } }
{ event: 'shaders:list', data: ShaderConfig[] }
```

## 🧪 Build & Production

### Frontend

```bash
cd frontend
npm run build
npm run preview
```

### Backend

```bash
cd backend
npm run build
npm start
```

## 📚 Technologies

### Frontend
- **React** 18.2 - UI framework
- **TypeScript** 5.3 - Type safety
- **Three.js** 0.160 - WebGL rendering
- **React Three Fiber** - React renderer for Three.js
- **Zustand** - State management
- **Monaco Editor** - Code editor
- **Socket.io Client** - WebSocket
- **Tailwind CSS** - Styling
- **Vite** 5.0 - Build tool

### Backend
- **Node.js** 18+
- **Express** 4.18 - Web server
- **Socket.io** 4.6 - WebSocket server
- **artnet** - Art-Net protocol
- **TypeScript** 5.3

## 🎯 Roadmap

### Phase 1 - Core ✅
- Configuration strips (JSON)
- Canvas layout simple
- Éditeur shader basique
- Rendu Three.js → pixels
- Génération Art-Net
- Envoi UDP vers ESP32

### Phase 2 - UI (Prochaine)
- Drag & drop shaders sur strips
- Preview temps réel sur canvas
- Multi-strips simultanés
- Gestion presets

### Phase 3 - Advanced
- BPM auto-detect (Web Audio API)
- Transitions entre presets
- MIDI mapping
- Performance monitoring

## 🐛 Dépannage

### Le backend ne démarre pas
- Vérifiez que le port 3001 est disponible
- Installez les dépendances : `npm install`

### Les LEDs ne s'allument pas
- Vérifiez les adresses IP des ESP32
- Assurez-vous que le firewall autorise UDP port 6454
- Testez la connectivité réseau avec `ping`

### Erreur de compilation de shader
- Vérifiez la syntaxe GLSL
- Assurez-vous d'utiliser `precision highp float;`
- Les uniforms doivent être déclarés

## 📄 Licence

MIT

## 👨‍💻 Auteur

**Jerome** - DJ & LED Artist
