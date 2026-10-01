/**
 * Rebuild better-sqlite3 DIRECTEMENT via node-gyp POUR ELECTRON (pas @electron/rebuild, pas de prebuilds).
 *
 * Étapes :
 *   1. SUPPRIME complètement le dossier better-sqlite3/prebuilds/ (force la compilation)
 *   2. Supprime node_modules/better-sqlite3/build/ pour repartir de zéro
 *   3. Appelle SUBST S: -> projet (évite l'espace dans le chemin)
 *   4. Sur S:\, appelle "node-gyp rebuild --target=28.3.3 --arch=x64 --dist-url=..."
 *      → ce sont les HEADERS spécifiques Electron, compilés avec MSVC.
 *   5. Vérifie que le .node final existe et fait un test Node.js direct require + open DB
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRIVE = 'S:';
const ROOT = process.cwd();
const BTRoot = path.join(ROOT, 'node_modules', 'better-sqlite3');
const BtPrebuilds = path.join(BTRoot, 'prebuilds');
const BtBuild = path.join(BTRoot, 'build');
const ELECTRON_VER = '28.3.3';
const DIST_URL = 'https://electronjs.org/headers';

function log(s) { console.log(s); }
function err(s, e) { console.error('\n❌ ' + s); if (e) console.error('   ' + (e.message || e)); }
function ok(s) { console.log('\n✅ ' + s); }
function step(n, t) { console.log(`\n${'='.repeat(70)}\n📌 ÉTAPE ${n} : ${t}\n${'='.repeat(70)}`); }
function run(cmd, cwd) {
  log('\n$ ' + cmd);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: cwd || process.cwd(), shell: true });
    return true;
  } catch (e) {
    err('Commande échouée (exit code ' + (e.status || '?') + ')');
    return false;
  }
}

// Vérification initiale
step(0, `Vérifications initiales`);
if (!fs.existsSync(BTRoot)) { err('better-sqlite3 introuvable dans node_modules'); process.exit(1); }
ok('better-sqlite3 trouvé : ' + BTRoot);
log('  Version package.json : ' + require(path.join(BTRoot, 'package.json')).version);

// Étape 1 : SUPPRIMER les prebuilds N-API (on veut recompiler en natif)
step(1, `Suppression des prebuilds N-API + build précédent (pour forcer recompilation)`);
for (const p of [BtPrebuilds, BtBuild]) {
  if (fs.existsSync(p)) {
    log('  Suppression : ' + p);
    try {
      fs.rmSync(p, { recursive: true, force: true });
      ok('Supprimé : ' + path.basename(p));
    } catch (e) {
      err('Impossible de supprimer ' + p, e);
    }
  } else {
    log('  (n\'existe pas déjà : ' + path.basename(p) + ')');
  }
}

// Étape 2 : Monter lecteur S: (sans espace)
step(2, `Montage lecteur virtuel ${DRIVE}  ←  "${ROOT}"`);
try { spawnSync('subst', [DRIVE, '/d'], { stdio: 'ignore' }); } catch (_) {}
const mount = spawnSync('subst', [DRIVE, ROOT], { stdio: 'inherit' });
if (mount.status !== 0) { err('SUBST a échoué. Essaie un autre lecteur (T:, U:).'); process.exit(1); }
ok(`${DRIVE}  monté →  ${ROOT}`);

// Étape 3 : node-gyp configure + rebuild direct avec headers Electron
step(3, `node-gyp rebuild direct pour Electron v${ELECTRON_VER} (sur lecteur ${DRIVE})`);
log('  Ceci COMPILE better-sqlite3 en C++ avec MSVC pour l\'ABI Electron 119.');
log('  (peut prendre 1-4 min selon ta machine — c\'est NORMAL)\n');

const args = [
  'rebuild',
  '--target=' + ELECTRON_VER,
  '--arch=x64',
  '--dist-url=' + DIST_URL,
  '--runtime=electron',
  '--ensure',
  '--jobs=max'
];
const nodeGypCmd = `npx node-gyp ${args.join(' ')}`;
const nodeGypCwd = `${DRIVE}\\node_modules\\better-sqlite3`;
log(`  cwd : ${nodeGypCwd}`);
const okRebuild = run(nodeGypCmd, nodeGypCwd);

// Étape 4 : Vérifier le .node produit
step(4, 'Vérification du binaire compilé');
const candidates = [
  path.join(BTRoot, 'build', 'Release', 'better_sqlite3.node'),
  path.join(BTRoot, 'build', 'Debug', 'better_sqlite3.node')
];
let found = null;
for (const c of candidates) {
  if (fs.existsSync(c)) {
    const kb = Math.round(fs.statSync(c).size / 1024);
    found = { p: c, kb };
    ok(`Binaire TROUVÉ : ${c}  (${kb} KB)`);
    break;
  }
}
if (!found) {
  err('Aucun better_sqlite3.node produit — node-gyp a probablement échoué.');
  log('  Contenu de node_modules/better-sqlite3/build/ :');
  const bd = path.join(BTRoot, 'build');
  if (fs.existsSync(bd)) log('  ' + fs.readdirSync(bd).join(', '));
}

// Étape 5 : Test rapide DE DIEU : on ouvre Electron, on charge better-sqlite3, on ouvre une DB temporaire
//          ON NE PASSE PAS par main.js. Si ça marche → le binaire est bon, le bug est dans le reste.
step(5, `Test DIVINE : Electron + better-sqlite3 + open/create DB (SANS ton main.js)`);
const testFile = path.join(ROOT, '_direct_bt_test.js');
const testLog = path.join(ROOT, '_direct_bt_test.log');
fs.writeFileSync(testFile, `
const Database = require('./node_modules/better-sqlite3');
const fs = require('fs');
const os = require('os');
const f = require('path').join(os.tmpdir(), 'test_electron_bt_' + Date.now() + '.db');
console.log('[TEST] Chemin DB test :', f);
try {
  const db = new Database(f);
  console.log('[TEST] new Database() OK');
  db.pragma('foreign_keys = ON');
  console.log('[TEST] pragma OK');
  db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, v TEXT)');
  console.log('[TEST] CREATE OK');
  const info = db.prepare('INSERT INTO t (v) VALUES (?)').run('hello');
  console.log('[TEST] INSERT OK => changes=' + info.changes + ', lastInsertRowid=' + info.lastInsertRowid);
  const row = db.prepare('SELECT * FROM t').get();
  console.log('[TEST] SELECT OK => ' + JSON.stringify(row));
  db.close();
  fs.unlinkSync(f);
  console.log('\\n🎉 TEST BETTER-SQLITE3 SOUS ELECTRON : OK TOUTES LES ÉTAPES');
  process.exit(0);
} catch (e) {
  console.error('[TEST] 💥 CRASH / ERREUR :', e.message || e);
  console.error('[TEST] Stack :', e.stack || '(pas de stack)');
  fs.writeFileSync('${testLog.replace(/\\/g, '\\\\')}', (e && e.stack) || (e && e.message) || String(e));
  process.exit(2);
}
`.trim());
ok('Fichier test écrit : ' + testFile);

const spawnElectron = spawnSync(
  path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'),
  ['--no-sandbox', '--disable-breakpad', '--disable-seccomp-filter-sandbox', testFile],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: false, timeout: 25000 }
);
const stdout = Buffer.from(spawnElectron.stdout || '').toString('utf8');
const stderr = Buffer.from(spawnElectron.stderr || '').toString('utf8');
console.log('\n--- STDOUT Electron test direct ---');
console.log(stdout || '(vide)');
if (stderr.trim().length) {
  console.log('\n--- STDERR (filtre : on supprime les VERBOSE Chromium) ---');
  stderr.split('\n').filter(l => !/VERBOSE|device_event|pref_proxy|media_stream/i.test(l)).forEach(l => console.log(l));
}
const divineOk = /OK TOUTES LES ÉTAPES/.test(stdout);
if (divineOk) {
  ok('\n🎉🎉🎉 TEST DIVINE RÉUSSI ! better-sqlite3 MARCHE PARFAITEMENT dans Electron ! 🎉🎉🎉');
  log('   → Si ton main.js plante encore, c\'est PAS better-sqlite3.');
  log('   → C\'est quelque chose d\'autre (seed? handlers? preload?).');
} else {
  err('\nLe test direct a échoué. Exit code : ' + spawnElectron.status +
      (spawnElectron.status === null ? ' (TIMEOUT ?)' : ''));
  if (fs.existsSync(testLog)) {
    log('   Contenu _direct_bt_test.log : ' + fs.readFileSync(testLog, 'utf8'));
  }
}

// Nettoyage test
try { fs.unlinkSync(testFile); } catch (_) {}

// Étape 6 : Démontage S:
step(6, `Démontage lecteur ${DRIVE}`);
setTimeout(() => {
  try { spawnSync('subst', [DRIVE, '/d'], { stdio: 'ignore' }); ok(`${DRIVE} démonté`); } catch (_) {}
  process.exit((okRebuild && divineOk) ? 0 : 1);
}, 1500);
