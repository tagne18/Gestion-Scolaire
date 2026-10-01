const { ipcMain } = require('electron');
const authService = require('../services/auth.service');
const anneesScolairesService = require('../services/anneesScolaires.service');
const classesService = require('../services/classes.service');
const elevesService = require('../services/eleves.service');
const inscriptionsService = require('../services/inscriptions.service');
const paiementsService = require('../services/paiements.service');
const dashboardService = require('../services/dashboard.service');
const utilisateursService = require('../services/utilisateurs.service');
const insolvablesService = require('../services/insolvables.service');
const journalService = require('../services/journal.service');
const evenementsService = require('../services/evenements.service');
const documentsService = require('../services/documents.service');
const databaseService = require('../services/database.service');
const sqlImportService = require('../services/sqlImport.service');
const { genererMatricule } = require('../utils/matricule');

/**
 * Enregistre tous les handlers IPC
 * Ces handlers permettent la communication entre le frontend et le backend
 */
function registerIpcHandlers() {
  // === AUTHENTIFICATION ===
  
  ipcMain.handle('auth:login', async (event, username, password) => {
    return authService.login(username, password);
  });
  
  ipcMain.handle('auth:logout', async () => {
    // Pour l'instant, la déconnexion est gérée côté frontend
    // (suppression de la session en mémoire)
    return { success: true };
  });

  ipcMain.handle('auth:verifyPassword', async (event, userId, password) => {
    return authService.verifyPassword(userId, password);
  });
  
  // === UTILISATEURS ===
  
  ipcMain.handle('utilisateurs:updateProfile', async (event, userId, nom, username) => {
    return utilisateursService.updateProfile(userId, nom, username);
  });
  
  ipcMain.handle('utilisateurs:changePassword', async (event, userId, currentPassword, newPassword) => {
    return utilisateursService.changePassword(userId, currentPassword, newPassword);
  });
  
  ipcMain.handle('utilisateurs:getById', async (event, userId) => {
    return utilisateursService.getById(userId);
  });
  
  // === ANNÉES SCOLAIRES ===
  
  ipcMain.handle('annees:getAll', async () => {
    return anneesScolairesService.getAll();
  });
  
  ipcMain.handle('annees:getActive', async () => {
    return anneesScolairesService.getActive();
  });
  
  ipcMain.handle('annees:create', async (event, libelle, dateDebut, dateFin) => {
    return anneesScolairesService.create(libelle, dateDebut, dateFin);
  });
  
  ipcMain.handle('annees:setActive', async (event, anneeId) => {
    return anneesScolairesService.setActive(anneeId);
  });

  ipcMain.handle('annees:update', async (event, anneeId, libelle, dateDebut, dateFin) => {
    return anneesScolairesService.update(anneeId, libelle, dateDebut, dateFin);
  });

  ipcMain.handle('annees:delete', async (event, anneeId) => {
    return anneesScolairesService.delete(anneeId);
  });

  ipcMain.handle('annees:countInscriptions', async (event, anneeId) => {
    return anneesScolairesService.countInscriptions(anneeId);
  });
  
  // === CLASSES ===
  
  ipcMain.handle('classes:getSections', async () => {
    return classesService.getSections();
  });
  
  ipcMain.handle('classes:getAll', async () => {
    return classesService.getAll();
  });
  
  ipcMain.handle('classes:create', async (event, nom, niveau, sectionId) => {
    return classesService.createClasse(nom, niveau, sectionId);
  });

  ipcMain.handle('classes:update', async (event, classeId, nom, niveau, sectionId) => {
    return classesService.updateClasse(classeId, nom, niveau, sectionId);
  });
  
  ipcMain.handle('classes:setTarifs', async (event, classeId, anneeScolaireId, tarifs) => {
    return classesService.setTarifs(classeId, anneeScolaireId, tarifs);
  });
  
  ipcMain.handle('classes:getTarifs', async (event, classeId, anneeScolaireId) => {
    return classesService.getTarifs(classeId, anneeScolaireId);
  });
  
  // === ÉLÈVES ===
  
  ipcMain.handle('eleves:create', async (event, eleveData) => {
    // Générer le matricule automatiquement
    const section = eleveData.section_nom || 'Francophone';
    eleveData.matricule = genererMatricule(section);
    return elevesService.create(eleveData);
  });
  
  ipcMain.handle('eleves:getById', async (event, eleveId) => {
    return elevesService.getById(eleveId);
  });
  
  ipcMain.handle('eleves:getByMatricule', async (event, matricule) => {
    return elevesService.getByMatricule(matricule);
  });
  
  ipcMain.handle('eleves:getAll', async () => {
    return elevesService.getAll();
  });

  ipcMain.handle('eleves:getPourReinscription', async () => {
    return elevesService.getElevesPourReinscription();
  });
  
  ipcMain.handle('eleves:update', async (event, eleveId, eleveData) => {
    return elevesService.update(eleveId, eleveData);
  });
  
  // === INSCRIPTIONS ===
  
  ipcMain.handle('inscriptions:create', async (event, inscriptionData) => {
    return inscriptionsService.create(inscriptionData);
  });
  
  ipcMain.handle('inscriptions:getByEleveAndAnnee', async (event, eleveId, anneeScolaireId) => {
    return inscriptionsService.getByEleveAndAnnee(eleveId, anneeScolaireId);
  });
  
  ipcMain.handle('inscriptions:getTranches', async (event, inscriptionId) => {
    return inscriptionsService.getTranches(inscriptionId);
  });
  
  ipcMain.handle('inscriptions:getSolvabilite', async (event, inscriptionId) => {
    return inscriptionsService.getSolvabilite(inscriptionId);
  });
  
  ipcMain.handle('inscriptions:getElevesByAnnee', async (event, anneeScolaireId) => {
    return inscriptionsService.getElevesByAnnee(anneeScolaireId);
  });
  
  ipcMain.handle('inscriptions:reinscrireEleves', async (event, reinscriptions, nouvelleAnneeId) => {
    return inscriptionsService.reinscrireEleves(reinscriptions, nouvelleAnneeId);
  });
  
  ipcMain.handle('inscriptions:appliquerReductionTranches', async (event, inscriptionId) => {
    return inscriptionsService.appliquerReductionTranches(inscriptionId);
  });
  
  ipcMain.handle('inscriptions:validerInscription', async (event, inscriptionId) => {
    return inscriptionsService.validerInscription(inscriptionId);
  });
  
  ipcMain.handle('inscriptions:getInscriptionsAInscrire', async () => {
    return inscriptionsService.getInscriptionsAInscrire();
  });
  
  ipcMain.handle('inscriptions:updateClasse', async (event, inscriptionId, classeId, sectionId) => {
    return inscriptionsService.updateClasse(inscriptionId, classeId, sectionId);
  });
  
  // === PAIEMENTS ===
  
  ipcMain.handle('paiements:create', async (event, paiementData) => {
    return paiementsService.create(paiementData);
  });
  
  ipcMain.handle('paiements:getByInscription', async (event, inscriptionId) => {
    return paiementsService.getByInscription(inscriptionId);
  });
  
  ipcMain.handle('paiements:getByTranche', async (event, trancheId) => {
    return paiementsService.getByTranche(trancheId);
  });

  ipcMain.handle('paiements:getById', async (event, paiementId) => {
    return paiementsService.getById(paiementId);
  });

  ipcMain.handle('paiements:annuler', async (event, paiementId, motifAnnulation) => {
    return paiementsService.annuler(paiementId, motifAnnulation);
  });
  
  ipcMain.handle('paiements:getJournaliers', async (event, dateDebut, dateFin) => {
    return paiementsService.getPaiementsJournaliers(dateDebut, dateFin);
  });
  
  ipcMain.handle('paiements:getResumeParJour', async (event, dateDebut, dateFin) => {
    return paiementsService.getResumeParJour(dateDebut, dateFin);
  });
  
  // === INSOLVABLES ===
  
  ipcMain.handle('insolvables:getList', async (event, filters) => {
    return insolvablesService.getList(filters);
  });
  
  // === JOURNAL ===
  
  ipcMain.handle('journal:getList', async (event, filters) => {
    return journalService.getList(filters);
  });
  
  ipcMain.handle('journal:getUtilisateurs', async () => {
    return journalService.getUtilisateurs();
  });
  
  // === EXPORT ===
  
  ipcMain.handle('export:saveFile', async (event, content, defaultName) => {
    const { dialog } = require('electron');
    const { BrowserWindow } = require('electron');
    
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(focusedWindow, {
      defaultPath: defaultName,
      filters: [
        { name: 'Excel', extensions: ['xlsx'] },
        { name: 'CSV', extensions: ['csv'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      const fs = require('fs');
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(result.filePath, buffer);
      return { success: true, filePath: result.filePath };
    }
    
    return { success: false, canceled: true };
  });
  
  // === BACKUP ===
  
  ipcMain.handle('backup:save', async () => {
    const { dialog } = require('electron');
    const { BrowserWindow, app } = require('electron');
    const path = require('path');
    const fs = require('fs');
    
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const defaultName = `backup_scolarite_${timestamp}.db`;
    
    const result = await dialog.showSaveDialog(focusedWindow, {
      defaultPath: defaultName,
      filters: [
        { name: 'Base de données SQLite', extensions: ['db'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      try {
        const dbPath = path.join(app.getPath('userData'), 'database', 'scolarite.db');
        fs.copyFileSync(dbPath, result.filePath);
        return { success: true, filePath: result.filePath };
      } catch (error) {
        console.error('Erreur lors de la sauvegarde :', error);
        return { success: false, error: 'Erreur lors de la sauvegarde' };
      }
    }
    
    return { success: false, canceled: true };
  });

  // === DATABASE IMPORT/EXPORT ===

  ipcMain.handle('database:import', async () => {
    const { dialog } = require('electron');
    const { BrowserWindow } = require('electron');
    
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow, {
      title: 'Importer une base de données',
      filters: [
        { name: 'Base de données SQLite', extensions: ['db'] }
      ],
      properties: ['openFile']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return databaseService.importDatabase(result.filePaths[0]);
    }
    
    return { success: false, canceled: true };
  });

  ipcMain.handle('database:export', async () => {
    const { dialog } = require('electron');
    const { BrowserWindow } = require('electron');
    
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const defaultName = `scolarite_export_${timestamp}.db`;
    
    const result = await dialog.showSaveDialog(focusedWindow, {
      title: 'Exporter la base de données',
      defaultPath: defaultName,
      filters: [
        { name: 'Base de données SQLite', extensions: ['db'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      return databaseService.exportDatabase(result.filePath);
    }
    
    return { success: false, canceled: true };
  });

  ipcMain.handle('database:listBackups', async () => {
    return databaseService.listBackups();
  });

  ipcMain.handle('database:deleteBackup', async (event, backupPath) => {
    return databaseService.deleteBackup(backupPath);
  });

  // === SQL STUDENT IMPORT ===

  ipcMain.handle('sqlImport:importStudents', async () => {
    const { dialog } = require('electron');
    const { BrowserWindow } = require('electron');
    const path = require('path');

    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow, {
      title: 'Importer des élèves (Excel ou SQL)',
      filters: [
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'Fichier SQL', extensions: ['sql'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const ext = path.extname(filePath).toLowerCase();
      const parseResult = (ext === '.xlsx' || ext === '.xls')
        ? sqlImportService.parseExcelFile(filePath)
        : sqlImportService.parseSqlFile(filePath);

      if (!parseResult.success) {
        return parseResult;
      }

      return sqlImportService.importStudents(parseResult.data, '2025/2026');
    }

    return { success: false, canceled: true };
  });
  
  // === RECHERCHE ===
  
  ipcMain.handle('recherche:global', async (event, terme) => {
    return elevesService.rechercheGlobale(terme);
  });
  
  // === DASHBOARD ===
  
  ipcMain.handle('dashboard:getIndicateurs', async () => {
    return dashboardService.getIndicateurs();
  });
  
  ipcMain.handle('dashboard:getRecouvrementParClasse', async () => {
    return dashboardService.getRecouvrementParClasse();
  });
  
  ipcMain.handle('dashboard:getAlertesEcheancesProches', async () => {
    return dashboardService.getAlertesEcheancesProches();
  });
  
  ipcMain.handle('dashboard:getEvolutionInscriptions', async () => {
    return dashboardService.getEvolutionInscriptions();
  });
  
  ipcMain.handle('dashboard:getStatistiquesPaiementsMensuels', async () => {
    return dashboardService.getStatistiquesPaiementsMensuels();
  });
  
  ipcMain.handle('dashboard:getStatistiquesParSection', async () => {
    return dashboardService.getStatistiquesParSection();
  });
  
  ipcMain.handle('dashboard:getStatistiquesGlobales', async () => {
    return dashboardService.getStatistiquesGlobales();
  });
  
  ipcMain.handle('dashboard:getDetailsInscriptions', async (event, anneeLibelle) => {
    return dashboardService.getDetailsInscriptions(anneeLibelle);
  });
  
  // === ÉVÉNEMENTS ===
  
  ipcMain.handle('evenements:getAll', async () => {
    return evenementsService.getAll();
  });
  
  ipcMain.handle('evenements:getByAnnee', async (event, anneeScolaireId) => {
    return evenementsService.getByAnnee(anneeScolaireId);
  });
  
  ipcMain.handle('evenements:getUpcoming', async (event, limit) => {
    return evenementsService.getUpcoming(limit);
  });
  
  ipcMain.handle('evenements:create', async (event, evenementData) => {
    return evenementsService.create(evenementData);
  });
  
  ipcMain.handle('evenements:update', async (event, id, evenementData) => {
    return evenementsService.update(id, evenementData);
  });
  
  ipcMain.handle('evenements:delete', async (event, id) => {
    return evenementsService.delete(id);
  });
  
  ipcMain.handle('evenements:getByType', async (event, type) => {
    return evenementsService.getByType(type);
  });
  
  // === DOCUMENTS ===
  
  ipcMain.handle('documents:genererCertificatScolarite', async (event, eleveId, anneeScolaireId) => {
    return documentsService.genererCertificatScolarite(eleveId, anneeScolaireId);
  });
  
  ipcMain.handle('documents:genererAttestationPaiement', async (event, eleveId, anneeScolaireId) => {
    return documentsService.genererAttestationPaiement(eleveId, anneeScolaireId);
  });
  
  ipcMain.handle('documents:genererReleveNotes', async (event, eleveId, anneeScolaireId) => {
    return documentsService.genererReleveNotes(eleveId, anneeScolaireId);
  });
  
  console.log('Handlers IPC enregistrés');
}

module.exports = { registerIpcHandlers };
