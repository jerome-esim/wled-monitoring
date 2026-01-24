# Guide de Configuration des LED Strips

## 📋 Vue d'ensemble

Le nouveau frontend inclut maintenant une **interface complète de gestion des strips LED** avec :
- Configuration des 13 strips de Jerome (par défaut)
- Édition des paramètres IP, universe, canaux
- Persistance automatique dans localStorage
- Envoi automatique au backend

---

## 🚀 Démarrage Rapide

### Au premier lancement

Le frontend charge automatiquement la **configuration par défaut** avec 13 strips répartis sur 3 contrôleurs :

```
Controller 1 (192.168.8.10) : Strips 1-4
Controller 2 (192.168.8.11) : Strips 5-9
Controller 3 (192.168.8.12) : Strips 10-13
```

Chaque strip : **250 LEDs** (750 canaux RGB)

### Pour voir/modifier la configuration

1. En haut du panneau de gauche, cliquez sur **"LED Strips Configuration (13 strips)"**
2. La section se déploie et affiche tous les strips
3. Cliquez sur **⚙** pour éditer un strip
4. Cliquez sur **✓** pour valider les changements

---

## 🎛️ Interface de Gestion

### Vue Compacte (par défaut)

```
┌─────────────────────────────────────────────────┐
│ ▶ LED Strips Configuration (13 strips)         │
│   [Load Defaults] [+ Add Strip] [Clear All]    │
└─────────────────────────────────────────────────┘
```

Cliquez sur le header pour déployer/replier.

### Vue Étendue (après clic)

```
┌─────────────────────────────────────────────────┐
│ ▼ LED Strips Configuration (13 strips)         │
│   [Load Defaults] [+ Add Strip] [Clear All]    │
├─────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐        │
│ │ Front Bar   [⚙][×]│ │ Left Side   [⚙][×]│        │
│ │ 192.168.8.10 •   │ │ 192.168.8.10 •   │        │
│ │ Univ 0 • Ch 1    │ │ Univ 2 • Ch 1    │        │
│ │ 250 LEDs         │ │ 250 LEDs         │        │
│ └─────────────────┘ └─────────────────┘        │
│                                                 │
│ ... (11 autres strips)                         │
└─────────────────────────────────────────────────┘
```

---

## ⚙️ Édition d'un Strip

Cliquez sur **⚙** pour éditer. Le panneau se déploie :

```
┌─────────────────────────────────────────┐
│ Front Bar                         [✓][×]│
├─────────────────────────────────────────┤
│ IP Address:        Universe:            │
│ [192.168.8.10]     [0]                  │
│                                         │
│ Start Channel:     LED Count:           │
│ [1]                [250]                │
│                                         │
│ Orientation:                            │
│ [Horizontal ▼]                          │
│                                         │
│ ℹ RGB Channels: 750 • Universes: 2     │
└─────────────────────────────────────────┘
```

### Paramètres modifiables

| Champ | Description | Valeurs |
|-------|-------------|---------|
| **Name** | Nom affiché | Texte libre |
| **IP Address** | IP du contrôleur WLED | ex: 192.168.8.10 |
| **Universe** | Univers Art-Net | 0-65535 |
| **Start Channel** | Canal DMX de départ | 1-512 |
| **LED Count** | Nombre de LEDs | 1-10000 |
| **Orientation** | Affichage visuel | Horizontal / Vertical |

### Validation automatique

Le bandeau info affiche :
- **RGB Channels** : LED Count × 3
- **Universes needed** : Calcul automatique (512 canaux/univers)

Exemple : 250 LEDs = 750 canaux = 2 univers

---

## 🔘 Boutons d'Action

### Load Defaults
- Restaure la configuration des 13 strips de Jerome
- **Confirmation requise** (prévient la perte de données)
- Répartition :
  - 4 strips sur 192.168.8.10
  - 5 strips sur 192.168.8.11
  - 4 strips sur 192.168.8.12

### + Add Strip
- Ajoute un nouveau strip
- Valeurs par défaut :
  - Name: "Strip [N]" (N = prochain ID)
  - IP: 192.168.8.10
  - Universe: 0
  - Start Channel: 1
  - LED Count: 250
  - Orientation: Horizontal
- S'ouvre automatiquement en mode édition

### Clear All
- Supprime **tous** les strips
- **Confirmation requise**
- ⚠️ Attention : Le backend ne pourra plus envoyer de données Art-Net

### Bouton × (par strip)
- Supprime le strip individuel
- Pas de confirmation
- Les autres strips restent intacts

---

## 💾 Persistance des Données

### Sauvegarde Automatique

La configuration est **automatiquement sauvegardée** dans le localStorage du navigateur :
- Clé : `wled-strips`
- Format : JSON
- Sauvegarde instantanée à chaque modification

### Restauration au Démarrage

Au lancement du frontend :
1. Charge depuis localStorage si présent
2. Sinon, charge `DEFAULT_STRIPS` (13 strips)
3. Affiche dans l'interface
4. Envoie au backend (si connecté)

### Réinitialisation Manuelle

Pour effacer la config localStorage :
1. Ouvrir la console navigateur (F12)
2. Taper : `localStorage.removeItem('wled-strips')`
3. Rafraîchir la page (F5)
4. Les defaults seront rechargés

---

## 🔌 Communication avec le Backend

### Envoi Automatique

