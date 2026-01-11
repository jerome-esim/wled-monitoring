# WLED Monitoring

Une application React pour monitorer plusieurs instances WLED sur votre réseau local.

## Fonctionnalités

- ✨ Interface React moderne avec Vite et mode sombre
- 🔍 Scan d'une plage d'adresses IP personnalisable
- 📊 Affichage en tableau des devices WLED détectés
- 🎨 Visualisation de l'état, luminosité, couleur et effet de chaque device
- ⚡ Scan rapide en parallèle avec timeout de 3 secondes par device
- 📈 Statistiques en temps réel (total scanné, en ligne, allumés)
- 🔄 Refresh automatique avec mise à jour séquentielle (1 device/seconde)
- 📡 Informations WiFi détaillées (signal RSSI avec niveau de qualité, canal)
- 🔗 Liens cliquables sur les adresses IP pour accéder directement à l'interface WLED

## Configuration par défaut

- Plage IP par défaut : **192.168.8.10** à **192.168.8.21**
- Timeout par device : **3 secondes**
- Scan par lots de **10 devices** simultanément
- Refresh automatique : Cycle toutes les **10 secondes** avec mise à jour progressive (**1 device/seconde**)

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
3. **Consulter les résultats** : Le tableau affiche tous les devices détectés avec refresh automatique progressif (1 device mis à jour par seconde)
4. **Accéder à WLED** : Cliquez sur une adresse IP pour ouvrir l'interface WLED du device dans un nouvel onglet

## Informations affichées

Pour chaque device WLED détecté :
- **Adresse IP** (cliquable pour ouvrir l'interface WLED)
- **Status** : En ligne / Hors ligne
- **Nom** : Nom configuré du device
- **Version** : Version du firmware WLED
- **État** : Allumé / Éteint
- **Luminosité** : Pourcentage de luminosité (0-100%)
- **Couleur** : Aperçu visuel de la couleur actuelle
- **Effet** : Nom de l'effet en cours
- **Live** : Indique si le mode Live (streaming temps réel) est actif
- **Signal WiFi** : RSSI en dBm avec niveau de qualité (Excellent / Bon / Moyen / Faible / Très faible)
- **Canal** : Canal WiFi utilisé

## API WLED utilisée

L'application utilise l'API JSON de WLED :
- `/json/info` : Informations du device (nom, version, mode live, infos WiFi : RSSI, canal)
- `/json/state` : État actuel (on/off, luminosité, couleurs, effets)

## Limitations

- Maximum 255 adresses IP par scan
- Timeout de 3 secondes par device
- L'application doit être sur le même réseau que les devices WLED

## Technologies utilisées

- React 18
- Vite 5
- CSS moderne avec flexbox/grid
