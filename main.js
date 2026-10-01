// Capture les erreurs fatales avant même Electron pour afficher un vrai message
process.on('uncaughtException', (err) => {
  console.error('\n' + '='.repeat(80));
  console.error('💥 ERREUR FATALE (uncaughtException) :', err.message);
  console.error('Stack :', err.stack);
  console.error('='.repeat(80) + '\n');
  fs.writeFileSync(path.join(__dirname, 'crash.log'),
    new Date().toISOString() + '\n' + err.message + '\n' + (err.stack || '') + '\n');
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('\n' + '='.repeat(80));
  console.error('💥 PROMESSE REJETÉE (unhandledRejection) :', err);
  console.error('='.repeat(80) + '\n');
});

const { app, BrowserWindow, ipcMain } = require('electron');

console.log('✅ Electron chargé - app:', typeof app, '| BrowserWindow:', typeof BrowserWindow);

if (!app) {
  console.error('❌ app est undefined');
  process.exit(1);
}

const path = require('path');
const fs = require('fs');

// Chaque require backend est essayé individuellement pour isoler le crash
function safeRequire(mod, name) {
  try {
    const r = require(mod);
    console.log(`✅ Module chargé : ${name}`);
    return r;
  } catch (err) {
    console.error(`\n❌ IMPOSSIBLE DE CHARGER "${name}" (${mod})`);
    console.error('   Message :', err.message);
    if (err.code) console.error('   Code    :', err.code);
    console.error('   Stack   :\n', err.stack);
    console.error(`\n   💡 Cause probable : better-sqlite3 n'a pas été recompilé pour l'ABI Electron 28.`);
    console.error(`   💡 Solution        : lance "npm run rebuild-short-path" dans un PowerShell Administrateur.\n`);
    process.exit(1);
  }
}

const dbModule = safeRequire('./backend/database/db', 'backend/database/db');
const seedModule = safeRequire('./backend/database/seed', 'backend/database/seed');
const ipcHandlersModule = safeRequire('./backend/ipc/handlers', 'backend/ipc/handlers');
const { initDatabase, executeSqlFile, closeDatabase } = dbModule;
const { seedDatabase } = seedModule;
const { registerIpcHandlers } = ipcHandlersModule;

let mainWindow;

/**
 * Crée la fenêtre principale de l'application
 */
function createWindow() {
  console.log('\n🚀 createWindow() DÉBUT - tentative de création BrowserWindow...');
  try {
    console.log('   🔧 webPreferences : nodeIntegration=false, contextIsolation=true, preload=', path.join(__dirname, 'preload.js'));

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'Gestion Scolarité'
    });

    console.log('   ✅ BrowserWindow CRÉÉ (avant affichage)');
    mainWindow.once('ready-to-show', () => {
      console.log('   🪟 ready-to-show déclenché → affichage de la fenêtre');
      mainWindow.show();
    });

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('   ✅ webContents did-finish-load → page chargée');
    });
    mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error('   ❌ webContents did-fail-load :', { code, desc, url });
    });
    mainWindow.webContents.on('crashed', (e, killed) => {
      console.error('   💥 webContents CRASHÉ !! killed=', killed);
    });
    mainWindow.on('unresponsive', () => {
      console.warn('   ⚠️  BrowserWindow UNRESPONSIVE');
    });
    mainWindow.on('closed', () => {
      console.log('   🚪 BrowserWindow fermé (closed)');
      mainWindow = null;
    });

    // Charge la page
    const isDev = !app.isPackaged;
    console.log(`   📦 isPackaged=${app.isPackaged} → isDev=${isDev}`);

    if (isDev) {
      const url = 'http://localhost:5173';
      console.log(`   🌐 Mode DEV → loadURL: ${url}`);
      mainWindow.loadURL(url)
        .then(() => console.log('   ✅ loadURL résolue (promesse OK)'))
        .catch(err => console.error('   ❌ loadURL rejetée :', err.message || err));
      // PAS D'OUVERTURE AUTO DES DEVTOOLS — on les ouvre manuellement avec F12 si besoin
    } else {
      const htmlPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
      console.log(`   📄 Mode PROD → loadFile: ${htmlPath} (existe=${fs.existsSync(htmlPath)})`);
      mainWindow.loadFile(htmlPath)
        .then(() => console.log('   ✅ loadFile résolue (promesse OK)'))
        .catch(err => console.error('   ❌ loadFile rejetée :', err.message || err));
    }

    console.log('   🚀 createWindow() FIN - fenêtre créée et chargement initié');
  } catch (err) {
    console.error('\n💥 ERREUR PENDANT createWindow() !');
    console.error('   Message :', err.message);
    console.error('   Stack   :', err.stack);
    process.exit(1);
  }
}