Les strips sont envoyés au backend **automatiquement** dans ces cas :
- ✅ Connexion WebSocket établie
- ✅ Modification d'un strip
- ✅ Ajout/suppression de strip
- ✅ Load Defaults

### Message WebSocket

Format JSON envoyé :
```json
{
  "type": "updateStrips",
  "strips": [
    {
      "id": 1,
      "name": "Front Bar",
      "universe": 0,
      "startChannel": 1,
      "ledCount": 250,
      "ipAddress": "192.168.8.10",
      "position": { "x": 50, "y": 50 },
      "orientation": "horizontal"
    },
    ...
  ]
}
```

### Vérification dans la Console

Ouvrez la console (F12) et cherchez :
```
Sending strips to backend: 13 strips
```

---

## 🎨 Workflow Complet

### Scénario 1 : Utiliser la Config par Défaut

1. Ouvrir le frontend → **13 strips chargés automatiquement**
2. Backend connecté → **Strips envoyés automatiquement**
3. Ajouter des layers → **Rendu sur 13 strips**
4. Cliquer Play → **Preview + Art-Net vers contrôleurs**

✅ Aucune configuration requise !

### Scénario 2 : Modifier un Strip

1. Déployer "LED Strips Configuration"
2. Cliquer **⚙** sur le strip à modifier
3. Changer l'IP : `192.168.8.10` → `192.168.8.20`
4. Cliquer **✓** pour valider
5. **Sauvegarde auto dans localStorage**
6. **Envoi auto au backend**
7. Le strip utilisera maintenant la nouvelle IP

### Scénario 3 : Ajouter un Nouveau Strip

1. Cliquer **+ Add Strip**
2. Un nouveau strip apparaît en mode édition
3. Configurer les paramètres :
   - Name: "Extra Strip"
   - IP: 192.168.8.13
   - Universe: 0
   - LEDs: 100
4. Cliquer **✓**
5. Le frontend gère maintenant **14 strips**

### Scénario 4 : Réinitialiser Tout

1. Cliquer **Clear All** → Confirmation
2. Tous les strips supprimés
3. Cliquer **Load Defaults**
4. Les 13 strips de Jerome sont restaurés

---

## 🐛 Dépannage

### Les strips ne s'affichent pas

**Symptôme** : Section vide ou erreur
**Solution** :
```javascript
// Console (F12)
localStorage.removeItem('wled-strips')
// Rafraîchir (F5)
```

### Les modifications ne sont pas sauvegardées

**Cause** : localStorage désactivé ou plein
**Solution** :
- Vérifier que localStorage est activé dans le navigateur
- Vider le cache/localStorage
- Vérifier la limite de 5-10MB

### Le backend ne reçoit pas les strips

**Symptôme** : Pas de message dans la console backend
**Vérification** :
1. Console frontend : Voir "Sending strips to backend: X strips"
2. Console backend : Voir "📩 Received message: {...updateStrips...}"
3. Si absent → Vérifier la connexion WebSocket

### Art-Net ne fonctionne pas

**Causes possibles** :
1. IP incorrecte → Vérifier l'IP du contrôleur WLED
2. Universe incorrect → Vérifier la config WLED
3. Pas de strips configurés → Load Defaults
4. Backend pas en mode Play → Cliquer ▶ Play

---

## 📊 Configuration de Jerome (Référence)

### 3 Contrôleurs WLED

| Contrôleur | IP | Strips | Total LEDs |
|------------|-----|--------|------------|
| #1 | 192.168.8.10 | 1-4 | 1000 |
| #2 | 192.168.8.11 | 5-9 | 1250 |
| #3 | 192.168.8.12 | 10-13 | 1000 |
| **Total** | | **13** | **3250** |

### Répartition des Univers

Chaque strip de 250 LEDs utilise **2 univers** :
- Universe N : canaux 1-512 (170 LEDs)
- Universe N+1 : canaux 1-240 (80 LEDs)

**Exemple Strip 1** :
- Universe 0 : canaux 1-512 → LEDs 1-170
- Universe 1 : canaux 1-240 → LEDs 171-250

---

## 🎯 Conseils

### Performance
- Ne pas dépasser **20-30 strips** pour de bonnes performances
- Chaque strip génère 750-1500 canaux DMX
- Le backend peut gérer plusieurs milliers de LEDs

### Organisation
- Nommer les strips de façon claire (ex: "Front Bar", "Left Side")
- Grouper par contrôleur pour faciliter la maintenance
- Noter la correspondance physique quelque part

### Sécurité
- **Toujours tester** avec 1 strip avant de configurer tous
- **Sauvegarder** la config dans un fichier texte
- **Vérifier les IPs** avant de charger sur les contrôleurs

### Backup de Configuration

Pour sauvegarder votre config :
```javascript
// Console (F12)
console.log(localStorage.getItem('wled-strips'))
// Copier le JSON affiché
```

Pour restaurer :
```javascript
// Console (F12)
localStorage.setItem('wled-strips', 'VOTRE_JSON_ICI')
// Rafraîchir (F5)
```

---

## ✅ Résumé

Le système de gestion des strips offre :
- ✅ Configuration visuelle simple
- ✅ Persistance automatique
- ✅ Synchronisation backend temps réel
- ✅ Config par défaut prête à l'emploi
- ✅ Validation des paramètres
- ✅ Undo avec Load Defaults
- ✅ Support multi-contrôleurs

**Prêt à l'emploi** sans configuration pour le setup de Jerome !
