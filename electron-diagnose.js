const { spawn, spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('='.repeat(70));
console.log('🔍 DIAGNOSTIC ELECTRON - Gestion Scolarité');
console.log('='.repeat(70));
console.log('');

const step = (n, t) => console.log(`\n📌 ÉTAPE ${n} : ${t}\n${'-'.repeat(60)}`);

const ok = (m) => console.log(`   ✅ ${m}`);
const warn = (m) => console.log(`   ⚠️  ${m}`);
const fail = (m) => console.log(`   ❌ ${m}`);

step(1, 'Vérifications basiques');
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
ok(`Projet : ${pkg.name} v${pkg.version}`);
ok(`Node.js  : ${process.version}`);
ok(`Platform : ${process.platform} ${process.arch}`);

const electronPkgPath = path.join(__dirname, 'node_modules', 'electron', 'package.json');
if (fs.existsSync(electronPkgPath)) {
  const ePkg = JSON.parse(fs.readFileSync(electronPkgPath, 'utf8'));
  ok(`Electron package.json trouvé (version déclarée ${ePkg.version || '?'})`);
} else {
  fail('node_modules/electron/package.json INTROUVABLE');
}

const electronCli = path.join(__dirname, 'node_modules', 'electron', 'cli.js');
if (fs.existsSync(electronCli)) {
  ok(`electron/cli.js trouvé : ${electronCli}`);
} else {
  fail('electron/cli.js INTROUVABLE !');
}

step(2, 'Exécutable Electron (chemin)');
try {
  const electronPath = require('electron');
  ok(`require('electron') => ${electronPath}`);
  if (fs.existsSync(electronPath)) {
    ok(`Exécutable présent sur le disque : ${electronPath}`);
  } else {
    fail(`Exécutable ABSENT sur le disque !`);
  }

  const exeDir = path.dirname(electronPath);
  ok(`Dossier contenant l'exe : ${exeDir}`);
  const files = fs.readdirSync(exeDir).slice(0, 10);
  ok(`Premiers fichiers du dossier : ${files.join(', ')}`);
} catch (e) {
  fail(`require('electron') a échoué : ${e.message}`);
}

step(3, 'Test synchrone minimal : electron --version');
console.log('   (lance: electron.exe --version, timeout 15s)');
try {
  const electronPath = require('electron');
  const result = spawnSync(electronPath, ['--version'], {
    timeout: 15000,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  if (result.error) {
    fail(`spawnSync ERREUR : ${result.error.message}`);
    if (result.error.code) fail(`   code: ${result.error.code}`);
  } else {
    ok(`exitCode : ${result.status}`);
    if (result.stdout) ok(`STDOUT : "${result.stdout.trim()}"`);
    if (result.stderr) warn(`STDERR : "${result.stderr.trim().slice(0, 500)}"`);
    if (result.status === 0) {
      ok('>>> Electron EXÉCUTABLE et STABLE en mode version');
    }
  }
} catch (e) {
  fail(`Exception : ${e.message}`);
  if (e.stack) console.log(e.stack.split('\n').slice(0, 5).join('\n'));
}

step(4, 'Test asynchrone : ouverture de main.js avec LOGS détaillés');
console.log('   (timeout 20s - observe les codes de retour)');
try {
  const electronPath = require('electron');
  const flags = [
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--in-process-gpu',
    '--disable-breakpad',
    '--enable-logging',
    '--log-level=0',
    '--v=1'
  ];

  const child = spawn(electronPath, ['.', ...flags], {
    cwd: __dirname,
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1', ELECTRON_ENABLE_STACK_DUMPING: '1' }
  });

  let collected = '';
  let done = false;

  const finalize = (msg) => {
    if (done) return;
    done = true;
    console.log('\n   --- Capture fin ---');
    if (collected) console.log('   LOGS capturés :\n' + collected.split('\n').map(l => '   | '+l).slice(0, 40).join('\n'));
    console.log(`\n   Conclusion rapide : ${msg}`);
    console.log('\n' + '='.repeat(70));
    try { child.kill('SIGKILL'); } catch (_) {}
    process.exit(0);
  };

  child.stdout.on('data', d => {
    const s = d.toString();
    collected += s;
    s.split('\n').slice(0, 3).forEach(l => l.trim() && process.stdout.write('   OUT: '+l.trim()+'\n'));
  });
  child.stderr.on('data', d => {
    const s = d.toString();
    collected += s;
    s.split('\n').slice(0, 3).forEach(l => l.trim() && process.stderr.write('   ERR: '+l.trim()+'\n'));
  });

  child.on('error', err => finalize(`ERREUR spawn : ${err.message}`));
  child.on('exit', (code, signal) => {
    finalize(`Processus terminé - exitCode=${code} signal=${signal}`);
  });

  setTimeout(() => finalize('TIMEOUT 20s ATTEINT (Electron a probablement démarré et reste ouvert - BONNE nouvelle !)'), 20000);

} catch (e) {
  fail(`Exception étape 4 : ${e.message}`);
}
