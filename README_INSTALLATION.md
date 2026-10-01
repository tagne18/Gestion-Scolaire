# Guide d'installation et de distribution

## Pour créer un installateur Windows

### Prérequis
- Node.js (version 18 ou supérieure) installé
- Git (optionnel)

### Étapes pour construire l'installateur

1. **Cloner ou copier le projet sur votre machine**
   ```bash
   cd "c:\Users\User\Desktop\pojet hibm"
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Recompiler les modules natifs (important pour better-sqlite3)**
   ```bash
   npm run rebuild
   ```

4. **Construire le frontend**
   ```bash
   npm run build
   ```

5. **Générer l'installateur**
   ```bash
   npm run electron:build:win
   ```

### Résultat
Après la construction, vous trouverez les fichiers dans le dossier `dist_electron` :
- `Gestion Scolarité Setup x.x.x.exe` - Installateur NSIS (recommandé)
- `Gestion Scolarité x.x.0.exe` - Version portable (sans installation)

## Pour installer sur une autre machine

### Méthode 1 : Installateur NSIS (recommandé)
1. Copiez le fichier `Gestion Scolarité Setup x.x.x.exe` sur la machine cible
2. Exécutez le fichier
3. Suivez les instructions de l'assistant d'installation
4. L'application sera installée avec un raccourci sur le bureau et dans le menu Démarrer

### Méthode 2 : Version portable
1. Copiez le fichier `Gestion Scolarité x.x.0.exe` sur la machine cible
2. Exécutez-le directement (pas besoin d'installation)
3. L'application fonctionnera sans s'installer

## Fonctionnement de l'application installée

L'application installée :
- **Ne nécessite PAS de serveur séparé** - tout est inclus dans l'exécutable
- **Crée automatiquement** la base de données SQLite avec le schéma au premier lancement
- **Fonctionne hors ligne** - aucune connexion internet requise
- **Stocke les données** localement sur la machine

## Initialisation des données sur une nouvelle machine

**Identifiants par défaut**
Lors de la première installation, l'application crée automatiquement un utilisateur administrateur:
- **Nom d'utilisateur:** `admin`
- **Mot de passe:** `admin123`

⚠️ **Important:** Changez ce mot de passe après la première connexion via la page "Mon Profil"

**Option 1 : Démarrer avec une base de données vide (par défaut)**
- L'application crée automatiquement la base de données vide avec le schéma complet
- Vous pouvez ensuite créer manuellement :
  - Les années scolaires
  - Les classes et sections
  - Les élèves et leurs inscriptions
- **Aucune importation n'est requise** pour démarrer l'application

**Option 2 : Importer une base de données existante**
1. Exportez la base de données depuis l'ancienne machine via Paramètres → Exporter la base de données
2. Sur la nouvelle machine, lancez l'application
3. Allez dans Paramètres → Importer une base de données
4. Sélectionnez le fichier `.db` exporté
5. Toutes les données seront transférées

**Option 3 : Importer uniquement les élèves depuis un fichier SQL**
1. Sur la nouvelle machine, lancez l'application
2. Allez dans Paramètres → Importer élèves depuis SQL
3. Sélectionnez votre fichier SQL (ex: `managerapp.sql`)
4. Seuls les noms et prénoms des élèves seront importés
5. Vous devrez ensuite créer les classes et inscrire les élèves manuellement

## Emplacement des données

Sur Windows, les données sont stockées dans :
```
C:\Users\<NomUtilisateur>\AppData\Roaming\gestion-scolarite\database\scolarite.db
```

## Dépannage

### Erreur lors de l'installation
- Assurez-vous que Windows Defender ou un autre antivirus ne bloque pas l'installation
- Exécutez l'installateur en tant qu'administrateur si nécessaire

### Erreur au démarrage
- Vérifiez que les droits d'écriture sont disponibles dans le dossier AppData
- Consultez les logs dans le dossier de l'application

### Module natif manquant
Si vous rencontrez une erreur liée à `better-sqlite3`, assurez-vous d'avoir exécuté `npm run rebuild` avant de construire l'installateur.

## Mise à jour de l'application

Pour mettre à jour l'application sur une machine :
1. Téléchargez la nouvelle version de l'installateur
2. Exécutez-le
3. L'installateur remplacera automatiquement l'ancienne version
4. **Important :** La base de données sera conservée automatiquement

## Notes importantes

- **Sauvegarde des données :** Il est recommandé de sauvegarder régulièrement le fichier `scolarite.db`
- **Compatibilité :** L'application est compatible avec Windows 10 et Windows 11
- **Espace disque :** L'application nécessite environ 200-300 MB d'espace disque
