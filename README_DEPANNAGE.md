# Guide de Dépannage - Gestion Scolarité

## L'application ne se lance pas sur d'autres machines

### Symptôme
- L'installateur fonctionne
- Le processus "Gestion Scolarité" apparaît dans le Gestionnaire des tâches
- Mais aucune fenêtre ne s'affiche

### Cause probable
Les redistribuables Visual C++ ne sont pas installés sur la machine cible. Electron nécessite ces bibliothèques pour fonctionner.

### Solution 1: Installer les redistribuables Visual C++

Téléchargez et installez les redistribuables Visual C++ depuis Microsoft:

**Pour Windows 10/11 64 bits:**
- [Microsoft Visual C++ Redistributable for Visual Studio 2015-2022](https://aka.ms/vs/17/release/vc_redist.x64.exe)

1. Téléchargez le fichier `vc_redist.x64.exe`
2. Exécutez-le
3. Cochez "J'accepte le contrat de licence"
4. Cliquez sur "Installer"
5. Redémarrez l'application

### Solution 2: Utiliser la version portable

Si l'installateur ne fonctionne pas, essayez la version portable:
1. Copiez `Gestion Scolarité 1.0.0.exe` sur la machine cible
2. Exécutez-le directement
3. Si cela ne fonctionne pas, installez les redistribuables (Solution 1)

### Solution 3: Vérifier les logs

Pour voir les logs de l'application:

1. Ouvrez une invite de commande
2. Naviguez vers le dossier d'installation
3. Exécutez: `Gestion Scolarité.exe` (version portable) ou allez dans `C:\Program Files\Gestion Scolarité` (version installée)
4. Regardez les messages d'erreur dans la console

### Solution 4: Vérifier la compatibilité Windows

L'application nécessite:
- **Windows 10 ou 11** (64 bits)
- **2 GB de RAM minimum**
- **200-300 MB d'espace disque**

Elle ne fonctionne PAS sur:
- Windows 7 ou 8
- Windows 32 bits
- Windows XP

## Problème de connexion

### Identifiants par défaut
- **Nom d'utilisateur:** `admin`
- **Mot de passe:** `admin123`

### Si les identifiants ne fonctionnent pas
1. Vérifiez que vous n'avez pas importé une base de données existante
2. Si vous avez importé une base de données, utilisez les identifiants de cette base
3. Réinstallez l'application pour revenir aux identifiants par défaut

## L'application se lance mais affiche une page blanche

### Cause
Le frontend n'est pas chargé correctement.

### Solution
1. Vérifiez que le dossier `frontend/dist` existe dans le dossier d'installation
2. Réinstallez l'application
3. Essayez la version portable

## Erreur "better-sqlite3 module not found"

### Cause
Le module natif better-sqlite3 n'est pas correctement compilé.

### Solution
1. Réinstallez l'application
2. Assurez-vous que les redistribuables Visual C++ sont installés (Solution 1)

## L'application est très lente

### Cause
Base de données trop grande ou machine peu performante.

### Solution
1. Exportez la base de données via Paramètres → Exporter
2. Créez une nouvelle base de données vide
3. Importez uniquement les données nécessaires via SQL

## Contact pour support

Si aucun de ces solutions ne fonctionne:
1. Notez votre version de Windows
2. Notez le message d'erreur exact
3. Vérifiez les logs de l'application
4. Contactez le support technique
