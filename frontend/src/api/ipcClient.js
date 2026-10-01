/**
 * Client API pour communiquer avec le backend via IPC
 * Wrapper sécurisé autour de window.api exposé par preload.js
 */

const rawApi = window.api;

if (!rawApi) {
  console.error(
    '%c⚠️  API Electron non disponible !\n' +
    '%c→ window.api est undefined.\n' +
    '→ Cause probable : tu exécutes l\'app dans un NAVIGATEUR WEB classique au lieu d\'une fenêtre Electron.\n' +
    '→ Solution : lance "npm run electron:dev" et utilise la fenêtre Electron qui s\'ouvre automatiquement.\n' +
    '→ preload.js doit être chargé par Electron (contextBridge.exposeInMainWorld).',
    'color: #e74c3c; font-weight: bold; font-size: 14px;',
    'color: #7f8c8d; font-size: 12px;'
  );
}

// API vide pour éviter les erreurs quand window.api n'est pas disponible
const emptyApi = {
  auth: {
    login: () => Promise.reject(new Error('API Electron non disponible')),
    logout: () => Promise.reject(new Error('API Electron non disponible')),
    verifyPassword: () => Promise.reject(new Error('API Electron non disponible'))
  },
  utilisateurs: {
    updateProfile: () => Promise.reject(new Error('API Electron non disponible')),
    changePassword: () => Promise.reject(new Error('API Electron non disponible')),
    getById: () => Promise.reject(new Error('API Electron non disponible'))
  },
  annees: {
    getAll: () => Promise.reject(new Error('API Electron non disponible')),
    getActive: () => Promise.reject(new Error('API Electron non disponible')),
    create: () => Promise.reject(new Error('API Electron non disponible')),
    setActive: () => Promise.reject(new Error('API Electron non disponible')),
    update: () => Promise.reject(new Error('API Electron non disponible')),
    delete: () => Promise.reject(new Error('API Electron non disponible')),
    countInscriptions: () => Promise.reject(new Error('API Electron non disponible'))
  },
  classes: {
    getSections: () => Promise.reject(new Error('API Electron non disponible')),
    getAll: () => Promise.reject(new Error('API Electron non disponible')),
    create: () => Promise.reject(new Error('API Electron non disponible')),
    update: () => Promise.reject(new Error('API Electron non disponible')),
    setTarifs: () => Promise.reject(new Error('API Electron non disponible')),
    getTarifs: () => Promise.reject(new Error('API Electron non disponible'))
  },
  eleves: {
    create: () => Promise.reject(new Error('API Electron non disponible')),
    getById: () => Promise.reject(new Error('API Electron non disponible')),
    getByMatricule: () => Promise.reject(new Error('API Electron non disponible')),
    getAll: () => Promise.reject(new Error('API Electron non disponible')),
    getPourReinscription: () => Promise.reject(new Error('API Electron non disponible')),
    update: () => Promise.reject(new Error('API Electron non disponible'))
  },
  inscriptions: {
    create: () => Promise.reject(new Error('API Electron non disponible')),
    getByEleveAndAnnee: () => Promise.reject(new Error('API Electron non disponible')),
    getTranches: () => Promise.reject(new Error('API Electron non disponible')),
    getSolvabilite: () => Promise.reject(new Error('API Electron non disponible')),
    getElevesByAnnee: () => Promise.reject(new Error('API Electron non disponible')),
    reinscrireEleves: () => Promise.reject(new Error('API Electron non disponible')),
    appliquerReductionTranches: () => Promise.reject(new Error('API Electron non disponible')),
    validerInscription: () => Promise.reject(new Error('API Electron non disponible')),
    getInscriptionsAInscrire: () => Promise.reject(new Error('API Electron non disponible')),
    updateClasse: () => Promise.reject(new Error('API Electron non disponible'))
  },
  paiements: {
    create: () => Promise.reject(new Error('API Electron non disponible')),
    getByInscription: () => Promise.reject(new Error('API Electron non disponible')),
    getByTranche: () => Promise.reject(new Error('API Electron non disponible')),
    getById: () => Promise.reject(new Error('API Electron non disponible')),
    annuler: () => Promise.reject(new Error('API Electron non disponible')),
    getJournaliers: () => Promise.reject(new Error('API Electron non disponible')),
    getResumeParJour: () => Promise.reject(new Error('API Electron non disponible'))
  },
  insolvables: {
    getList: () => Promise.reject(new Error('API Electron non disponible'))
  },
  journal: {
    getList: () => Promise.reject(new Error('API Electron non disponible')),
    getUtilisateurs: () => Promise.reject(new Error('API Electron non disponible'))
  },
  export: {
    saveFile: () => Promise.reject(new Error('API Electron non disponible'))
  },
  backup: {
    save: () => Promise.reject(new Error('API Electron non disponible'))
  },
  database: {
    import: () => Promise.reject(new Error('API Electron non disponible')),
    export: () => Promise.reject(new Error('API Electron non disponible')),
    listBackups: () => Promise.reject(new Error('API Electron non disponible')),
    deleteBackup: () => Promise.reject(new Error('API Electron non disponible'))
  },
  sqlImport: {
    importStudents: () => Promise.reject(new Error('API Electron non disponible'))
  },
  recherche: {
    global: () => Promise.reject(new Error('API Electron non disponible'))
  },
  dashboard: {
    getIndicateurs: () => Promise.reject(new Error('API Electron non disponible')),
    getRecouvrementParClasse: () => Promise.reject(new Error('API Electron non disponible')),
    getAlertesEcheancesProches: () => Promise.reject(new Error('API Electron non disponible')),
    getEvolutionInscriptions: () => Promise.reject(new Error('API Electron non disponible')),
    getStatistiquesPaiementsMensuels: () => Promise.reject(new Error('API Electron non disponible')),
    getStatistiquesParSection: () => Promise.reject(new Error('API Electron non disponible')),
    getStatistiquesGlobales: () => Promise.reject(new Error('API Electron non disponible')),
    getDetailsInscriptions: () => Promise.reject(new Error('API Electron non disponible'))
  },
  evenements: {
    getAll: () => Promise.reject(new Error('API Electron non disponible')),
    getByAnnee: () => Promise.reject(new Error('API Electron non disponible')),
    getUpcoming: () => Promise.reject(new Error('API Electron non disponible')),
    create: () => Promise.reject(new Error('API Electron non disponible')),
    update: () => Promise.reject(new Error('API Electron non disponible')),
    delete: () => Promise.reject(new Error('API Electron non disponible')),
    getByType: () => Promise.reject(new Error('API Electron non disponible'))
  },
  documents: {
    genererCertificatScolarite: () => Promise.reject(new Error('API Electron non disponible')),
    genererAttestationPaiement: () => Promise.reject(new Error('API Electron non disponible')),
    genererReleveNotes: () => Promise.reject(new Error('API Electron non disponible'))
  }
};

const api = rawApi || emptyApi;
export default api;
