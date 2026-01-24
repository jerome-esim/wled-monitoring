# Guide de Démarrage Rapide

## ⚠️ Prérequis pour voir le Preview

Pour que le preview fonctionne, vous DEVEZ :

1. ✅ **Backend Rust démarré** sur le port 3001
2. ✅ **Au moins 1 layer ajouté** dans l'interface
3. ✅ **Cliquer sur Play** (bouton ▶)

Sans ces 3 étapes, le preview restera noir !

---

## 🚀 Démarrage

### Terminal 1 - Backend Rust

```bash
cd /home/user/wled-monitoring/backend-rust
cargo run --release
```

Vous devriez voir :
```
✅ WebSocket server running on ws://0.0.0.0:3001/ws
🎨 Render loop starting at 40 FPS
```

### Terminal 2 - Frontend

```bash
cd /home/user/wled-monitoring/frontend-new
npm run dev
```

Ouvrez **http://localhost:3000** dans votre navigateur.

---

## 📋 Checklist de Debug

### 1. Vérifier la connexion WebSocket

Dans la console du navigateur (F12), vous devriez voir :
```
WebSocket connected: true
```

Si vous voyez `false`, le backend n'est pas démarré.

### 2. Ajouter un layer

1. Cliquez sur le dropdown **"+ Add Layer"**
2. Sélectionnez un shader (ex: "Zigzag Chaser")
3. Le layer apparaît dans la liste

Dans la console, vous devriez voir :
```
Sending layers to backend: 1 layers
```

### 3. Appuyer sur Play

1. Cliquez sur le bouton **"▶ Play"**
2. Le bouton devient **"⏸ Pause"**

Dans la console, vous devriez voir :
```
Play/Pause clicked: true
Playing status: true
```

### 4. Vérifier la réception de frames

Dans la console, vous devriez voir (environ 40 fois par seconde) :
```
WebSocket message received: frameUpdate
Frame Update: { width: 13, height: 250, dataLength: 13000 }
App: Frame data received
Preview: Rendering frame { width: 13, height: 250, dataLength: 13000 }
Preview: Decoded { expectedBytes: 9750, actualBytes: 9750, firstPixel: [...] }
Preview: Frame rendered successfully
```

Si vous ne voyez PAS ces messages :
- ❌ Backend pas démarré → Démarrer le backend
- ❌ Pas de layer → Ajouter un layer
- ❌ Pas en mode Play → Cliquer sur Play

### 5. Vérifier le FPS

Le compteur FPS en haut à droite devrait afficher **~40 FPS**.

Dans la console :
```
FPS Update: 40
```

---

## 🐛 Problèmes Courants

### Le preview reste noir

**Causes possibles :**

1. **Backend pas démarré**
   - Vérifiez que `cargo run` tourne dans Terminal 1
   - L'indicateur de connexion devrait être VERT

2. **Aucun layer ajouté**
   - Ajoutez au moins 1 layer via le dropdown "+ Add Layer"

3. **Pas en mode Play**
   - Cliquez sur le bouton "▶ Play"
   - Le backend n'envoie des frames QUE si `is_playing = true`

4. **Erreur WebSocket**
   - Vérifiez la console (F12) pour des erreurs
   - Le backend doit être sur le port 3001

### Le FPS est à 0

- Le backend n'envoie pas de frames
- Probablement pas en mode Play
- Ou aucun layer configuré

### Erreur "WebSocket connection error"

- Le backend n'est pas démarré
- Vérifiez que le port 3001 n'est pas utilisé par autre chose
- Redémarrez le backend

### Les couleurs sont bizarres

- Vérifiez que les paramètres de couleur sont corrects (RGBA 0-1)
- Certains shaders utilisent des couleurs par défaut

---

## 🎨 Test Rapide

Pour tester rapidement que tout fonctionne :

```bash
# Terminal 1
cd backend-rust && cargo run --release

# Terminal 2
cd frontend-new && npm run dev

# Navigateur sur http://localhost:3000
# 1. Vérifier indicateur VERT (connecté)
# 2. Add Layer → "Lightning Flash"
# 3. Cliquer sur ▶ Play
# 4. Vous devriez voir des éclairs blancs à ~120 BPM
```

Si ça ne marche pas, regardez la console (F12) et cherchez les messages d'erreur.

---

## 📊 Logs Backend (Terminal 1)

Vous devriez voir :
```
✅ New WebSocket connection established
📩 Received message: {"type":"updateLayers",...}
✅ Parsed command: UpdateLayers
▶️  Playback started
📊 FPS: 40 | Layers: 1 | Strips: 0
```

Le backend envoie un rapport FPS chaque seconde quand en mode Play.

---

## 💡 Conseils

- **Ouvrez la console du navigateur (F12)** pour voir tous les logs de debug
- Les logs montrent exactement ce qui se passe à chaque étape
- Si le preview ne marche pas, les logs vous diront pourquoi
- Le backend DOIT être en mode "playing" pour envoyer des frames
- Vous pouvez ajouter plusieurs layers et ajuster leur opacity/blend mode
