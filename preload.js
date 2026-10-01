const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose une API sécurisée au frontend via contextBridge
 * Le frontend ne peut accéder qu'aux méthodes définies ici
 */
contextBridge.exposeInMainWorld('api', {
  // === AUTHENTIFICATION ===
  auth: {
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    verifyPassword: (userId, password) => ipcRenderer.invoke('auth:verifyPassword', userId, password)
  },
  
  // === UTILISATEURS ===
  utilisateurs: {
    updateProfile: (userId, nom, username) => ipcRenderer.invoke('utilisateurs:updateProfile', userId, nom, username),
    changePassword: (userId, currentPassword, newPassword) => ipcRenderer.invoke('utilisateurs:changePassword', userId, currentPassword, newPassword),
    getById: (userId) => ipcRenderer.invoke('utilisateurs:getById', userId)
  },
  
  // === ANNÉES SCOLAIRES ===
  annees: {
    getAll: () => ipcRenderer.invoke('annees:getAll'),
    getActive: () => ipcRenderer.invoke('annees:getActive'),
    create: (libelle, dateDebut, dateFin) => ipcRenderer.invoke('annees:create', libelle, dateDebut, dateFin),
    setActive: (anneeId) => ipcRenderer.invoke('annees:setActive', anneeId),
    update: (anneeId, libelle, dateDebut, dateFin) => ipcRenderer.invoke('annees:update', anneeId, libelle, dateDebut, dateFin),
    delete: (anneeId) => ipcRenderer.invoke('annees:delete', anneeId),
    countInscriptions: (anneeId) => ipcRenderer.invoke('annees:countInscriptions', anneeId)
  },
  
  // === CLASSES ===
  classes: {
    getSections: () => ipcRenderer.invoke('classes:getSections'),
    getAll: () => ipcRenderer.invoke('classes:getAll'),
    create: (nom, niveau, sectionId) => ipcRenderer.invoke('classes:create', nom, niveau, sectionId),
    update: (classeId, nom, niveau, sectionId) => ipcRenderer.invoke('classes:update', classeId, nom, niveau, sectionId),
    setTarifs: (classeId, anneeScolaireId, tarifs) => ipcRenderer.invoke('classes:setTarifs', classeId, anneeScolaireId, tarifs),
    getTarifs: (classeId, anneeScolaireId) => ipcRenderer.invoke('classes:getTarifs', classeId, anneeScolaireId)
  },
  
  // === ÉLÈVES ===
  eleves: {
    create: (eleveData) => ipcRenderer.invoke('eleves:create', eleveData),
    getById: (eleveId) => ipcRenderer.invoke('eleves:getById', eleveId),
    getByMatricule: (matricule) => ipcRenderer.invoke('eleves:getByMatricule', matricule),
    getAll: () => ipcRenderer.invoke('eleves:getAll'),
    getPourReinscription: () => ipcRenderer.invoke('eleves:getPourReinscription'),
    update: (eleveId, eleveData) => ipcRenderer.invoke('eleves:update', eleveId, eleveData)
  },
  
  // === INSCRIPTIONS ===
  inscriptions: {
    create: (inscriptionData) => ipcRenderer.invoke('inscriptions:create', inscriptionData),
    getByEleveAndAnnee: (eleveId, anneeScolaireId) => ipcRenderer.invoke('inscriptions:getByEleveAndAnnee', eleveId, anneeScolaireId),
    getTranches: (inscriptionId) => ipcRenderer.invoke('inscriptions:getTranches', inscriptionId),
    getSolvabilite: (inscriptionId) => ipcRenderer.invoke('inscriptions:getSolvabilite', inscriptionId),
    getElevesByAnnee: (anneeScolaireId) => ipcRenderer.invoke('inscriptions:getElevesByAnnee', anneeScolaireId),
    reinscrireEleves: (reinscriptions, nouvelleAnneeId) => ipcRenderer.invoke('inscriptions:reinscrireEleves', reinscriptions, nouvelleAnneeId),
    appliquerReductionTranches: (inscriptionId) => ipcRenderer.invoke('inscriptions:appliquerReductionTranches', inscriptionId),
    validerInscription: (inscriptionId) => ipcRenderer.invoke('inscriptions:validerInscription', inscriptionId),
    getInscriptionsAInscrire: () => ipcRenderer.invoke('inscriptions:getInscriptionsAInscrire'),
    updateClasse: (inscriptionId, classeId, sectionId) => ipcRenderer.invoke('inscriptions:updateClasse', inscriptionId, classeId, sectionId)
  },
  
  // === PAIEMENTS ===
  paiements: {
    create: (paiementData) => ipcRenderer.invoke('paiements:create', paiementData),
    getByInscription: (inscriptionId) => ipcRenderer.invoke('paiements:getByInscription', inscriptionId),
    getByTranche: (trancheId) => ipcRenderer.invoke('paiements:getByTranche', trancheId),
    getById: (paiementId) => ipcRenderer.invoke('paiements:getById', paiementId),
    annuler: (paiementId, motifAnnulation) => ipcRenderer.invoke('paiements:annuler', paiementId, motifAnnulation),
    getJournaliers: (dateDebut, dateFin) => ipcRenderer.invoke('paiements:getJournaliers', dateDebut, dateFin),
    getResumeParJour: (dateDebut, dateFin) => ipcRenderer.invoke('paiements:getResumeParJour', dateDebut, dateFin)
  },
  
  // === INSOLVABLES ===
  insolvables: {
    getList: (filters) => ipcRenderer.invoke('insolvables:getList', filters)
  },
  
  // === JOURNAL ===
  journal: {
    getList: (filters) => ipcRenderer.invoke('journal:getList', filters),
    getUtilisateurs: () => ipcRenderer.invoke('journal:getUtilisateurs')
  },
  
  // === EXPORT ===
  export: {
    saveFile: (content, defaultName) => ipcRenderer.invoke('export:saveFile', content, defaultName)
  },
  
  // === BACKUP ===
  backup: {
    save: () => ipcRenderer.invoke('backup:save')
  },
  
  // === DATABASE IMPORT/EXPORT ===
  database: {
    import: () => ipcRenderer.invoke('database:import'),
    export: () => ipcRenderer.invoke('database:export'),
    listBackups: () => ipcRenderer.invoke('database:listBackups'),
    deleteBackup: (backupPath) => ipcRenderer.invoke('database:deleteBackup', backupPath)
  },
  
  // === SQL STUDENT IMPORT ===
  sqlImport: {
    importStudents: () => ipcRenderer.invoke('sqlImport:importStudents')
  },
  
  // === RECHERCHE ===
  recherche: {
    global: (terme) => ipcRenderer.invoke('recherche:global', terme)
  },
  
  // === DASHBOARD ===
  dashboard: {
    getIndicateurs: () => ipcRenderer.invoke('dashboard:getIndicateurs'),
    getRecouvrementParClasse: () => ipcRenderer.invoke('dashboard:getRecouvrementParClasse'),
    getAlertesEcheancesProches: () => ipcRenderer.invoke('dashboard:getAlertesEcheancesProches'),
    getEvolutionInscriptions: () => ipcRenderer.invoke('dashboard:getEvolutionInscriptions'),
    getStatistiquesPaiementsMensuels: () => ipcRenderer.invoke('dashboard:getStatistiquesPaiementsMensuels'),
    getStatistiquesParSection: () => ipcRenderer.invoke('dashboard:getStatistiquesParSection'),
    getStatistiquesGlobales: () => ipcRenderer.invoke('dashboard:getStatistiquesGlobales'),
    getDetailsInscriptions: (anneeLibelle) => ipcRenderer.invoke('dashboard:getDetailsInscriptions', anneeLibelle)
  },
  
  // === ÉVÉNEMENTS ===
  evenements: {
    getAll: () => ipcRenderer.invoke('evenements:getAll'),
    getByAnnee: (anneeScolaireId) => ipcRenderer.invoke('evenements:getByAnnee', anneeScolaireId),
    getUpcoming: (limit) => ipcRenderer.invoke('evenements:getUpcoming', limit),
    create: (evenementData) => ipcRenderer.invoke('evenements:create', evenementData),
    update: (id, evenementData) => ipcRenderer.invoke('evenements:update', id, evenementData),
    delete: (id) => ipcRenderer.invoke('evenements:delete', id),
    getByType: (type) => ipcRenderer.invoke('evenements:getByType', type)
  },
  
  // === DOCUMENTS ===
  documents: {
    genererCertificatScolarite: (eleveId, anneeScolaireId) => ipcRenderer.invoke('documents:genererCertificatScolarite', eleveId, anneeScolaireId),
    genererAttestationPaiement: (eleveId, anneeScolaireId) => ipcRenderer.invoke('documents:genererAttestationPaiement', eleveId, anneeScolaireId),
    genererReleveNotes: (eleveId, anneeScolaireId) => ipcRenderer.invoke('documents:genererReleveNotes', eleveId, anneeScolaireId)
  }
  
  // Les autres handlers seront ajoutés dans les étapes suivantes
});
