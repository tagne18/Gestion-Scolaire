/**
 * Wrapper SQLite natif utilisant better-sqlite3
 * Utilise la bibliothèque native SQLite pour de meilleures performances
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

let dbSingleton = null;
let dbFilePath = null;

function dbLog(m) { console.log('   🗄️  [DB/better-sqlite3] ' + m); }
function dbErr(m, e) {
  console.error('   ❌ [DB/better-sqlite3] ' + m);
  if (e) {
    console.error('      Message :', e.message);
    if (e.code) console.error('      Code    :', e.code);
  }
}

/**
 * Initialise la base de données (compatibilité API better-sqlite3)
 * Retourne une instance PRÊTE À L'EMPLOI
 */
function initDatabase() {
  dbLog('initDatabase() DÉBUT');

  let userDataPath = null;
  let usedFallback = false;

  // --- ÉTAPE 1 : chemin dossier ---
  try {
    dbLog('Tentative Electron app.getPath("userData")...');
    const { app } = require('electron');
    userDataPath = app.getPath('userData');
    dbLog('Electron userData = "' + userDataPath + '"');
  } catch (err1) {
    dbErr('Échec app.getPath("userData") :', err1);
    usedFallback = true;
  }

  let dbDir;
  if (!usedFallback && userDataPath) {
    dbDir = path.join(userDataPath, 'database');
  } else {
    try {
      const alt = 'C:\\scolarite_data';
      dbLog('Fallback : on utilise "' + alt + '"');
      userDataPath = alt;
      dbDir = path.join(alt, 'database');
      usedFallback = true;
    } catch (e2) {
      userDataPath = os.homedir();
      dbDir = path.join(userDataPath, 'scolarite_data', 'database');
    }
  }
  dbLog('Dossier DB cible = "' + dbDir + '"');

  // --- ÉTAPE 2 : création dossier ---
  try {
    if (!fs.existsSync(dbDir)) {
      dbLog('Dossier inexistant, création...');
      fs.mkdirSync(dbDir, { recursive: true });
      dbLog('Dossier créé avec succès');
    } else {
      dbLog('Dossier existe déjà');
    }
  } catch (err2) {
    dbErr('Impossible de créer le dossier "' + dbDir + '"', err2);
    throw err2;
  }

  const finalPath = path.join(dbDir, 'scolarite.db');
  dbLog('Chemin complet DB = "' + finalPath + '"');

  // --- ÉTAPE 3 : test écriture ---
  try {
    const testFile = path.join(dbDir, '.write-test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    dbLog('Test écriture dossier OK');
  } catch (err3) {
    dbErr('Échec test écriture dossier. Droits insuffisants ?', err3);
  }

  // --- ÉTAPE 4 : ouverture DB avec better-sqlite3 ---
  dbLog('Ouverture better-sqlite3 Database("' + finalPath + '") ...');
  try {
    const db = new Database(finalPath);
    dbLog('✅ better-sqlite3 Database instanciée');
    
    dbLog('Application PRAGMA foreign_keys = ON...');
    db.pragma('foreign_keys = ON');
    dbLog('✅ PRAGMA OK');

    // Test de vie
    dbLog('Test de vie : SELECT 1 + 1 ...');
    const row = db.prepare('SELECT 1 + 1 AS v').get();
    dbLog('✅ Test SQL OK => ' + JSON.stringify(row));

    dbSingleton = db;
    dbFilePath = finalPath;
    dbLog('Base de données initialisée : ' + finalPath + '\n');
    
    return db;
  } catch (err) {
    dbErr('💥 CRASH pendant initialisation better-sqlite3', err);
    throw err;
  }
}

function getDatabase() {
  if (dbSingleton) return dbSingleton;
  return initDatabase();
}

function closeDatabase() {
  if (dbSingleton) {
    dbSingleton.close();
    dbSingleton = null;
    dbLog('Database fermée');
  }
}

/**
 * Exécute un fichier SQL multi-requêtes (schema, migrations).
 * Utilise db.exec() donc 100% compatible.
 */
function executeSqlFile(filePath) {
  dbLog(`Exécution fichier SQL : ${filePath}`);
  const sql = fs.readFileSync(filePath, 'utf-8');
  const db = getDatabase();
  db.exec(sql);
  console.log('Script SQL exécuté :', filePath);
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  executeSqlFile
};
