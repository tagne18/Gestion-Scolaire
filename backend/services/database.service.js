const fs = require('fs');
const path = require('path');
const { getDatabase, closeDatabase } = require('../database/db');
const { initDatabase } = require('../database/db');

/**
 * Service de gestion de la base de données (import/export)
 */
const databaseService = {
  /**
   * Importe une base de données depuis un fichier .db
   * @param {string} sourcePath - Chemin du fichier source
   * @returns {Object} - Résultat de l'import
   */
  importDatabase(sourcePath) {
    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Fichier introuvable' };
      }

      // Vérifier que c'est un fichier .db
      if (!sourcePath.endsWith('.db')) {
        return { success: false, error: 'Le fichier doit être au format .db' };
      }

      // Fermer la connexion actuelle si elle est ouverte
      try {
        closeDatabase();
      } catch (error) {
        // La base n'était peut-être pas ouverte, ignorer l'erreur
      }

      // Chemin de la base de données actuelle
      const dbPath = path.join(require('electron').app.getPath('userData'), 'database/scolarite.db');
      const dbDir = path.dirname(dbPath);

      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Créer une sauvegarde de la base actuelle avant l'import
      const backupDir = path.join(require('electron').app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `scolarite-backup-before-import-${timestamp}.db`);
      
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
      }

      // Copier le fichier importé vers l'emplacement de la base de données
      fs.copyFileSync(sourcePath, dbPath);

      // Réinitialiser la connexion à la base de données
      initDatabase();

      return { 
        success: true, 
        message: 'Base de données importée avec succès',
        backupPath: backupPath
      };
    } catch (error) {
      console.error('Erreur lors de l\'import de la base de données :', error);
      
      // Tenter de restaurer la sauvegarde en cas d'erreur
      try {
        const dbPath = path.join(require('electron').app.getPath('userData'), 'database/scolarite.db');
        const backupDir = path.join(require('electron').app.getPath('userData'), 'backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `scolarite-backup-before-import-${timestamp}.db`);
        
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, dbPath);
          initDatabase();
        }
      } catch (restoreError) {
        console.error('Erreur lors de la restauration :', restoreError);
      }

      return { success: false, error: 'Erreur lors de l\'import de la base de données' };
    }
  },

  /**
   * Exporte la base de données vers un fichier .db
   * @param {string} destinationPath - Chemin de destination
   * @returns {Object} - Résultat de l'export
   */
  exportDatabase(destinationPath) {
    try {
      const dbPath = path.join(require('electron').app.getPath('userData'), 'database/scolarite.db');

      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Base de données introuvable' };
      }

      // Copier le fichier de base de données vers la destination
      fs.copyFileSync(dbPath, destinationPath);

      return { success: true, message: 'Base de données exportée avec succès' };
    } catch (error) {
      console.error('Erreur lors de l\'export de la base de données :', error);
      return { success: false, error: 'Erreur lors de l\'export de la base de données' };
    }
  },

  /**
   * Liste les sauvegardes disponibles
   * @returns {Object} - Liste des sauvegardes
   */
  listBackups() {
    try {
      const backupDir = path.join(require('electron').app.getPath('userData'), 'backups');
      
      if (!fs.existsSync(backupDir)) {
        return { success: true, data: [] };
      }

      const files = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            date: stats.mtime
          };
        })
        .sort((a, b) => b.date - a.date); // Plus récent en premier

      return { success: true, data: files };
    } catch (error) {
      console.error('Erreur lors de la liste des sauvegardes :', error);
      return { success: false, error: 'Erreur lors de la liste des sauvegardes' };
    }
  },

  /**
   * Supprime une sauvegarde
   * @param {string} backupPath - Chemin de la sauvegarde
   * @returns {Object} - Résultat de la suppression
   */
  deleteBackup(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Sauvegarde introuvable' };
      }

      fs.unlinkSync(backupPath);
      return { success: true, message: 'Sauvegarde supprimée avec succès' };
    } catch (error) {
      console.error('Erreur lors de la suppression de la sauvegarde :', error);
      return { success: false, error: 'Erreur lors de la suppression de la sauvegarde' };
    }
  }
};

module.exports = databaseService;
