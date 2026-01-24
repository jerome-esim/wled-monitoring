# 🎯 Test du Preview - Guide Ultra Rapide

## ⚠️ LE PROBLÈME ÉTAIT RÉSOLU

Le backend refusait de rendre sans strips configurés. **C'est maintenant corrigé !**

---

## 🚀 Test en 3 Étapes

### Terminal 1 - Backend

```bash
cd /home/user/wled-monitoring/backend-rust
cargo run --release
```

**Attendez de voir :**
```
✅ WebSocket server running on ws://0.0.0.0:3001/ws
🎨 Render loop starting at 40 FPS
```

### Terminal 2 - Frontend

```bash
cd /home/user/wled-monitoring/frontend-new
npm run dev
```

Ouvrez **http://localhost:3000**

### Dans le navigateur (F12 pour la console)

1. **Vérifier** : Indicateur VERT en haut à droite ✅
2. **Ajouter un layer** : Dropdown "+ Add Layer" → "Lightning Flash"
3. **Cliquer Play** : Bouton ▶ Play

---

## ✅ Vous devriez voir immédiatement

### Dans la console du navigateur :

```
WebSocket connected: true
Sending layers to backend: 1 layers
Play/Pause clicked: true
Playing status: true
WebSocket message received: frameUpdate
Frame Update: { width: 13, height: 250, dataLength: 13000 }
Preview: Rendering frame { width: 13, height: 250, ... }
Preview: Decoded { expectedBytes: 9750, actualBytes: 9750, ... }
Preview: Frame rendered successfully
FPS Update: 40
```

### Dans le Terminal 1 (backend) :

```
✅ New WebSocket connection established
📩 Received message: {"type":"updateLayers",...}
▶️  Playback started
📊 FPS: 40 | Layers: 1 | Strips: 0
```

Notez **Strips: 0** - c'est normal ! Le preview fonctionne maintenant sans strips.

### Dans le Preview Canvas :

Vous devriez voir des **éclairs blancs** qui clignotent à ~120 BPM sur un petit canvas 13×250 pixels.

---

## 🎨 Test avec d'autres shaders

Ajoutez d'autres layers pour tester :

- **Zigzag Chaser** : Chasers rouges/bleus qui zigzaguent
- **Gradient Sweep** : Gradient qui se déplace
- **Neon Warmup** : Néons qui s'allument progressivement

Ajustez :
- **Opacity** : Transparence du layer
- **Blend Mode** : Normal / Add / Multiply / Screen
- **Couleurs** : Changez color1 et color2
- **Speed** : Vitesse d'animation

Tout changement est **immédiat** dans le preview !

---

## ❌ Si ça ne marche TOUJOURS pas

### Checklist :

1. **Backend compilé avec la dernière version ?**
   ```bash
   cd backend-rust && cargo build --release
   ```

2. **Console du navigateur ouverte (F12) ?**
   - Cherchez les erreurs en rouge

3. **Les 3 logs essentiels présents ?**
   - ✅ `WebSocket connected: true`
   - ✅ `Sending layers to backend: 1 layers`
   - ✅ `Playing status: true`

4. **Vous recevez "frameUpdate" ?**
   - Si NON → Le backend ne tourne pas ou ancienne version
   - Si OUI mais pas de rendu → Problème de décodage (envoyez l'erreur)

### Forcer la recompilation du backend :

```bash
cd backend-rust
cargo clean
cargo build --release
cargo run --release
```

### Forcer le rebuild du frontend :

```bash
cd frontend-new
rm -rf node_modules dist
npm install
npm run dev
```

---

## 🎯 Résumé du Fix

**Avant :**
```rust
if !state.is_playing || state.strips.is_empty() {
    continue;  // ❌ Pas de preview sans strips
}
```

**Après :**
```rust
if !state.is_playing {
    continue;  // ✅ Preview marche même sans strips
}

// Art-Net seulement si strips configurés
if !state.strips.is_empty() {
    // ... envoi Art-Net
}
```

Le preview est maintenant **indépendant** de la configuration Art-Net !

---

## 📸 À quoi ça devrait ressembler

```
┌─────────────────────────────────────────────┐
│ WLED Monitoring - Shader Layers      [●]   │ ← Indicateur vert
│                                    ▶ Play   │
├─────────────────────┬───────────────────────┤
│ Shader Layers       │ Preview         40 FPS│
│                     │                       │
│ ✓ Lightning Flash   │  ┌─────┐            │
│   Opacity: 100%     │  │░░░░░│ ← Canvas   │
│   Blend: normal     │  │█████│    animé    │
│                     │  │░░░░░│            │
│ + Add Layer         │  │█████│            │
│                     │  └─────┘            │
└─────────────────────┴───────────────────────┘
```

Le canvas sera petit (13×250) mais **animé à 40 FPS** avec les couleurs de vos shaders !
