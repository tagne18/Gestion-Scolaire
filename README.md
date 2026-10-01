# Gestion Scolarité

Application desktop de gestion des paiements de scolarité pour établissement scolaire (Maternelle + Primaire) avec sections Francophone et Anglophone.

## Stack technique

- **Electron** - Application desktop
- **React + Vite** - Frontend
- **Node.js** - Backend
- **better-sqlite3** - Base de données SQLite embarquée
- **bcryptjs** - Hashage des mots de passe
- **electron-builder** - Packaging en exécutable Windows

## Architecture

Le backend est totalement séparé du frontend. Toute communication passe par IPC Electron via `contextBridge` dans `preload.js`. Le frontend n'a jamais accès direct à SQLite.

## Installation

```bash
npm install
```

## Lancement en développement

```bash
npm run electron:dev
```

Cette commande :
1. Lance le serveur de développement Vite sur http://localhost:5173
2. Attend que le serveur soit prêt
3. Lance Electron en mode développement

## Lancement en production

```bash
npm run build
npm run electron
```

## Création de l'installateur Windows

### Méthode rapide (script batch)
```bash
build_installer.bat
```

### Méthode manuelle
```bash
npm install
npm run rebuild
npm run build
npm run electron:build:win
```

L'installateur sera généré dans le dossier `dist_electron/`.

**Pour plus de détails, voir [README_INSTALLATION.md](README_INSTALLATION.md)**

## Compte par défaut

Au premier lancement, un compte Admin est créé automatiquement :

- **Nom d'utilisateur** : `admin`
- **Mot de passe** : `admin123`

⚠️ **Important** : Changez ce mot de passe après le premier lancement en production.

## Structure de la base de données

La base de données SQLite est stockée dans le dossier `userData` d'Electron :
- Windows : `%APPDATA%/gestion-scolarite/database/scolarite.db`

Les sauvegardes automatiques sont stockées dans :
- Windows : `%APPDATA%/gestion-scolarite/backups/`

## Fonctionnalités

### ✅ Fonctionnalités implémentées
- Authentification avec compte Admin
- Gestion des années scolaires
- Gestion des sections (Francophone/Anglophone)
- Gestion des classes
- Inscription d'élèves avec génération de matricule
- Génération automatique des tranches de paiement
- Saisie des paiements
- Génération de reçus
- Liste des élèves avec recherche et filtrage
- Export Excel des listes d'élèves
- Réinscription d'élèves pour nouvelle année scolaire
- Calendrier scolaire (vacances, fêtes, examens, réunions)
- Rapports statistiques avancés (graphiques, évolutions, recouvrement)
- Gestion de documents (certificats, attestations, relevés)
- Journal des actions
- Liste des élèves insolvables

### 🔄 En cours de développement
- Système de notes et bulletins

## Étapes de développement

### Étape 1 (Terminée) ✅
- Scaffold Electron + React + Vite
- Connexion better-sqlite3 + schema.sql
- Compte Admin unique via seed.js
- Authentification (écran de login)

### Étape 2 (Terminée) ✅
- Enregistrement d'élèves avec génération automatique de matricule
- Inscriptions annuelles avec génération automatique des tranches

### Étape 3 (Terminée) ✅
- Saisie de paiements
- Génération de reçus PDF

### Étape 4 (Terminée) ✅
- Recherche d'élèves
- Sauvegarde automatique

### Étape 5 (Terminée) ✅
- Réinscription d'élèves existants

### Étape 6 (Terminée) ✅
- Packaging Windows avec electron-builder

### Étape 7 (Terminée) ✅
- Calendrier scolaire
- Rapports statistiques avancés
- Gestion de documents

### Étape 8 (À venir)
- Système de notes et bulletins
- Tests réels avec la secrétaire
