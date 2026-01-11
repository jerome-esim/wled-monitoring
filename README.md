# WLED Monitoring

Une application React pour monitorer plusieurs instances WLED sur votre réseau local.

## Fonctionnalités

- ✨ Interface React moderne avec Vite
- 🔍 Scan d'une plage d'adresses IP personnalisable
- 📊 Affichage en tableau des devices WLED détectés
- 🎨 Visualisation de l'état, luminosité, couleur et effet de chaque device
- ⚡ Scan rapide en parallèle avec timeout de 3 secondes par device
- 📈 Statistiques en temps réel (total scanné, en ligne, allumés)

## Configuration par défaut

- Plage IP par défaut : **192.168.8.10** à **192.168.8.21**
- Timeout par device : **3 secondes**
- Scan par lots de **10 devices** simultanément

## Installation

```bash
npm install
```

## Utilisation

### Mode développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Build production

```bash
npm run build
```

Les fichiers compilés seront dans le dossier `dist/`

### Preview de la build

```bash
npm run preview
```

## Utilisation de l'application

1. **Configurer la plage d'IP** : Entrez les adresses IP de début et de fin
2. **Cliquer sur Scanner** : Lance le scan de la plage d'IP
3. **Consulter les résultats** : Le tableau affiche tous les devices détectés

## Informations affichées

Pour chaque device WLED détecté :
- **Adresse IP**
- **Status** : En ligne / Hors ligne
- **Nom** : Nom configuré du device
- **Version** : Version du firmware WLED
- **État** : Allumé / Éteint
- **Luminosité** : Pourcentage de luminosité (0-100%)
- **Couleur** : Aperçu visuel de la couleur actuelle
- **Effet** : Nom de l'effet en cours

## API WLED utilisée

L'application utilise l'API JSON de WLED :
- `/json/info` : Informations du device (nom, version, etc.)
- `/json/state` : État actuel (on/off, luminosité, couleurs, effets)

## Limitations

- Maximum 255 adresses IP par scan
- Timeout de 3 secondes par device
- L'application doit être sur le même réseau que les devices WLED

## Technologies utilisées

- React 18
- Vite 5
- CSS moderne avec flexbox/grid