/**
 * Initialise la base de données au démarrage (chaque étape logguée individuellement)
 */
function initAppDatabase() {
  console.log('\n   ┌───────────────────────────────────────────────────────┐');
  console.log('   │           DÉBUT initAppDatabase()                    │');
  console.log('   └───────────────────────────────────────────────────────┘');

  // --- 1. Création de l'instance DB (etapes détaillées dans db.js) ---
  console.log('\n   📦 [initAppDatabase] Étape 1 : initDatabase()');
  initDatabase();

  // --- 2. Chemins des fichiers SQL ---
  console.log('\n   📦 [initAppDatabase] Étape 2 : résolution des chemins SQL...');
  const files = [
    ['schema', path.join(__dirname, 'backend/database/schema.sql')],
    ['migration_eleves', path.join(__dirname, 'backend/database/migration_eleves.sql')],
    ['migration_date_limites', path.join(__dirname, 'backend/database/migration_date_limites.sql')],
    ['migration_redoublement', path.join(__dirname, 'backend/database/migration_redoublement.sql')],
    ['migration_eleves_import', path.join(__dirname, 'backend/database/migration_eleves_import.sql')],
    ['migration_statut_a_inscrire', path.join(__dirname, 'backend/database/migration_statut_a_inscrire.sql')],
    ['migration_montant_inscription', path.join(__dirname, 'backend/database/migration_montant_inscription.sql')],
    ['migration_add_montant_inscription_inscriptions', path.join(__dirname, 'backend/database/migration_add_montant_inscription_inscriptions.sql')],
    ['migration_date_heure_paiement', path.join(__dirname, 'backend/database/migration_date_heure_paiement.sql')],
  ];
  for (const [name, p] of files) {
    console.log(`      → ${name}: "${p}" (existe=${fs.existsSync(p)})`);
  }

  // --- 3. Schéma (obligatoire, sans try/catch pour voir l'erreur) ---
  console.log('\n   📦 [initAppDatabase] Étape 3 : application du schéma...');
  try {
    executeSqlFile(files[0][1]);
    console.log('      ✅ Schéma appliqué');
  } catch (e) {
    console.error('      ❌ Échec schéma :', e.message || e);
    console.error('      Stack :', (e.stack || '').split('\n').slice(0, 5).join('\n             '));
  }

  // --- 4. Migrations (tolérantes) ---
  console.log('\n   📦 [initAppDatabase] Étape 4 : migrations tolérantes...');
  for (let i = 1; i < files.length; i++) {
    const [name, p] = files[i];
    try {
      executeSqlFile(p);
      console.log(`      ✅ ${name} appliquée`);
    } catch (_e) {
      console.log(`      ℹ️  ${name} ignorée (probablement déjà faite)`);
    }
  }

  // --- 5. Seed ---
  console.log('\n   📦 [initAppDatabase] Étape 5 : seedDatabase()...');
  try {
    seedDatabase();
    console.log('      ✅ seedDatabase OK');
  } catch (e) {
    console.error('      ❌ seed échoué :', e.message || e);
  }

  console.log('\n   ✅ initAppDatabase() FIN\n');
}

/**
 * Sauvegarde automatique de la base de données à la fermeture
 */
function backupDatabase() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'database/scolarite.db');
    const backupDir = path.join(app.getPath('userData'), 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `scolarite-backup-${timestamp}.db`);

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log('Sauvegarde créée :', backupPath);
    }
  } catch (error) {
    console.log('Erreur lors de la sauvegarde:', error.message);
  }
}

// Événements de l'application

app.whenReady().then(() => {
  console.log('\n===== Electron app.whenReady() =====');
  try {
    console.log('1️⃣  initAppDatabase()');
    initAppDatabase();
    console.log('   ✅ initAppDatabase OK');
  } catch (err) {
    console.error('   ❌ initAppDatabase échouée :', err.message);
    console.error(err.stack);
  }
  try {
    console.log('2️⃣  registerIpcHandlers()');
    registerIpcHandlers();
    console.log('   ✅ registerIpcHandlers OK');
  } catch (err) {
    console.error('   ❌ registerIpcHandlers échouée :', err.message);
    console.error(err.stack);
  }
  try {
    console.log('3️⃣  createWindow()');
    createWindow();
    console.log('   ✅ createWindow() appel réussi (asynchrone attend les événements)');
  } catch (err) {
    console.error('   ❌ createWindow échouée :', err.message);
    console.error(err.stack);
    process.exit(1);
  }
  console.log('====================================\n');
});

app.on('window-all-closed', () => {
  // Sauvegarde automatique avant fermeture
  backupDatabase();
  closeDatabase();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Gestion de la fermeture propre
app.on('before-quit', () => {
  backupDatabase();
  closeDatabase();
});
