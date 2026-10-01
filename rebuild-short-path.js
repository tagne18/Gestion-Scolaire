/**
 * Rebuild better-sqlite3 POUR ELECTRON en contournant le bug "espace dans le chemin".
 * Node-gyp échoue systématiquement quand le projet est dans un dossier contenant un espace
 * (ex: "pojet hibm"). Solution : on monte le dossier courant en lecteur virtuel S: (sans espace)
 * via la commande SUBST de Windows, et on lance le rebuild depuis S:.
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DRIVE = 'S:';
const PROJECT = process.cwd();
const ELECTRON_VERSION = '28.3.3';

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, { stdio: 'inherit', cwd: opts.cwd || process.cwd() });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, err: e };
  }
}

function step(n, t) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📌 ÉTAPE ${n} : ${t}`);
  console.log(`${'='.repeat(70)}`);
}

step(1, `Montage du dossier "${PROJECT}" sur le lecteur virtuel ${DRIVE} (sans espace)`);
try {
  // Démontage préventif si S: existait déjà
  try { spawnSync('subst', [DRIVE, '/d'], { stdio: 'ignore' }); } catch (_) {}
  // Montage
  const mount = spawnSync('subst', [DRIVE, PROJECT], { stdio: 'inherit' });
  if (mount.status !== 0) {
    console.error('❌ SUBST a échoué. Essaie avec un autre lecteur libre (T:, U:, V:).');
    process.exit(1);
  }
  console.log(`✅ Lecteur ${DRIVE} créé → pointe vers ${PROJECT}`);
  console.log(`✅ Chemin SANS espace : ${DRIVE}\\`);
} catch (e) {
  console.error('❌ Erreur SUBST :', e.message);
  process.exit(1);
}

step(2, `Vérification better-sqlite3 (sur ${DRIVE})`);
if (fs.existsSync(path.join(PROJECT, 'node_modules', 'better-sqlite3'))) {
  console.log('✅ better-sqlite3 présent dans node_modules');
} else {
  console.error('❌ better-sqlite3 introuvable → relance "npm install"');
  process.exit(1);
}

step(3, `Rebuild better-sqlite3 avec @electron/rebuild (sur lecteur ${DRIVE})`);
console.log(`Version Electron cible : ${ELECTRON_VERSION}`);
const rebuild = run(
  `npx @electron/rebuild -f -w better-sqlite3 --version=${ELECTRON_VERSION}`,
  { cwd: DRIVE + '\\' }
);

if (rebuild.ok) {
  console.log('\n✅ Rebuild a priori OK ! Vérification du fichier .node compilé...');
  const candidates = [
    'node_modules/better-sqlite3/build/Release/better_sqlite3.node',
    'node_modules/better-sqlite3/build/Debug/better_sqlite3.node'
  ];
  let found = false;
  for (const c of candidates) {
    const p = path.join(PROJECT, ...c.split('/'));
    if (fs.existsSync(p)) {
      const kb = Math.round(fs.statSync(p).size / 1024);
      console.log(`✅ Binaire TROUVÉ : ${p} (${kb} KB)`);
      found = true;
    }
  }
  if (!found) {
    console.log('⚠️  build/Release/... non trouvé. better-sqlite3 v13 utilise peut-être un autre emplacement.');
    console.log('   (Vérification : lister le dossier node_modules/better-sqlite3/build/)');
    try {
      const buildDir = path.join(PROJECT, 'node_modules', 'better-sqlite3', 'build');
      if (fs.existsSync(buildDir)) {
        console.log('   Contenu de build/:', fs.readdirSync(buildDir));
        const releaseDir = path.join(buildDir, 'Release');
        if (fs.existsSync(releaseDir)) {
          console.log('   Contenu de build/Release/:', fs.readdirSync(releaseDir));
        }
      } else {
        console.log('   (Pas de dossier build — prebuilds N-API probablement utilisés : OK si ABI match)');
      }
    } catch (e) { console.log('   Échec inspection:', e.message); }
  }
  console.log('\n🎉 Rebuild TERMINÉ !');
} else {
  console.error('\n❌ Échec du rebuild');
}

step(4, `Démontage propre du lecteur ${DRIVE}`);
try {
  // attend un peu pour que les handles soient libérés
  setTimeout(() => {
    spawnSync('subst', [DRIVE, '/d'], { stdio: 'ignore' });
    console.log(`✅ Lecteur ${DRIVE} démonté`);
    console.log('\n💡 Maintenant, relance : npm run electron:only');
    process.exit(rebuild.ok ? 0 : 1);
  }, 1500);
} catch (e) {
  process.exit(rebuild.ok ? 0 : 1);
}
