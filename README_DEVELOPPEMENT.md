# Guide de Développement - Gestion Scolarité

Ce document explique comment l'application a été créée, sa structure et les commandes utilisées pour le développement.

## Création du projet

### Initialisation du projet Electron + React

```bash
# Création du projet avec Vite
npm create vite@latest frontend -- --template react

# Initialisation Electron dans le dossier racine
npm init -y
npm install --save-dev electron
npm install --save-dev electron-builder
```

### Structure des dossiers créée

```
pojet hibm/
├── backend/              # Backend Node.js
│   ├── database/        # Base de données SQLite
│   │   ├── schema.sql   # Schéma de la base de données
│   │   └── migrations/  # Scripts de migration
│   ├── ipc/             # Handlers IPC (communication frontend-backend)
│   ├── services/        # Logique métier
│   └── utils/           # Utilitaires (matricule, etc.)
├── frontend/            # Frontend React
│   ├── src/
│   │   ├── api/         # Client IPC
│   │   ├── pages/       # Pages de l'application
│   │   └── App.jsx      # Composant principal
├── main.js              # Processus principal Electron
├── preload.js           # Script preload (contextBridge)
└── package.json         # Dépendances
```

## Dépendances principales

### Backend
```bash
# Base de données SQLite
npm install better-sqlite3

# Hashage des mots de passe
npm install bcryptjs

# Gestion des dates
npm install date-fns
```

### Frontend
```bash
# React et Vite déjà installés via create-vite
npm install react-router-dom
```

### Electron
```bash
# Outils de build
npm install --save-dev electron-builder
```

## Configuration Electron

### main.js - Processus principal

Le fichier `main.js` configure:
- La fenêtre principale de l'application
- La base de données SQLite avec exécution automatique du schéma
- Les handlers IPC pour la communication frontend-backend
- Les sauvegardes automatiques à la fermeture

### preload.js - Sécurité IPC

Le fichier `preload.js` expose une API sécurisée au frontend via `contextBridge`:
- Seules les méthodes explicitement définies sont accessibles
- Le frontend n'a jamais accès direct à SQLite ou au système de fichiers

## Base de données

### Création du schéma

Le fichier `backend/database/schema.sql` définit toutes les tables:
- `utilisateurs` - Utilisateurs de l'application
- `annees_scolaires` - Années scolaires
- `sections` - Sections (Francophone, Anglophone)
- `classes` - Classes par niveau
- `tarifs_classe` - Tarifs de pension par classe
- `eleves` - Informations des élèves
- `inscriptions` - Inscriptions des élèves
- `tranches` - Tranches de paiement
- `paiements` - Paiements effectués
- `date_limites` - Dates limites de paiement
- `journal` - Journal des actions
- `evenements` - Événements du calendrier

### Migrations

Les migrations sont exécutées automatiquement au démarrage:
- `migration_eleves.sql` - Ajout de champs aux élèves
- `migration_date_limites.sql` - Ajout des dates limites
- `migration_redoublement.sql` - Ajout du champ redoublement

## Architecture Backend

### Services (backend/services/)

Chaque service contient la logique métier:
- `auth.service.js` - Authentification
- `eleves.service.js` - Gestion des élèves
- `inscriptions.service.js` - Inscriptions et réinscriptions
- `paiements.service.js` - Gestion des paiements
- `dashboard.service.js` - Statistiques et indicateurs
- `classes.service.js` - Gestion des classes et tarifs
- `anneesScolaires.service.js` - Gestion des années scolaires
- `database.service.js` - Import/export de base de données
- `sqlImport.service.js` - Import d'élèves depuis SQL

### Handlers IPC (backend/ipc/handlers.js)

Les handlers IPC permettent la communication:
```javascript
ipcMain.handle('nom:action', async (event, params) => {
  return service.action(params);
});
```

## Architecture Frontend

### Pages (frontend/src/pages/)

- `Login/` - Page de connexion
- `Dashboard/` - Tableau de bord
- `AnneesScolaires/` - Gestion des années
- `Classes/` - Gestion des classes et tarifs
- `Eleves/` - Inscription, liste, réinscription
- `Paiements/` - Gestion des paiements
- `Documents/` - Génération de documents
- `Calendrier/` - Calendrier des événements
- `Settings/` - Paramètres (import/export)

### API Client (frontend/src/api/ipcClient.js)

Le client IPC utilise l'API exposée par preload.js:
```javascript
const api = window.api;
const result = await api.eleves.getAll();
```

## Fonctionnalités implémentées

### 1. Inscription automatique des frais d'inscription
- Paiement automatique de 5000 FCFA à chaque inscription
- `tranche_id = NULL` pour distinguer des paiements de pension
- Dashboard affiche séparément frais d'inscription et pension

### 2. Réinscription avec statut
- Champ `redoublement` dans la table inscriptions
- Options: 'premiere_inscription', 'redouble', 'classe_superieure'
- Paiement automatique de 5000 FCFA à chaque réinscription

### 3. Import/Export de base de données
- Export en fichier .db complet
- Import avec sauvegarde automatique avant remplacement
- Gestion des sauvegardes automatiques

### 4. Import SQL d'élèves
- Parsing de fichiers SQL pour extraire noms/prénoms
- Import uniquement des données d'élèves (pas d'inscriptions)
- Génération automatique de matricules

## Commandes de développement

### Installation
```bash
npm install
```

### Rebuild des modules natifs (important pour better-sqlite3)
```bash
npm run rebuild
```

### Lancement en développement
```bash
npm run electron:dev
```

### Build du frontend
```bash
npm run build
```

### Build de l'installateur Windows
```bash
npm run electron:build:win
```

## Scripts package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently \"npm run dev\" \"electron .\"",
    "electron:build:win": "electron-builder --win",
    "rebuild": "electron-rebuild -f -w better-sqlite3"
  }
}
```

## Sécurité

- **Isolation**: Frontend et backend totalement séparés
- **IPC sécurisé**: Seules les méthodes explicitement exposées sont accessibles
- **Hashage**: Mots de passe hashés avec bcryptjs
- **Validation**: Données validées côté backend avant insertion

## Déploiement

L'application est packagée en exécutable Windows avec electron-builder:
- Crée un installateur NSIS
- Inclut toutes les dépendances
- Fonctionne hors ligne
- Base de données créée automatiquement au premier lancement

## Personnalisation

### Changer le nom de l'application
Modifier `electron-builder` dans `package.json`:
```json
{
  "build": {
    "productName": "Votre Nom",
    "appId": "com.votre.app"
  }
}
```

### Modifier le schéma de base de données
Éditer `backend/database/schema.sql` et créer une nouvelle migration dans `backend/database/migrations/`

### Ajouter une nouvelle page
1. Créer le composant dans `frontend/src/pages/`
2. Ajouter le route dans `App.jsx`
3. Ajouter le bouton de navigation dans `App.jsx`
4. Créer les services backend si nécessaire
5. Ajouter les handlers IPC dans `backend/ipc/handlers.js`
6. Exposer l'API dans `preload.js`
